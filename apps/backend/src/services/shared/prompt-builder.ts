import type { PromptAttachment } from "@knitto/shared";
import {
  DROPDOWN_SELECTION_WORKFLOW,
} from "../../automation/libs/prompts/dropdown-workflow.js";
import {
  MODAL_DISMISS_WORKFLOW,
  MODAL_FORM_SUBMIT_WORKFLOW,
} from "../../automation/libs/prompts/modal-workflow.js";
import {
  AUTOMATION_PROMPT_STRATEGIES,
  type AutomationStrategyKey,
} from "../../automation/libs/prompts/texts.js";
import type { SavedAttachment, VisionAttachment } from "./persist-attachments.js";

export interface AgentPromptInput {
  text: string;
  visionAttachments?: VisionAttachment[];
}

export type AgentRunInput =
  | string
  | Array<{
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "file"; data: string; mediaType: string; filename?: string }
      >;
    }>;

function visionAttachmentsFrom(attachments?: PromptAttachment[]): PromptAttachment[] {
  return attachments?.filter((a) => a.kind === "image") ?? [];
}

function buildVisionBlock(visionCount: number): string {
  if (visionCount <= 0) return "";
  const noun = visionCount === 1 ? "attachment" : "attachments";
  return `
${visionCount} image ${noun} included for visual reference (numbered in UI order).
Use them with snapshot tools when deciding what to click or how the result should look.
Non-image attachments are NOT visible — rely on user text and Attached files paths for those.
`;
}

function buildAttachedFilesBlock(saved: SavedAttachment[]): string {
  if (!saved.length) return "";
  const lines = saved.map(
    (file) =>
      `${file.index}. [${file.kind}] ${file.name} (storage/${file.storagePath}) → ${file.absolutePath}`
  );
  return `
Attached files (absolute paths for automation_upload_file):
${lines.join("\n")}
Use exact paths above; do not invent paths.
Match each file to the correct input using user request + snapshot (inputType=file, label/name).
`;
}

