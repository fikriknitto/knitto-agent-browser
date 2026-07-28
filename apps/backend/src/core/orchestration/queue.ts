import type { AgentJobMessage, BridgeJob, UserPromptMessage } from "@knitto/shared";
import { agentMessages } from "./agent-messages.js";
import { hostJobGate } from "./host-job-gate.js";
import { scheduleIdleCleanup } from "./host-idle-cleanup.js";
import { logAgentRunEvent } from "./run-event-log.js";
import { resolveJobTestCasesAsync } from "./test-case-parser.js";
import {
  PromptBaseInvalidPathError,
  PromptBaseNotFoundError,
} from "../prompts/prompt-base-resolver.js";
import { resolvePromptBasePathsForJob } from "../prompts/prompt-base-materialize.js";
import {
  syncAgentRunCancelled,
  syncAgentRunFromJobMessage,
} from "../../infra/api-data/agent-run-sync.js";
import { patchAgentRun } from "../../infra/api-data/agent-runs-client.js";
import { assertMissionApprovedForJob } from "../../infra/api-data/agent-missions-client.js";
import { createLogger } from "../logging.js";

const logger = createLogger("job-queue");

export type JobEmitter = (msg: AgentJobMessage) => void;

export interface BridgeJobHandle {
  promise: Promise<void>;
  cancel: () => Promise<void>;
}

export type JobRunner = (job: BridgeJob, emit: JobEmitter) => BridgeJobHandle;

function withConnectionId(msg: AgentJobMessage, connectionId?: string): AgentJobMessage {
  if (!connectionId) return msg;
  return { ...msg, connectionId };
}

function withRunId(msg: AgentJobMessage, runId?: number): AgentJobMessage {
  if (runId == null) return msg;
  return { ...msg, runId };
}

/**
 * Per-job tail promise so syncAgentRunFromJobMessage calls apply to API Data
 * strictly in emission order. Without this, each emit() fired a fire-and-
 * forget HTTP write (queue.ts's old `void syncAgentRunFromJobMessage(...)`),
 * and network timing could let an earlier "running" write land AFTER the
 * terminal "completed" write — leaving agent_run_cases.status stuck at
 * RUNNING in the DB even though the run finished PASSED. Chaining onto the
 * same job's previous write ensures the terminal write is always the last
 * one applied, regardless of individual HTTP call latency.
 */
const apiDataSyncTails = new Map<string, Promise<void>>();

export function serializeApiDataSync(jobId: string, task: () => Promise<void>): void {
  const prev = apiDataSyncTails.get(jobId) ?? Promise.resolve();
  const next = prev.then(task, task).catch(() => undefined);
  apiDataSyncTails.set(jobId, next);
  void next.then(() => {
    if (apiDataSyncTails.get(jobId) === next) {
      apiDataSyncTails.delete(jobId);
    }
  });
}

export class JobQueue {
  private readonly pending = new Map<string, BridgeJob[]>();
  private readonly runningCount = new Map<string, number>();
  private readonly activeCancels = new Map<string, () => Promise<void>>();

  constructor(
    private readonly emit: JobEmitter,
    private readonly maxConcurrent: number,
    private readonly startJob: JobRunner
  ) {}

  enqueueFromMessage(msg: UserPromptMessage): void {
    void this.enqueueFromMessageAsync(msg);
  }

