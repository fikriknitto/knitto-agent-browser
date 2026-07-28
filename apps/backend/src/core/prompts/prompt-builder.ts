import type { AutomationPlatform, MobileConfig, PromptAttachment, TestCaseSpec } from "@knitto/shared";
import { formatTestCaseShortcutSummary, resolveMemoryAppId } from "@knitto/shared";
import {
  formatHandoffForPrompt,
  serializeHandoffInstruction,
  type HandoffState,
} from "../orchestration/handoff.js";
import {
  DROPDOWN_SELECTION_WORKFLOW,
} from "../../platforms/browser/prompts/dropdown-workflow.js";
import {
  MODAL_DISMISS_WORKFLOW,
  MODAL_FORM_SUBMIT_WORKFLOW,
} from "../../platforms/browser/prompts/modal-workflow.js";
import {
  AUTOMATION_PROMPT_STRATEGIES,
  type AutomationStrategyKey,
} from "../../platforms/browser/prompts/texts.js";
import type { SavedAttachment, VisionAttachment } from "../evidence/persist-attachments.js";

export interface AgentPromptInput {
  text: string;
  visionAttachments?: VisionAttachment[];
}

function memoryAppIdBlock(memoryAppId: string | undefined): string {
  if (!memoryAppId?.trim()) return "";
  return `
Memory appId (WAJIB — jangan invent nama lain seperti knitto-cms):
- Gunakan appId tepat: "${memoryAppId.trim()}"
- browser_get_app_memory / browser_update_app_memory selalu dengan appId ini
- File memory = host:port untuk IP (contoh 192.168.20.27:5420), bukan nama produk
`;
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
Attached files (absolute paths for browser_upload_file):
${lines.join("\n")}
Use exact paths above; do not invent paths.
Match each file to the correct input using user request + snapshot (inputType=file, label/name).
`;
}

function buildPromptBasePathsBlock(paths: string[]): string {
  if (!paths.length) return "";
  const lines = paths.map((path, index) => `${index + 1}. ${path}`);
  return `
System prompt base files (reference only — content is on disk, do not assume inline):
${lines.join("\n")}
`;
}

export function buildAgentPrompt(args: {
  channel: string;
  text: string;
  strategy?: string;
  attachments?: PromptAttachment[];
  visionAttachments?: VisionAttachment[];
  savedAttachments?: SavedAttachment[];
  promptBasePaths?: string[];
  skipPlatformClose?: boolean;
  reuseBrowserSession?: boolean;
  memoryAppId?: string;
}): AgentPromptInput {
  const strategyKey = args.strategy as AutomationStrategyKey | undefined;
  const visionCount =
    args.visionAttachments?.length ?? visionAttachmentsFrom(args.attachments).length;
  const hasVision = visionCount > 0;
  const hasSavedFiles = Boolean(args.savedAttachments?.length);
  const hasPromptBasePaths = Boolean(args.promptBasePaths?.length);

  const strategyBody =
    strategyKey && strategyKey in AUTOMATION_PROMPT_STRATEGIES
      ? AUTOMATION_PROMPT_STRATEGIES[strategyKey].body
      : AUTOMATION_PROMPT_STRATEGIES.browser_human_strategy.body;

  const userText = args.text.trim();
  const memoryAppId =
    args.memoryAppId?.trim() ||
    resolveMemoryAppId({ platform: "browser", text: userText });

  const navigateStep = args.reuseBrowserSession
    ? "browser_navigate — hanya jika perlu pindah URL (skip jika halaman sudah benar)"
    : "browser_navigate — open the target URL";

  const closeInstructions = args.skipPlatformClose
    ? "- JANGAN panggil browser_close_browser — orchestrator menutup browser sekali setelah semua TC selesai."
    : "";

  const memoryStep = memoryAppId
    ? `1. browser_get_app_memory — appId = "${memoryAppId}" (wajib; jangan invent appId lain)`
    : `1. browser_get_app_memory — appId dari host:port URL target (IPv4 + port), jangan invent nama produk`;

  const memoryUpdateStep = memoryAppId
    ? `8. browser_update_app_memory — appId = "${memoryAppId}", mode upsert_section + sectionKey (replace section; jangan append)`
    : `8. browser_update_app_memory — upsert_section + sectionKey; appId = host:port dari URL (jangan invent nama seperti knitto-cms)`;

  const text = `You are a web automation tester. Use only MCP tools with the browser_ prefix.

Channel (for logging): ${args.channel}

Strategy:
${strategyBody}
${hasVision ? buildVisionBlock(visionCount) : ""}${hasSavedFiles ? buildAttachedFilesBlock(args.savedAttachments!) : ""}${hasPromptBasePaths ? buildPromptBasePathsBlock(args.promptBasePaths!) : ""}${memoryAppIdBlock(memoryAppId)}
Behave like a human tester:
${closeInstructions ? `${closeInstructions}\n` : ""}- Observe the page (browser_get_page_snapshot; elements include bbox, inViewport, disabled, inputType for inputs; div>svg menu icons appear as role=button; div cursor-pointer menu rows appear as role=menuitem). Call snapshot after navigation, submit, or modal open — avoid repeating on an unchanged static page.
- Call browser_take_screenshot for evidence only (optional path = filename only; files are saved under screenshoot/agents/{jobId}/; tool returns path, not image bytes). Use browser_get_page_snapshot when the UI is unclear.
- Scroll to reveal off-screen content (browser_scroll)
- Wait for dynamic loads (browser_wait_for with network_idle or locator)
- Use browser_hover before dropdowns/menus; browser_press_key (Enter/Tab/ArrowUp/ArrowDown) for forms and open dropdown lists — never Escape (blocked by tool)
- browser_select_option for native selects; for custom dropdowns snapshot open list, find option text match/contains target, click to select (see dropdown workflow below)
- browser_upload_file for input[type=file] — do NOT use browser_fill or type a path manually
- browser_go_back / browser_go_forward for history navigation
- Verify with browser_assert_text / browser_assert_visible
- Inspeksi lanjutan (pelengkap, bukan pengganti interaksi UI):
  - browser_evaluate — jalankan JS untuk baca nilai DOM/state yang tak muncul di snapshot
  - browser_get_console_logs — cek error JS diam-diam setelah aksi/submit
  - browser_wait_for_response / browser_get_requests — verifikasi call API berhasil (status 200 + body), bukan cuma UI
  - browser_get_cookies / browser_set_cookies, browser_save_storage_state / browser_load_storage_state — inspeksi & seed sesi; load_storage_state sebelum navigate untuk skip login
- Persist learnings via browser_get_app_memory / browser_update_app_memory (mode upsert_section + sectionKey; never append; appId = host:port untuk IP, bukan nama produk)

File upload workflow:
1. browser_get_page_snapshot — find input with inputType=file (or label/name from user request)
2. browser_upload_file with locator + filePath from Attached files list
3. browser_wait_for — network_idle or locator after upload
4. browser_take_screenshot — confirm file name/preview appears when applicable
Non-image files (PDF, CSV, etc.) cannot be read via vision — follow user instructions for any form fields after upload.

Navigate to menu / page workflow (hamburger in top-right header when present):
1. browser_get_page_snapshot — look for hamburger/menu icon in the top-right header (role=button, div+svg, name "Menu" or "Icon button")
2. browser_take_screenshot if the trigger is unclear
3. browser_click the hamburger icon (clickCenter:true for small SVG icons); browser_wait_for until menu items appear
4. browser_get_page_snapshot again — read open menuitem/link list
5. Find the target menuitem/link: exact name match or closest partial match to the user request
6. Menu click retry (up to 3 attempts until navigation succeeds — URL/content changes):
   - Attempt 1: browser_click the menu item (ref, or role+name / text locator); browser_wait_for network_idle; snapshot to verify navigation
   - If page did NOT navigate: Attempt 2: browser_click the parent/wrapper element of that menu item (nearest containing li/div/link from snapshot); wait + verify again
   - If still NOT navigated: Attempt 3: browser_click_at at the center of the menu item bbox (x + width/2, y + height/2 from snapshot); wait + verify again
   - Stop retrying as soon as navigation succeeds; do not exceed 3 attempts per menu item
7. browser_get_page_snapshot again before the next interaction
${DROPDOWN_SELECTION_WORKFLOW}${MODAL_FORM_SUBMIT_WORKFLOW}${MODAL_DISMISS_WORKFLOW}
User request:
${userText}

Workflow:
${memoryStep}
2. ${navigateStep}
3. browser_get_page_snapshot — discover UI; prefer inViewport refs; no data-testid
4. browser_scroll / browser_hover / browser_click / browser_click_at / browser_fill / browser_upload_file / browser_press_key
5. browser_wait_for — after navigation, menu open, SPA actions, or file upload
6. browser_assert_text / browser_assert_visible — validate
7. browser_take_screenshot — capture evidence (saved to disk; path returned in tool result)
${memoryUpdateStep}

Ringkasan akhir:
- Tulis seluruh ringkasan hasil dalam Bahasa Indonesia (formal, jelas, dan mudah dipahami oleh tester non-teknis).
- Wajib menyertakan bagian berikut secara berurutan:
  1. Skenario: Jelaskan secara singkat apa yang diuji.
  2. Langkah yang Dilakukan: Sebutkan langkah-langkah utama yang dijalankan (bukan nama tool).
  3. Hasil yang Diharapkan: Jelaskan hasil yang seharusnya terjadi jika test berhasil.
  4. Hasil Aktual: Jelaskan apa yang benar-benar terjadi berdasarkan bukti (screenshot/verifikasi).
  5. Kesimpulan: Nyatakan apakah test berhasil atau gagal, dan alasannya dalam bahasa sederhana.
  6. Saran Perbaikan (jika gagal): Berikan saran konkret apa yang perlu diperiksa atau diperbaiki.
- Jangan hanya menulis "berhasil" atau "gagal" — jelaskan secara lengkap.
- Jangan tampilkan nama tool teknis (browser_*) di ringkasan, kecuali jika sangat perlu.
- Jika ada error, ubah pesan error teknis menjadi penjelasan yang dapat dipahami tester.`;

  return {
    text,
    visionAttachments: args.visionAttachments?.length ? args.visionAttachments : undefined,
  };
}

export function buildMobileAgentPrompt(args: {
  channel: string;
  text: string;
  mobileConfig?: MobileConfig;
  attachments?: PromptAttachment[];
  visionAttachments?: VisionAttachment[];
  savedAttachments?: SavedAttachment[];
  promptBasePaths?: string[];
  skipPlatformClose?: boolean;
}): AgentPromptInput {
  const visionCount =
    args.visionAttachments?.length ?? visionAttachmentsFrom(args.attachments).length;
  const hasVision = visionCount > 0;
  const hasSavedFiles = Boolean(args.savedAttachments?.length);
  const hasPromptBasePaths = Boolean(args.promptBasePaths?.length);
  const appPackage = args.mobileConfig?.appPackage ?? "";
  const userText = args.text.trim();
  const closeInstructions = args.skipPlatformClose
    ? "- JANGAN panggil mobile_close_app / mobile_close_session — orchestrator menutup app dan session sekali setelah semua TC selesai."
    : "- Tutup app lalu session (mobile_close_app → mobile_close_session) — WAJIB sebelum selesai. JANGAN panggil mobile_close_session sebelum mobile_close_app.";
  const workflowCloseSteps = args.skipPlatformClose
    ? ""
    : `
8. mobile_close_app — WAJIB: force-stop target app via Appium (session stays open). Harus sebelum step 9.
9. mobile_close_session — WAJIB: release device back to pool. Hanya setelah step 8; jangan panggil tool mobile lain setelah ini.`;

  const text = `You are an Android mobile automation tester. Use only MCP tools with the mobile_ prefix.

Channel (for logging): ${args.channel}
Target app package: ${appPackage}
${args.mobileConfig?.deepLink ? `Deep link: ${args.mobileConfig.deepLink}` : ""}
${hasVision ? buildVisionBlock(visionCount) : ""}${hasSavedFiles ? buildAttachedFilesBlock(args.savedAttachments!).replace(/browser_upload_file/g, "mobile_upload_file") : ""}${hasPromptBasePaths ? buildPromptBasePathsBlock(args.promptBasePaths!) : ""}
Behave like a human tester on Android:
- Read mobile app memory first (mobile_get_app_memory with appId = "${appPackage}")
- Launch app (mobile_launch_app)
- Observe screen (mobile_get_screen_snapshot; elements have refs e1, e2, … with bbox). Call snapshot after navigation or actions that change the UI — avoid repeating on an unchanged screen.
- Interact via mobile_tap / mobile_tap_at / mobile_scroll / mobile_input_text / mobile_upload_file
- For any editable field from the snapshot (e.g. login username/password), call mobile_input_text directly with its ref — it taps, clears, and types in one call. Do not tap it separately first. The locator MUST be {"ref": "e3"} (the exact ref string from the last snapshot) — NOT an attribute filter like {"editable": true}; snapshot attributes (editable/clickable/className) describe an element, they are not valid locator fields and will be rejected.
- mobile_tap_at (raw x/y) is a FALLBACK ONLY for elements with no ref. Prefer mobile_tap/mobile_input_text with a ref whenever one exists — guessed coordinates can miss and hit nav/back-gesture areas, closing the app.
- If the app looks unexpected after an action (wrong screen, wrong package, app seems closed), call mobile_get_screen_snapshot again FIRST to confirm current state. Only call mobile_launch_app again if the snapshot confirms the target app is no longer running/foregrounded — do not relaunch reflexively.
- If the field/element you need is NOT in the latest snapshot: try mobile_scroll to bring it into view, then re-snapshot. Do this at most twice. If it still doesn't appear, STOP retrying with mobile_wait_for/mobile_press_key/mobile_take_screenshot in a loop — state clearly in your final summary that the element could not be located (name it) instead of repeating observation tools indefinitely.
- Capture evidence (mobile_take_screenshot; returns saved file path only)
- Persist learnings (mobile_update_app_memory with appId = "${appPackage}"; mode upsert_section + sectionKey; never append)
${closeInstructions}

Do NOT use browser_* tools on mobile jobs.

User request:
${userText}

Workflow:
1. mobile_get_app_memory — appId = "${appPackage}"
2. mobile_launch_app
3. mobile_get_screen_snapshot — discover UI; use refs for interactions
4. mobile_scroll / mobile_tap / mobile_tap_at / mobile_input_text / mobile_upload_file / mobile_press_key
5. mobile_assert_visible / mobile_wait_for — validate when needed
6. mobile_take_screenshot — capture evidence (saved to disk; path returned in tool result)
7. mobile_update_app_memory — upsert_section + sectionKey (replace section body; jangan append)${workflowCloseSteps}

Ringkasan akhir:
- Tulis seluruh ringkasan hasil dalam Bahasa Indonesia (formal, jelas, dan mudah dipahami oleh tester non-teknis).
- Wajib menyertakan bagian berikut secara berurutan:
  1. Skenario: Jelaskan secara singkat apa yang diuji.
  2. Langkah yang Dilakukan: Sebutkan langkah-langkah utama yang dijalankan (bukan nama tool teknis).
  3. Hasil yang Diharapkan: Jelaskan hasil yang seharusnya terjadi jika test berhasil.
  4. Hasil Aktual: Jelaskan apa yang benar-benar terjadi berdasarkan bukti (screenshot/verifikasi).
  5. Kesimpulan: Nyatakan apakah test berhasil atau gagal, dan alasannya dalam bahasa sederhana.
  6. Saran Perbaikan (jika gagal): Berikan saran konkret apa yang perlu diperiksa atau diperbaiki.
- Jangan hanya menulis "berhasil" atau "gagal" — jelaskan secara lengkap.
- Jangan tampilkan nama tool teknis (mobile_*) di ringkasan, kecuali jika sangat perlu.
- Jika ada error, ubah pesan error teknis menjadi penjelasan yang dapat dipahami tester.`;

  return {
    text,
    visionAttachments: args.visionAttachments?.length ? args.visionAttachments : undefined,
  };
}

export function buildPromptForJob(args: {
  platform?: AutomationPlatform;
  channel: string;
  text: string;
  strategy?: string;
  mobileConfig?: MobileConfig;
  attachments?: PromptAttachment[];
  visionAttachments?: VisionAttachment[];
  savedAttachments?: SavedAttachment[];
  promptBasePaths?: string[];
  memoryAppId?: string;
}): AgentPromptInput {
  if (args.platform === "mobile") {
    return buildMobileAgentPrompt(args);
  }
  return buildAgentPrompt({ ...args, memoryAppId: args.memoryAppId });
}

function slugifySectionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function defaultSectionKeyForTestCase(tc: TestCaseSpec): string {
  const slugSource = tc.shortcutId ?? tc.shortcutLabel ?? tc.title;
  const slug = slugSource ? slugifySectionKey(slugSource) : "";
  return slug ? `${tc.id}-${slug}` : tc.id;
}

function formatVariablesBlock(variables?: Record<string, string>): string {
  if (!variables || !Object.keys(variables).length) return "";
  const lines = Object.entries(variables).map(([key, value]) => `- ${key} = ${value}`);
  return `Variabel test case:\n${lines.join("\n")}`;
}

function formatShortcutStepsBlock(tc: TestCaseSpec): string {
  if (tc.shortcuts?.length) {
    const header = "Jalankan system prompt berikut secara berurutan dalam TC ini:";
    const steps = tc.shortcuts.map(
      (s, i) =>
        `Langkah ${i + 1} — system prompt "${s.shortcutLabel}":\n---\n${s.resolvedBody}\n---`
    );
    return [header, ...steps].join("\n\n");
  }
  if (tc.resolvedShortcutBody && tc.shortcutLabel) {
    return `Langkah dari system prompt "${tc.shortcutLabel}":\n---\n${tc.resolvedShortcutBody}\n---`;
  }
  return "";
}

function buildTestCaseInstructionText(args: {
  tc: TestCaseSpec;
  handoffBlock: string;
  multiTestRules: string;
}): string {
  const { tc, handoffBlock, multiTestRules } = args;
  const parts: string[] = [
    `${tc.title ?? tc.id}`,
    `Platform: ${tc.platform}`,
    handoffBlock.trim(),
    multiTestRules.trim(),
  ].filter(Boolean);

  const shortcutBlock = formatShortcutStepsBlock(tc);
  if (shortcutBlock) parts.push(shortcutBlock);

  const variablesBlock = formatVariablesBlock(tc.variables);
  if (variablesBlock) parts.push(variablesBlock);

  if (tc.narrativeInstruction?.trim()) {
    parts.push(`Instruksi tambahan:\n${tc.narrativeInstruction.trim()}`);
  } else if (!tc.shortcuts?.length && !tc.resolvedShortcutBody) {
    parts.push(`Instruksi test case:\n${tc.instruction}`);
  }

  if (tc.memoryAppId) {
    parts.push(`Memory appId untuk TC ini: "${tc.memoryAppId}"`);
  }

  return parts.filter(Boolean).join("\n\n");
}

export function buildHybridOverviewPrompt(testCases: TestCaseSpec[]): string {
  const lines = testCases.map((tc, i) => {
    const shortcutSummary = formatTestCaseShortcutSummary(tc);
    const shortcutPart = shortcutSummary ? ` ← ${shortcutSummary}` : "";
    const packagePart = tc.appPackage ? ` (${tc.appPackage})` : "";
    return `${i + 1}. ${tc.id} — ${tc.platform}${packagePart}${shortcutPart}`;
  });
  return `Multi test case job (${testCases.length} TC). Satu TC = satu video.

Urutan test case:
${lines.join("\n")}

Aturan penting:
- Fokus hanya pada test case yang sedang dijalankan.
- Multi-TC: JANGAN panggil browser_close_browser / mobile_close_app / mobile_close_session — orchestrator menutup browser/app/session sekali setelah semua TC selesai.
- ${serializeHandoffInstruction()}
- Memory: baca get_app_memory dulu; update hanya dengan mode upsert_section + sectionKey (isi section diganti, bukan ditumpuk). Jangan append.`;
}

export function buildTestCasePrompt(args: {
  tc: TestCaseSpec;
  handoff: HandoffState;
  channel: string;
  strategy?: string;
  mobileConfig?: MobileConfig;
  attachments?: PromptAttachment[];
  visionAttachments?: VisionAttachment[];
  savedAttachments?: SavedAttachment[];
  promptBasePaths?: string[];
  testCaseIndex: number;
  testCaseTotal: number;
  isMultiTest: boolean;
}): AgentPromptInput {
  const sectionKey = defaultSectionKeyForTestCase(args.tc);
  const handoffBlock = formatHandoffForPrompt(args.handoff);
  const sessionReuseRule =
    args.isMultiTest && args.tc.platform === "browser" && args.testCaseIndex > 0
      ? "- Browser sudah terbuka dari TC sebelumnya — lanjutkan session yang sama; JANGAN buka browser baru; navigasi hanya jika perlu pindah URL."
      : "";
  const multiTestRules = args.isMultiTest
    ? `
Multi-TC job (${args.testCaseIndex + 1}/${args.testCaseTotal}):
- JANGAN panggil browser_close_browser / mobile_close_app / mobile_close_session — orchestrator menutup browser/app/session sekali setelah semua TC selesai.
${sessionReuseRule ? `${sessionReuseRule}\n` : ""}- ${serializeHandoffInstruction()}
- Memory: jika ada learning baru, panggil update_app_memory dengan mode upsert_section, sectionKey="${sectionKey}" (body section diganti). Jangan append / jangan buat heading bebas yang numpuk.
`
    : "";

  const instruction = buildTestCaseInstructionText({
    tc: args.tc,
    handoffBlock,
    multiTestRules,
  });

  const promptBasePaths = args.tc.shortcuts?.length || args.tc.shortcutId ? undefined : args.promptBasePaths;

  if (args.tc.platform === "mobile") {
    const mobileConfig: MobileConfig = {
      appPackage: args.tc.appPackage ?? args.mobileConfig?.appPackage ?? "",
      appActivity: args.mobileConfig?.appActivity,
      udid: args.tc.udid ?? args.mobileConfig?.udid,
      deepLink: args.tc.deepLink ?? args.mobileConfig?.deepLink,
    };
    return buildMobileAgentPrompt({
      ...args,
      promptBasePaths,
      mobileConfig,
      text: instruction,
      skipPlatformClose: args.isMultiTest,
    });
  }

  return buildAgentPrompt({
    ...args,
    promptBasePaths,
    text: instruction,
    skipPlatformClose: args.isMultiTest,
    reuseBrowserSession: args.isMultiTest && args.tc.platform === "browser" && args.testCaseIndex > 0,
  });
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
