import { createLogger } from "../../platforms/mcp-kit/core/index.js";
import {
  connectAutomationMcp,
  disconnectAutomationMcpJobContext,
} from "../../core/mcp/automation-mcp-client.js";
import { buildOpenAIUserContent, buildPromptForJob } from "../../core/prompts/prompt-builder.js";
import { resolveMemoryAppIdForJob } from "../../core/memory/resolve-memory-app-id-for-job.js";
import {
  cleanupJobAttachments,
  loadVisionAttachments,
  resolveJobAttachments,
} from "../../core/evidence/persist-attachments.js";
import { ensureJobScreenshot, extractScreenshotBase64 } from "../../core/evidence/tool-screenshot.js";
import { jobMediaPayload, jobMediaPayloadAsync } from "../../core/evidence/job-media-payload.js";
import { agentMessages } from "../../core/orchestration/agent-messages.js";
import { closeMcpSession } from "../../core/mcp/mcp-session-cleanup.js";
import {
  resolveHybridMobileConfig,
  resolveJobTestCasesAsync,
  shouldUseOrchestrator,
} from "../../core/orchestration/test-case-parser.js";
import { executeMultiTestBridgeJob } from "../../core/orchestration/multi-test-bridge.js";
import { createOpenaiTestCaseRunner } from "../../core/orchestration/multi-test-openai.js";
import { logAgentRunEvent, summarizeToolArgs } from "../../core/orchestration/run-event-log.js";
import { judgeTestCaseOutcomeWithLlm } from "../../core/orchestration/test-case-judge.js";
import type { AgentJobMessage, BridgeJob, TestCaseResult } from "@knitto/shared";
import config, { type OpenaiCredentials } from "./config.js";
import { runOpenAIAgentLoop, type ChatMessage } from "./openai-agent.js";

const logger = createLogger("openai-agent");

export type JobProgressEmitter = (msg: AgentJobMessage) => void;

export interface BridgeJobHandle {
  promise: Promise<void>;
  cancel: () => Promise<void>;
}