  private async enqueueFromMessageAsync(msg: UserPromptMessage): Promise<void> {
    const main = (msg.mainPrompt ?? msg.text).trim();
    const connectionId = msg.connectionId;
    const emitEarlyError = (message: string) => {
      const errMsg = withConnectionId(
        withRunId(
          {
            type: "agent_job",
            id: msg.id,
            channel: msg.channel,
            status: "error",
            message,
            progress: 100,
          },
          msg.runId
        ),
        connectionId
      );
      this.emit(errMsg);
      void syncAgentRunFromJobMessage(
        {
          id: msg.id,
          channel: msg.channel,
          connectionId,
          text: main,
          runId: msg.runId,
          apiDataToken: msg.apiDataToken,
        },
        errMsg
      );
    };

    let promptBasePaths: string[] | undefined;
    if (msg.promptBasePaths?.length) {
      try {
        promptBasePaths = await resolvePromptBasePathsForJob(msg.promptBasePaths, {
          apiDataToken: msg.apiDataToken,
          jobId: msg.id,
        });
      } catch (error) {
        const message =
          error instanceof PromptBaseNotFoundError ||
          error instanceof PromptBaseInvalidPathError
            ? error.message
            : "Failed to resolve prompt base paths";
        emitEarlyError(message);
        return;
      }
    }

    if (!main && !msg.attachments?.length && !promptBasePaths?.length) {
      emitEarlyError("Prompt, attachment, or prompt base is required");
      return;
    }

    if (msg.platform === "mobile" && !msg.mobileConfig?.appPackage?.trim()) {
      emitEarlyError("Mobile job requires appPackage — pilih package di UI");
      return;
    }

    // Scope B: Mission path — reject unless APPROVED + runId match
    if (msg.missionId != null) {
      if (!msg.apiDataToken) {
        emitEarlyError("Mission job requires apiDataToken");
        return;
      }
      if (msg.runId == null) {
        emitEarlyError("Mission job requires runId (approve dulu)");
        return;
      }
      try {
        await assertMissionApprovedForJob({
          token: msg.apiDataToken,
          missionId: msg.missionId,
          runId: msg.runId,
          agentJobId: msg.id,
        });
      } catch (error) {
        emitEarlyError(
          error instanceof Error ? error.message : "Mission validation failed"
        );
        return;
      }
    }

    let resolvedTestCases = msg.testCases;
    if (msg.platform === "hybrid" && !resolvedTestCases?.length) {
      const resolved = await resolveJobTestCasesAsync({
        id: msg.id,
        channel: msg.channel,
        text: main,
        platform: msg.platform,
        mobileConfig: msg.mobileConfig,
      });
      if (resolved.errors.length) {
        emitEarlyError(resolved.errors.join(" "));
        return;
      }
      if (!resolved.testCases.length) {
        emitEarlyError(
          "Prompt hybrid membutuhkan minimal satu heading ## Test Case."
        );
        return;
      }
      resolvedTestCases = resolved.testCases;
    }

    this.enqueue({
      id: msg.id,
      channel: msg.channel,
      connectionId,
      text: main,
      strategy: msg.strategy,
      model: msg.model,
      attachments: msg.attachments,
      promptBasePaths,
      mainPrompt: main || undefined,
      platform: msg.platform,
      mobileConfig: msg.mobileConfig,
      testCases: resolvedTestCases,
      runId: msg.runId,
      missionId: msg.missionId,
      apiDataToken: msg.apiDataToken,
    });
  }

  enqueue(job: BridgeJob): void {
    const jobLog = logger.child({ agentJobId: job.id, runId: job.runId });
    const hostBusy = hostJobGate.isBusy();
    const queueMessage = hostBusy
      ? agentMessages.waitingHostSlot
      : agentMessages.waitingInQueue;

    jobLog.info(
      hostBusy
        ? `Queued behind host slot (active=${hostJobGate.getActiveJobId()})`
        : "Queued"
    );

    this.emit(
      withConnectionId(
        withRunId(
          {
            type: "agent_job",
            id: job.id,
            channel: job.channel,
            status: "queued",
            message: queueMessage,
            progress: 0,
          },
          job.runId
        ),
        job.connectionId
      )
    );

    const list = this.pending.get(job.channel) ?? [];
    list.push(job);
    this.pending.set(job.channel, list);
    void this.pump(job.channel);
  }

  async cancel(jobId: string, channel: string): Promise<boolean> {
    const list = this.pending.get(channel);
    if (list) {
      const idx = list.findIndex((j) => j.id === jobId);
      if (idx >= 0) {
        const job = list[idx]!;
        list.splice(idx, 1);
        logger.child({ agentJobId: jobId, runId: job.runId }).info("Cancelled while queued");
        this.emit(
          withConnectionId(
            withRunId(
              {
                type: "agent_job",
                id: jobId,
                channel,
                status: "cancelled",
                message: agentMessages.cancelledWhileQueued,
              },
              job.runId
            ),
            job.connectionId
          )
        );
        void syncAgentRunCancelled(job);
        void logAgentRunEvent({
          agentJobId: jobId,
          runId: job.runId,
          apiDataToken: job.apiDataToken,
          level: "INFO",
          message: "Job cancelled while queued",
        });
        return true;
      }
    }

    const cancelFn = this.activeCancels.get(jobId);
    if (cancelFn) {
      await cancelFn();
      this.activeCancels.delete(jobId);
      return true;
    }
    return false;
  }

  private getRunning(channel: string): number {
    return this.runningCount.get(channel) ?? 0;
  }

