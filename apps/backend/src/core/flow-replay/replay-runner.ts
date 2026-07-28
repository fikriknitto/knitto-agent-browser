import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { FlowPlaybook, PlaybookStep } from "@knitto/shared";
import { resolveDeep } from "./resolve-variables.js";

const BROWSER_REPLAY_TOOLS = new Set([
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
  "browser_go_back",
  "browser_go_forward",
]);

const MOBILE_REPLAY_TOOLS = new Set([
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

export type ReplayResult =
  | { ok: true; stepsExecuted: number }
  | { ok: false; reason: string; failedStep?: number; tool?: string };

function isAllowedTool(platform: FlowPlaybook["platform"], tool: string): boolean {
  if (platform === "browser") return BROWSER_REPLAY_TOOLS.has(tool);
  return MOBILE_REPLAY_TOOLS.has(tool);
}

function isToolError(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const record = result as Record<string, unknown>;
  if (record.isError === true) return "MCP tool returned isError";
  if ("content" in record && Array.isArray(record.content)) {
    for (const part of record.content) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string" &&
        part.text.toLowerCase().includes("error")
      ) {
        return part.text;
      }
    }
  }
  return undefined;
}

export async function replayPlaybookSteps(args: {
  mcpClient: Client;
  playbook: FlowPlaybook;
  variables: Record<string, string>;
  onStep?: (tool: string, index: number) => void;
}): Promise<ReplayResult> {
  const { mcpClient, playbook, variables } = args;
  let index = 0;

  for (const step of playbook.steps) {
    index += 1;
    const normalized = normalizeStep(step);
    if (!isAllowedTool(playbook.platform, normalized.tool)) {
      return {
        ok: false,
        reason: `Tool not allowed for replay: ${normalized.tool}`,
        failedStep: index,
        tool: normalized.tool,
      };
    }

    let argsResolved: Record<string, unknown>;
    try {
      argsResolved = resolveDeep(normalized.args ?? {}, variables);
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        failedStep: index,
        tool: normalized.tool,
      };
    }

    args.onStep?.(normalized.tool, index);

    try {
      const result = await mcpClient.callTool({
        name: normalized.tool,
        arguments: argsResolved,
      });
      const toolError = isToolError(result);
      if (toolError) {
        return {
          ok: false,
          reason: toolError,
          failedStep: index,
          tool: normalized.tool,
        };
      }
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        failedStep: index,
        tool: normalized.tool,
      };
    }
  }

  return { ok: true, stepsExecuted: playbook.steps.length };
}

function normalizeStep(step: PlaybookStep): PlaybookStep {
  return {
    tool: step.tool.trim(),
    args: step.args ?? {},
  };
}
