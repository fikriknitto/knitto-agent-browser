import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAutomationMcpPath } from "../../core/mcp/automation-mcp-config.js";

export interface OpenaiCredentials {
  baseUrl: string;
  apiKey: string;
}

function resolveBridgeCwd(): string {
  if (process.env.KNITTO_BRIDGE_CWD) return process.env.KNITTO_BRIDGE_CWD;
  const dir = join(tmpdir(), "knitto-automation-bridge-openai");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function normalizeOpenaiBaseUrl(url: string): string {
  let trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) trimmed = trimmed.slice(0, -3);
  return trimmed;
}

export function openaiApiV1(baseUrl: string): string {
  return `${normalizeOpenaiBaseUrl(baseUrl)}/v1`;
}

/** Env tuning for OpenAI-compatible runtimes. Credentials are per-provider instance. */
export default {
  automationMcpPath: resolveAutomationMcpPath(),
  get automationMcpCommand() {
    return process.env.AUTOMATION_MCP_COMMAND?.trim() || "pnpm";
  },
  bridgeCwd: resolveBridgeCwd(),
  maxConcurrentPerChannel: Number(process.env.KNITTO_BRIDGE_MAX_CONCURRENT ?? "1"),
  jobTimeoutMs: Number(process.env.KNITTO_BRIDGE_JOB_TIMEOUT_MS ?? "600000"),
  /** Preferred default when catalog returns models; not a credential seed. */
  modelId: process.env.KNITTO_BRIDGE_MODEL?.trim() || "",
  maxToolCalls: Number(process.env.KNITTO_BRIDGE_MAX_TOOL_CALLS ?? "25"),
  maxRetries: Number(process.env.OPENAI_COMPAT_MAX_RETRIES ?? "5"),
  retryDelayMs: Number(process.env.OPENAI_COMPAT_RETRY_DELAY_MS ?? "2000"),
};