  private async pump(channel: string): Promise<void> {
    while (this.getRunning(channel) < this.maxConcurrent) {
      const list = this.pending.get(channel);
      if (!list?.length) return;

      const job = list.shift()!;
      if (!list.length) this.pending.delete(channel);

      this.runningCount.set(channel, this.getRunning(channel) + 1);
      const jobLog = logger.child({ agentJobId: job.id, runId: job.runId });
      const hostAbort = new AbortController();

      this.activeCancels.set(job.id, async () => {
        hostAbort.abort();
        jobLog.info("Cancel requested (pre-start or running)");
        const runningCancel = this.activeCancels.get(`run:${job.id}`);
        if (runningCancel) await runningCancel();
        void syncAgentRunCancelled(job);
        void logAgentRunEvent({
          agentJobId: job.id,
          runId: job.runId,
          apiDataToken: job.apiDataToken,
          level: "INFO",
          message: "Job cancel requested",
        });
      });

      if (hostJobGate.isBusy() && hostJobGate.getActiveJobId() !== job.id) {
        this.emit(
          withConnectionId(
            withRunId(
              {
                type: "agent_job",
                id: job.id,
                channel: job.channel,
                status: "queued",
                message: agentMessages.waitingHostSlot,
                progress: 0,
              },
              job.runId
            ),
            job.connectionId
          )
        );
      }

      try {
        await hostJobGate.acquire(job.id, hostAbort.signal);
      } catch (error) {
        this.activeCancels.delete(job.id);
        this.runningCount.set(channel, Math.max(0, this.getRunning(channel) - 1));
        const aborted =
          (error instanceof Error && error.name === "AbortError") || hostAbort.signal.aborted;
        if (aborted) {
          jobLog.info("Cancelled while waiting for host slot");
          this.emit(
            withConnectionId(
              withRunId(
                {
                  type: "agent_job",
                  id: job.id,
                  channel: job.channel,
                  status: "cancelled",
                  message: agentMessages.cancelledWhileQueued,
                },
                job.runId
              ),
              job.connectionId
            )
          );
          void syncAgentRunCancelled(job);
        } else {
          jobLog.error(
            `Host gate acquire failed: ${error instanceof Error ? error.message : String(error)}`
          );
          this.emit(
            withConnectionId(
              withRunId(
                {
                  type: "agent_job",
                  id: job.id,
                  channel: job.channel,
                  status: "error",
                  message:
                    error instanceof Error ? error.message : "Host job gate failed",
                  progress: 100,
                },
                job.runId
              ),
              job.connectionId
            )
          );
        }
        void this.pump(channel);
        return;
      }

      if (job.apiDataToken && job.runId != null) {
        void patchAgentRun(job.apiDataToken, job.runId, { status: "RUNNING" }).catch(
          (error) => {
            jobLog.warn(
              `API Data PATCH RUNNING failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        );
      }

      void logAgentRunEvent({
        agentJobId: job.id,
        runId: job.runId,
        apiDataToken: job.apiDataToken,
        level: "INFO",
        message: "Job started on Worker",
      });

      const emitForJob: JobEmitter = (msg) => {
        const enriched = withConnectionId(withRunId(msg, job.runId), job.connectionId);
        this.emit(enriched);
        serializeApiDataSync(job.id, () => syncAgentRunFromJobMessage(job, enriched));
      };
      const handle = this.startJob(job, emitForJob);
      this.activeCancels.set(`run:${job.id}`, async () => {
        await handle.cancel();
      });
      this.activeCancels.set(job.id, async () => {
        jobLog.info("Cancel requested for running job");
        await handle.cancel();
        serializeApiDataSync(job.id, () => syncAgentRunCancelled(job));
        void logAgentRunEvent({
          agentJobId: job.id,
          runId: job.runId,
          apiDataToken: job.apiDataToken,
          level: "INFO",
          message: "Job cancel requested",
        });
      });

      try {
        await handle.promise;
      } finally {
        this.activeCancels.delete(job.id);
        this.activeCancels.delete(`run:${job.id}`);
        hostJobGate.release(job.id);
        if (hostJobGate.isIdle()) {
          scheduleIdleCleanup(job.id);
        }
        this.runningCount.set(channel, Math.max(0, this.getRunning(channel) - 1));
        jobLog.info("Job finished (slot released)");
        void this.pump(channel);
      }
    }
  }
}