export function buildAgentPrompt(args: {
  channel: string;
  text: string;
  strategy?: string;
  attachments?: PromptAttachment[];
  visionAttachments?: VisionAttachment[];
  savedAttachments?: SavedAttachment[];
}): AgentPromptInput {
  const strategyKey = args.strategy as AutomationStrategyKey | undefined;
  const visionCount =
    args.visionAttachments?.length ?? visionAttachmentsFrom(args.attachments).length;
  const hasVision = visionCount > 0;
  const hasSavedFiles = Boolean(args.savedAttachments?.length);

  const strategyBody =
    strategyKey && strategyKey in AUTOMATION_PROMPT_STRATEGIES
      ? AUTOMATION_PROMPT_STRATEGIES[strategyKey].body
      : AUTOMATION_PROMPT_STRATEGIES.automation_human_strategy.body;

  const userText = args.text.trim();

  const text = `You are a web automation tester. Use only MCP tools with the automation_ prefix.

Channel (for logging): ${args.channel}

Strategy:
${strategyBody}
${hasVision ? buildVisionBlock(visionCount) : ""}${hasSavedFiles ? buildAttachedFilesBlock(args.savedAttachments!) : ""}
Behave like a human tester:
- Observe the page (automation_get_page_snapshot; elements include bbox, inViewport, disabled, inputType for inputs; div>svg menu icons appear as role=button; div cursor-pointer menu rows appear as role=menuitem)
- Call automation_take_screenshot when the snapshot is ambiguous or you need visual confirmation (optional path = filename only; files are saved under screenshoot/agents/{jobId}/)
- Scroll to reveal off-screen content (automation_scroll)
- Wait for dynamic loads (automation_wait_for with network_idle or locator)
- Use automation_hover before dropdowns/menus; automation_press_key (Enter/Tab/ArrowUp/ArrowDown) for forms and open dropdown lists — never Escape (blocked by tool)
- automation_select_option for native selects; for custom dropdowns snapshot open list, find option text match/contains target, click to select (see dropdown workflow below)
- automation_upload_file for input[type=file] — do NOT use automation_fill or type a path manually
- automation_go_back / automation_go_forward for history navigation
- Verify with automation_assert_text / automation_assert_visible
- Persist learnings via automation_get_app_memory / automation_update_app_memory

File upload workflow:
1. automation_get_page_snapshot — find input with inputType=file (or label/name from user request)
2. automation_upload_file with locator + filePath from Attached files list
3. automation_wait_for — network_idle or locator after upload
4. automation_take_screenshot — confirm file name/preview appears when applicable
Non-image files (PDF, CSV, etc.) cannot be read via vision — follow user instructions for any form fields after upload.

Navigate to menu / page workflow (hamburger in top-right header when present):
1. automation_get_page_snapshot — look for hamburger/menu icon in the top-right header (role=button, div+svg, name "Menu" or "Icon button")
2. automation_take_screenshot if the trigger is unclear
3. automation_click the hamburger icon (clickCenter:true for small SVG icons); automation_wait_for until menu items appear
4. automation_get_page_snapshot again — read open menuitem/link list
5. Find the target menuitem/link: exact name match or closest partial match to the user request
6. Menu click retry (up to 3 attempts until navigation succeeds — URL/content changes):
   - Attempt 1: automation_click the menu item (ref, or role+name / text locator); automation_wait_for network_idle; snapshot to verify navigation
   - If page did NOT navigate: Attempt 2: automation_click the parent/wrapper element of that menu item (nearest containing li/div/link from snapshot); wait + verify again
   - If still NOT navigated: Attempt 3: automation_click_at at the center of the menu item bbox (x + width/2, y + height/2 from snapshot); wait + verify again
   - Stop retrying as soon as navigation succeeds; do not exceed 3 attempts per menu item
7. automation_get_page_snapshot again before the next interaction
${DROPDOWN_SELECTION_WORKFLOW}${MODAL_FORM_SUBMIT_WORKFLOW}${MODAL_DISMISS_WORKFLOW}
User request:
${userText}

Workflow:
1. automation_get_app_memory — read app knowledge when appId is known or infer from URL
2. automation_navigate — open the target URL
3. automation_get_page_snapshot — discover UI; prefer inViewport refs; no data-testid
4. automation_scroll / automation_hover / automation_click / automation_click_at / automation_fill / automation_upload_file / automation_press_key
5. automation_wait_for — after navigation, menu open, SPA actions, or file upload
6. automation_assert_text / automation_assert_visible — validate
7. automation_take_screenshot — capture evidence (vision models receive PNG in tool result)
8. automation_update_app_memory — persist menu trigger refs and navigation patterns

Ringkasan akhir:
- Tulis seluruh ringkasan hasil dalam Bahasa Indonesia (formal, jelas, dan ringkas).
- Jelaskan langkah yang dilakukan, hasil verifikasi, dan kesimpulan untuk user.
- Nama tool teknis (automation_*) boleh tetap seperti aslinya jika perlu dirujuk.`;

  return {
    text,
    visionAttachments: args.visionAttachments?.length ? args.visionAttachments : undefined,
  };
}

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "file"; data: string; mediaType: string; filename?: string };

export function buildAgentRunInput(prompt: AgentPromptInput): AgentRunInput {
  if (!prompt.visionAttachments?.length) {
    return prompt.text;
  }

  const content: UserContentPart[] = [{ type: "text", text: prompt.text }];

  for (const image of prompt.visionAttachments) {
    content.push({
      type: "file",
      data: image.data,
      mediaType: image.mimeType,
      filename: image.name,
    });
  }

  return [{ role: "user", content }];
}

export function buildCursorSdkMessage(
  prompt: AgentPromptInput
): string | { text: string; images: Array<{ data: string; mimeType: string }> } {
  if (!prompt.visionAttachments?.length) {
    return prompt.text;
  }

  return {
    text: prompt.text,
    images: prompt.visionAttachments.map((image) => ({
      data: image.data,
      mimeType: image.mimeType,
    })),
  };
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export function buildGeminiContents(
  prompt: AgentPromptInput
): string | Array<{ role: "user"; parts: GeminiPart[] }> {
  if (!prompt.visionAttachments?.length) {
    return prompt.text;
  }

  const parts: GeminiPart[] = [{ text: prompt.text }];
  for (const image of prompt.visionAttachments) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  return [{ role: "user", parts }];
}

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function buildOpenAIUserContent(
  prompt: AgentPromptInput
): string | OpenAIContentPart[] {
  if (!prompt.visionAttachments?.length) {
    return prompt.text;
  }

  const content: OpenAIContentPart[] = [{ type: "text", text: prompt.text }];
  for (const image of prompt.visionAttachments) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mimeType};base64,${image.data}` },
    });
  }
  return content;
}
