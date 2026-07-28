import type { AgentJobMessage, BridgeJob, TestCaseResult } from "@knitto/shared";
import { createLogger } from "../../core/logging.js";
import { logAgentRunEvent } from "../../core/orchestration/run-event-log.js";
import {
  getAgentRunByJobId,
  patchAgentRun,
  upsertAgentRunCases,
  type UpsertCaseItem,
} from "./agent-runs-client.js";
import { uploadJobEvidenceToApiData } from "./evidence-upload.js";

const logger = createLogger("api-data-sync");

function mapCaseStatus(
  status: TestCaseResult["status"]
): UpsertCaseItem["status"] {
  switch (status) {
    case "completed":
      return "PASSED";
    case "error":
      return "ERROR";
    case "skipped":
      return "SKIPPED";
    case "running":
    case "pending":
    default:
      return "RUNNING";
  }
}

function parseNumericTestCaseId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function deriveOutcome(
  results: TestCaseResult[] | undefined
): "PASSED" | "FAILED" | "PARTIAL" {
  // An empty/missing results array must never be read as success — that
  // silent default was itself a false-PASSED source (a "completed" job with
  // no test-case results reported PASSED with zero verification). Fail
  // safe instead; both job execution paths now always populate
  // testCaseResults, so this branch should rarely trigger.
  if (!results?.length) return "FAILED";
  const passed = results.filter((r) => r.status === "completed").length;
  const errors = results.filter((r) => r.status === "error").length;
  if (errors === 0 && passed === results.length) return "PASSED";
  if (passed === 0) return "FAILED";
  return "PARTIAL";
}

function toCaseItems(results: TestCaseResult[]): UpsertCaseItem[] {
  return results.map((r, index) => ({
    testCaseId: parseNumericTestCaseId(r.testCaseId),
    caseOrder: index + 1,
    title: r.title,
    status: mapCaseStatus(r.status),
    summary: r.summary || null,
    error: r.status === "error" ? r.summary || "error" : null,
  }));
}

function withMediaPendingSuffix(summary: string | null | undefined, pending: boolean): string | null {
  const base = (summary ?? "").trim();
  if (!pending) return base || null;
  if (base.includes("[mediaPending]")) return base || "[mediaPending]";
  return base ? `${base} [mediaPending]` : "[mediaPending]";
}

/**
 * Resolve runId from job payload, or once via GET by-agent-job (degraded path).
 * Mutates job.runId when found. Never blocks agent execution on miss.
 */
async function resolveRunContext(
  job: BridgeJob
): Promise<{ token: string; runId: number } | null> {
  const token = job.apiDataToken?.trim();
  if (!token) return null;

  if (job.runId != null) {
    return { token, runId: job.runId };
  }

  const found = await getAgentRunByJobId(token, job.id);
  if (found?.runId != null) {
    job.runId = found.runId;
    logger
      .child({ agentJobId: job.id, runId: found.runId })
      .info("Resolved runId via by-agent-job");
    return { token, runId: found.runId };
  }

  logger
    .child({ agentJobId: job.id })
    .warn("No API Data run (token present) — sync skipped (degraded)");
  return null;
}

/**
 * Sync durable agent_runs state from a terminal (or running) agent_job message.
 * Never throws to callers — failures are logged only.
 */
export async function syncAgentRunFromJobMessage(
  job: BridgeJob,
  msg: AgentJobMessage
): Promise<void> {
  const ctx = await resolveRunContext(job);
  if (!ctx) return;
  const { token, runId } = ctx;
  const jobLog = logger.child({ agentJobId: job.id, runId });

  try {
    if (msg.status === "running" || msg.status === "queued") {
      if (msg.status === "running") {
        await patchAgentRun(token, runId, { status: "RUNNING" });
      }
      return;
    }

    if (msg.testCaseResults?.length) {
      await upsertAgentRunCases(token, runId, toCaseItems(msg.testCaseResults));
    }

    let mediaPending = false;
    if (
      msg.status === "completed" ||
      msg.status === "error" ||
      msg.status === "cancelled"
    ) {
      const upload = await uploadJobEvidenceToApiData(job);
      mediaPending = upload.pending;
    }

    if (msg.status === "completed") {
      await patchAgentRun(token, runId, {
        status: "FINISHED",
        outcome: deriveOutcome(msg.testCaseResults),
        summary: withMediaPendingSuffix(msg.message || msg.result || null, mediaPending),
      });
      return;
    }

    if (msg.status === "error") {
      await patchAgentRun(token, runId, {
        status: "ERROR",
        error: msg.message || "job error",
        summary: withMediaPendingSuffix(msg.message || null, mediaPending),
      });
      return;
    }

    if (msg.status === "cancelled") {
      await patchAgentRun(token, runId, {
        status: "CANCELLED",
        summary: withMediaPendingSuffix(msg.message || "cancelled", mediaPending),
      });
    }
  } catch (error) {
    jobLog.warn(
      `API Data sync failed: ${error instanceof Error ? error.message : String(error)}`
    );
    void logAgentRunEvent({
      agentJobId: job.id,
      runId,
      apiDataToken: token,
      level: "WARNING",
      message: `API Data sync failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function syncAgentRunCancelled(job: BridgeJob): Promise<void> {
  const ctx = await resolveRunContext(job);
  if (!ctx) return;
  try {
    const upload = await uploadJobEvidenceToApiData(job);
    await patchAgentRun(ctx.token, ctx.runId, {
      status: "CANCELLED",
      summary: withMediaPendingSuffix("cancelled", upload.pending),
    });
  } catch (error) {
    logger
      .child({ agentJobId: job.id, runId: ctx.runId })
      .warn(
        `API Data CANCELLED sync failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
  }
}

/**
 * Mark a known run ERROR when local job is gone but BE still RUNNING past TTL.
 * MVP: no cron — call from ops/manual or optional Worker startup for known jobs.
 * Resume mid-job is not supported (W2).
 */
export async function markStaleRunningRun(
  token: string,
  runId: number,
  summary = "stale_running"
): Promise<void> {
  await patchAgentRun(token, runId, {
    status: "ERROR",
    error: summary,
    summary,
  });
}
