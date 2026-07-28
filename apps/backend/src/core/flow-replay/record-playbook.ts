import type { FlowPlaybook, PlaybookPrecondition, PlaybookStep, TestCasePlatform } from "@knitto/shared";
import { writeAppMemory as writeBrowserMemory } from "../../platforms/browser/memory/store.js";
import { writeAppMemory as writeMobileMemory } from "../../platforms/mobile/memory/store.js";
import { putAgentAppMemory } from "../../infra/api-data/agent-memory-client.js";
import { parseMemorySections, normalizeSectionKey } from "../memory/app-memory-sections.js";
import { extractPlaybookJsonFromSection, serializePlaybookBlock } from "./parse-playbook.js";
import type { BrowserSnapshot, MobileSnapshot } from "./match-precondition.js";

export type RecordedToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

const RECORDABLE_TOOLS = new Set([
  "browser_navigate",
  "browser_fill",
  "browser_click",
  "browser_click_at",
  "browser_wait_for",
  "browser_scroll",
  "browser_select_option",
  "browser_upload_file",
  "browser_press_key",
  "browser_assert_text",
  "browser_assert_visible",
  "browser_take_screenshot",
  "browser_hover",
  "mobile_launch_app",
  "mobile_tap",
  "mobile_tap_at",
  "mobile_input_text",
  "mobile_scroll",
  "mobile_wait_for",
  "mobile_upload_file",
  "mobile_assert_visible",
  "mobile_take_screenshot",
  "mobile_press_key",
]);

function stripRefFromArgs(args: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
  const locator = clone.locator;
  if (locator && typeof locator === "object") {
    const loc = { ...(locator as Record<string, unknown>) };
    delete loc.ref;
    clone.locator = loc;
  }
  return clone;
}

export function buildPlaybookFromRecording(args: {
  platform: TestCasePlatform;
  toolCalls: RecordedToolCall[];
  precondition: PlaybookPrecondition;
  variables?: string[];
}): FlowPlaybook | undefined {
  const steps: PlaybookStep[] = [];
  for (const call of args.toolCalls) {
    if (!RECORDABLE_TOOLS.has(call.tool)) continue;
    steps.push({
      tool: call.tool,
      args: stripRefFromArgs(call.args),
    });
  }
  if (!steps.length) return undefined;
  return {
    version: 1,
    platform: args.platform,
    precondition: args.precondition,
    variables: args.variables ?? [],
    steps,
  };
}

export function buildPreconditionFromSnapshot(
  platform: TestCasePlatform,
  snapshot: BrowserSnapshot | MobileSnapshot
): PlaybookPrecondition {
  if (platform === "mobile") {
    const mobile = snapshot as MobileSnapshot;
    const mustHave = mobile.elements
      .filter((el) => el.inViewport !== false)
      .slice(0, 5)
      .map((el) => ({
        text: el.text ?? undefined,
        contentDesc: el.contentDesc ?? undefined,
        resourceId: el.resourceId ?? undefined,
      }))
      .filter((rule) => rule.text || rule.contentDesc || rule.resourceId);
    return {
      package: mobile.package ?? undefined,
      activityIncludes: mobile.activity ?? undefined,
      mustHave,
    };
  }

  const browser = snapshot as BrowserSnapshot;
  const mustHave = browser.elements
    .filter((el) => el.inViewport !== false)
    .slice(0, 5)
    .map((el) => ({
      role: el.role ?? undefined,
      name: el.name ?? undefined,
      text: el.text ?? undefined,
    }))
    .filter((rule) => rule.role || rule.name || rule.text);

  let urlIncludes: string | undefined;
  if (browser.url) {
    try {
      const path = new URL(browser.url).pathname;
      if (path && path !== "/") urlIncludes = path;
    } catch {
      urlIncludes = browser.url;
    }
  }

  return { urlIncludes, mustHave };
}

function mergePlaybookIntoSectionBody(existingBody: string, playbook: FlowPlaybook): string {
  const block = serializePlaybookBlock(playbook);
  if (extractPlaybookJsonFromSection(existingBody)) {
    return existingBody.replace(/```playbook[\s\S]*?```/i, block.trim()).trim() + "\n";
  }
  return `${existingBody.trim()}\n\n${block}\n`.trim() + "\n";
}

export async function persistPlaybookSection(args: {
  platform: TestCasePlatform;
  appId: string;
  sectionKey: string;
  playbook: FlowPlaybook;
  apiDataToken?: string;
  existingContent?: string;
}): Promise<void> {
  const sections = parseMemorySections(args.existingContent ?? "");
  const normalizedKey = normalizeSectionKey(args.sectionKey);
  const priorBody = sections.get(normalizedKey) ?? "";
  const mergedBody = mergePlaybookIntoSectionBody(priorBody, args.playbook);

  const token = args.apiDataToken?.trim();
  if (token) {
    await putAgentAppMemory({
      scope: args.platform,
      appId: args.appId,
      content: mergedBody,
      mode: "upsert_section",
      sectionKey: normalizedKey,
      token,
    });
    return;
  }

  const write = args.platform === "mobile" ? writeMobileMemory : writeBrowserMemory;
  write(args.appId, mergedBody, "upsert_section", normalizedKey);
}