type TerminalOutcome =
  | { kind: "completed"; result: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

export function createStartBridgeJob(
  getCredentials: () => OpenaiCredentials
): (job: BridgeJob, emit: JobProgressEmitter) => BridgeJobHandle {
  return (job, emit) => startBridgeJob(job, emit, getCredentials);
}

function startBridgeJob(
  job: BridgeJob,
  emit: JobProgressEmitter,
  getCredentials: () => OpenaiCredentials
): BridgeJobHandle {
  const abortController = new AbortController();
  let cancelled = false;

  const cancel = async (): Promise<void> => {
    cancelled = true;
    abortController.abort();
  };

  const promise = (async () => {
    const creds = getCredentials();
    if (!creds.baseUrl.trim()) {
      throw new Error(
        "OpenAI-compatible belum dikonfigurasi — simpan Base URL + API key di Settings → Agent credentials"
      );
    }

    const attachOpts = { apiDataToken: job.apiDataToken, jobId: job.id };
    const savedAttachments = await resolveJobAttachments(job.attachments, attachOpts);
    const visionAttachments = await loadVisionAttachments(job.attachments, attachOpts);
    const platform = job.platform ?? "browser";
    const { testCases, errors } = await resolveJobTestCasesAsync(job);

    if (errors.length) {
      emit({
        type: "agent_job",
        id: job.id,
        channel: job.channel,
        status: "error",
        message: errors.join(" "),
        progress: 100,
      });
      return;
    }

    const modelId = job.model ?? config.modelId;
    if (!modelId) {
      throw new Error("Model belum dipilih — pilih model OpenAI-compatible di Web UI");
    }

    if (shouldUseOrchestrator(platform, testCases)) {
      const hybridMobileConfig =
        platform === "hybrid"
          ? resolveHybridMobileConfig(testCases, job.mobileConfig)
          : undefined;
      await executeMultiTestBridgeJob({
        job: {
          ...job,
          testCases,
          ...(hybridMobileConfig ? { mobileConfig: hybridMobileConfig } : {}),
        },
        testCases,
        emit,
        isCancelled: () => cancelled,
        startingMessage: agentMessages.startingOpenai,
        createRunner: (mcpClient) =>
          createOpenaiTestCaseRunner(mcpClient, modelId, abortController.signal, getCredentials),
        flowReplayJudge: {
          creds: getCredentials(),
          model: modelId,
        },
      });
      return;
    }

    const memoryAppId = await resolveMemoryAppIdForJob({
      platform,
      text: job.text,
      mobileConfig: job.mobileConfig,
      promptBasePaths: job.promptBasePaths,
      apiDataToken: job.apiDataToken,
    });
    const promptInput = buildPromptForJob({
      platform,
      mobileConfig: job.mobileConfig,
      channel: job.channel,
      text: job.text,
      strategy: job.strategy,
      attachments: job.attachments,
      visionAttachments,
      savedAttachments,
      promptBasePaths: job.promptBasePaths,
      memoryAppId,
    });

    const messages: ChatMessage[] = [
      { role: "user", content: buildOpenAIUserContent(promptInput) },
    ];

    emit({
      type: "agent_job",
      id: job.id,
      channel: job.channel,
      status: "running",
      message: agentMessages.startingOpenai,
      progress: 5,
    });

    const mcpClient = await connectAutomationMcp(
      job.id,
      platform,
      job.mobileConfig,
      job.apiDataToken
    );

    if (platform === "mobile") {
      const { prepareMobileJobSession } = await import("../../core/orchestration/mobile-job-setup.js");
      await prepareMobileJobSession(job.id, job.mobileConfig);
    }

    let lastTool = "";
    let lastScreenshot: string | undefined;
    let terminal: TerminalOutcome | null = null;

    const timeout = setTimeout(() => {
      if (!cancelled) abortController.abort();
    }, config.jobTimeoutMs);

    try {
      if (cancelled) {
        terminal = { kind: "cancelled" };
        return;
      }

      logger.info(`OpenAI-compatible run started (model: ${modelId})`);

      const summary = await runOpenAIAgentLoop({
        creds,
        model: modelId,
        messages,
        mcpClient,
        maxToolCalls: config.maxToolCalls,
        signal: abortController.signal,
        onRetry: (attempt, maxRetries, delayMs, error) => {
          if (cancelled) return;
          const delaySec = Math.round(delayMs / 1000);
          const detail = error instanceof Error ? error.message : String(error);
          logger.warn(`OpenAI-compatible retry ${attempt}/${maxRetries} in ${delaySec}s: ${detail}`);
          emit({
            type: "agent_job",
            id: job.id,
            channel: job.channel,
            status: "running",
            message: agentMessages.rateLimitedRetry(attempt, maxRetries, delaySec),
            progress: 8,
          });
        },
        onTool: (phase, toolName, result, toolArgs) => {
          if (cancelled) return;

          if (phase === "start" && toolName) {
            void logAgentRunEvent({
              agentJobId: job.id,
              runId: job.runId,
              apiDataToken: job.apiDataToken,
              message: `tool: ${toolName} ${summarizeToolArgs(toolArgs)}`.trim(),
            });
          }

          if (phase === "start" && toolName && toolName !== lastTool) {
            lastTool = toolName;
            emit({
              type: "agent_job",
              id: job.id,
              channel: job.channel,
              status: "running",
              message: agentMessages.usingTool(toolName),
              progress: 10,
              toolName,
            });
          }

          if (phase === "complete" && toolName) {
            const screenshot = extractScreenshotBase64(toolName, result);
            if (screenshot) {
              lastScreenshot = screenshot;
              emit({
                type: "agent_job",
                id: job.id,
                channel: job.channel,
                status: "running",
                message: agentMessages.screenshotCaptured,
                progress: 50,
                toolName,
                ...jobMediaPayload(job.id),
              });
            }
          }
        },
      });

      if (cancelled) {
        terminal = { kind: "cancelled" };
        return;
      }

      lastScreenshot = await ensureJobScreenshot(mcpClient, lastScreenshot);

      // The loop resolving without throwing only means the agent stopped
      // calling tools — it does NOT mean the stated goal was achieved (the
      // agent's own "Ringkasan akhir" was previously the only signal, which
      // is why a blank login form could still be reported PASSED). Verify
      // against the final screenshot before declaring success.
      const judged = await judgeTestCaseOutcomeWithLlm({
        creds,
        model: modelId,
        instruction: job.text,
        agentSummary: summary,
        screenshotBase64: lastScreenshot,
        signal: abortController.signal,
      });
      terminal = judged.passed
        ? { kind: "completed", result: summary }
        : { kind: "error", message: `Verifikasi gagal: ${judged.reason}` };
    } catch (error) {
      if (cancelled || abortController.signal.aborted) {
        terminal = { kind: "cancelled" };
      } else {
        terminal = {
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    } finally {
      clearTimeout(timeout);
      await closeMcpSession(mcpClient, platform, platform === "mobile" ? job.id : undefined);
      disconnectAutomationMcpJobContext();
      const media = await jobMediaPayloadAsync(job.id, platform);

      // Single-test-case jobs (shouldUseOrchestrator() is false for exactly
      // one TC) never went through test-case-orchestrator.ts's
      // emitTestCaseProgress/testCaseResults reporting, so
      // syncAgentRunFromJobMessage's `agent_run_cases` upsert never fired —
      // the DB row stayed at RUNNING forever regardless of the job's real
      // outcome. Synthesize the same single-item testCaseResults shape here
      // so the terminal message carries it too.
      const tc = testCases[0];
      const buildTestCaseResults = (
        status: TestCaseResult["status"],
        summary: string
      ): TestCaseResult[] => [
        {
          testCaseId: tc?.id ?? "tc-1",
          title: tc?.title ?? job.text ?? "Test case",
          platform: platform === "mobile" ? "mobile" : "browser",
          status,
          summary,
        },
      ];

      if (terminal?.kind === "completed") {
        emit({
          type: "agent_job",
          id: job.id,
          channel: job.channel,
          status: "completed",
          message: agentMessages.completed,
          progress: 100,
          result: terminal.result,
          testCaseResults: buildTestCaseResults("completed", terminal.result || "Selesai"),
          ...media,
        });
      } else if (terminal?.kind === "cancelled") {
        emit({
          type: "agent_job",
          id: job.id,
          channel: job.channel,
          status: "cancelled",
          message: agentMessages.cancelled,
          testCaseResults: buildTestCaseResults("error", "Dibatalkan"),
          ...media,
        });
      } else if (terminal?.kind === "error") {
        emit({
          type: "agent_job",
          id: job.id,
          channel: job.channel,
          status: "error",
          message: terminal.message,
          progress: 100,
          testCaseResults: buildTestCaseResults("error", terminal.message),
          ...media,
        });
      }

      await mcpClient.close().catch(() => undefined);
      await cleanupJobAttachments(job.id);
    }
  })();

  return { promise, cancel };
}
