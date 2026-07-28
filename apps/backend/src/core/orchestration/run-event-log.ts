import { createLogger } from "../logging.js";
import { appendAgentRunLogs } from "../../infra/api-data/agent-runs-client.js";

const logger = createLogger("run-event");

const REDACT_ARG_KEYS = new Set(["value", "apikey", "password"]);

/**
 * Compact, sanitized string of a tool call's arguments for durable logging
 * (agent_run_logs) — never includes typed text/credentials (e.g.
 * mobile_input_text's `value`), only structural info (locator/ref,
 * coordinates, direction, etc.) useful for tracing what the agent actually
 * did without leaking sensitive input.
 */
export function summarizeToolArgs(args: Record<string, unknown> | undefined | null): string {
  if (!args || typeof args !== "object") return "";
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    safe[key] = REDACT_ARG_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  try {
    return JSON.stringify(safe);
  } catch {
    return "";
  }
}

/**
 * Structured Worker log + optional durable log line on API Data (best-effort).
 * Never throws. Do not flood — use for key lifecycle events only.
 */
export async function logAgentRunEvent(opts: {
  agentJobId: string;
  runId?: number;
  apiDataToken?: string;
  level?: "INFO" | "WARNING" | "ERROR";
  message: string;
}): Promise<void> {
  const level = opts.level ?? "INFO";
  const log = logger.child({
    agentJobId: opts.agentJobId,
    runId: opts.runId,
  });

  if (level === "ERROR") log.error(opts.message);
  else if (level === "WARNING") log.warn(opts.message);
  else log.info(opts.message);

  const token = opts.apiDataToken?.trim();
  if (!token || opts.runId == null) return;

  try {
    await appendAgentRunLogs(token, opts.runId, [
      { level, message: opts.message },
    ]);
  } catch {
    // never fail the job for log shipping
  }
}
