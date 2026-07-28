import type {
  AgentJobMessage,
  BridgeJob,
  TestCaseResult,
  TestCaseSpec,
  TestCaseStatus,
  VideoRecordingMeta,
} from "@knitto/shared";
import {
  buildMultiTestCaseResultMarkdown,
  buildMultiTestCaseSummaryMarkdown,
  formatTestCaseShortcutSummary,
  screenshotsForTestCase,
  testCaseVideoFilenameForId,
} from "@knitto/shared";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  extractHandoffFromText,
  mergeHandoffState,
  type HandoffState,
} from "./handoff.js";
import { mobileConfigForTestCase } from "./test-case-parser.js";
import type { TestCaseCleanupMode } from "./test-case-cleanup.js";
import {
  buildHybridOverviewPrompt,
  buildTestCasePrompt,
  type AgentPromptInput,
} from "../prompts/prompt-builder.js";
import {
  clearJobSegmentManaged,
  ensureSegmentRecordingStarted,
  markJobSegmentManaged,
  startSegmentRecording,
  stopSegmentRecording,
} from "../evidence/segment-recording.js";
import {
  connectAutomationMcp,
  setActiveTestCaseMobileConfig,
} from "../mcp/automation-mcp-client.js";
import { agentVideoServeUrl } from "../../modules/evidence/agent-videos.js";
import { jobMediaPayload } from "../evidence/job-media-payload.js";
import { setAutomationJobId } from "../job-context.js";
import { setApiDataJobToken } from "../../infra/api-data/api-data-job-context.js";
import {
  listAgentScreenshotFiles,
} from "../../modules/evidence/agent-screenshots.js";
import { sanitizeJobId } from "../job-context.js";
import { tryFlowReplay } from "../flow-replay/try-flow-replay.js";
import {
  buildPlaybookFromRecording,
  persistPlaybookSection,
  type RecordedToolCall,
} from "../flow-replay/record-playbook.js";
import { buildPreconditionFromToolCalls } from "../flow-replay/build-precondition-from-recording.js";
import { defaultSectionKeyForTestCase } from "../prompts/prompt-builder.js";
import { resolveMemoryAppIdForJob } from "../memory/resolve-memory-app-id-for-job.js";
import { logAgentRunEvent, summarizeToolArgs } from "./run-event-log.js";
import { judgeTestCaseOutcomeWithLlm } from "./test-case-judge.js";
import { loadMemoryContent } from "../flow-replay/load-playbook.js";
import type { OpenaiCredentials } from "../../agents/openai/config.js";

export type TestCaseAgentResult = {
  summary: string;
  error?: string;
  /** Final on-screen state captured during the run, if any — fed to the outcome judge. */
  lastScreenshot?: string;
  /** Structured fields from the LLM judge — mapped into TestCaseResult for user-friendly reporting. */
  judgeScenario?: string;
  judgeStepsPerformed?: string;
  judgeExpectedResult?: string;
  judgeActualResult?: string;
  judgeConclusion?: string;
  judgeFailureReason?: string;
  judgeSuggestion?: string;
};

export type TestCaseAgentRunner = (ctx: {
  job: BridgeJob;
  tc: TestCaseSpec;
  tcIndex: number;
  tcTotal: number;
  prompt: AgentPromptInput;
  mcpClient: Client;
  handoff: HandoffState;
  isCancelled: () => boolean;
  onToolProgress: (toolName: string, args?: Record<string, unknown>) => void;
}) => Promise<TestCaseAgentResult>;

export type OrchestratorResult = {
  summary: string;
  resultMarkdown: string;
  testCaseResults: TestCaseResult[];
  videoUrls: string[];
  videoRecordingMeta: VideoRecordingMeta[];
  handoff: HandoffState;
  failed: boolean;
};

function buildVideoMeta(
  tc: TestCaseSpec,
  url: string,
  warning?: string
): VideoRecordingMeta {
  const shortcutSummary = formatTestCaseShortcutSummary(tc);
  const shortcutPart = shortcutSummary ? ` · ${shortcutSummary}` : "";
  return {
    url,
    testCaseId: tc.id,
    platform: tc.platform,
    appPackage: tc.appPackage,
    label: `${tc.title ?? tc.id} · ${tc.platform}${tc.appPackage ? ` · ${tc.appPackage}` : ""}${shortcutPart}`,
    warning,
  };
}

function emitTestCaseProgress(
  emit: (msg: AgentJobMessage) => void,
  job: BridgeJob,
  args: {
    testCaseIndex: number;
    testCaseTotal: number;
    testCaseId: string;
    testCasePlatform: TestCaseSpec["platform"];
    testCaseStatus: TestCaseStatus;
    message: string;
    toolName?: string;
    videoUrls?: string[];
    videoRecordingMeta?: VideoRecordingMeta[];
    testCaseResults?: TestCaseResult[];
    testCases?: TestCaseSpec[];
  }
): void {
  emit({
    type: "agent_job",
    id: job.id,
    channel: job.channel,
    status: "running",
    message: args.message,
    progress: Math.round(((args.testCaseIndex + 1) / args.testCaseTotal) * 90),
    testCaseIndex: args.testCaseIndex,
    testCaseTotal: args.testCaseTotal,
    testCaseId: args.testCaseId,
    testCasePlatform: args.testCasePlatform,
    testCaseStatus: args.testCaseStatus,
    toolName: args.toolName,
    videoUrls: args.videoUrls,
    videoRecordingMeta: args.videoRecordingMeta,
    testCaseResults: args.testCaseResults,
    testCases: args.testCases,
    ...jobMediaPayload(job.id, "hybrid"),
  });
}

async function finishTestCase(args: {
  job: BridgeJob;
  tc: TestCaseSpec;
  tcIndex: number;
  tcTotal: number;
  screenshotBaseline: number;
  result: TestCaseAgentResult;
  status: TestCaseStatus;
  emit: (msg: AgentJobMessage) => void;
  videoUrls: string[];
  videoRecordingMeta: VideoRecordingMeta[];
  testCaseResults: TestCaseResult[];
  testCases: TestCaseSpec[];
  stopMode?: TestCaseCleanupMode;
  mobileConfig?: BridgeJob["mobileConfig"];
}): Promise<{ videoMeta?: VideoRecordingMeta; testCaseResult: TestCaseResult }> {
  const {
    job,
    tc,
    tcIndex,
    tcTotal,
    screenshotBaseline,
    result,
    status,
    emit,
    videoUrls,
    videoRecordingMeta,
    testCaseResults,
    testCases,
    stopMode,
    mobileConfig,
  } = args;

  const tcMobileConfig = mobileConfigForTestCase(tc, mobileConfig);
  const stopResult = await stopSegmentRecording(job.id, tc.id, tc.platform, {
    stopMode: tc.platform === "browser" ? "in-process" : stopMode,
    mobileConfig: tcMobileConfig ?? mobileConfig,
  });

  emitTestCaseProgress(emit, job, {
    testCaseIndex: tcIndex,
    testCaseTotal: tcTotal,
    testCaseId: tc.id,
    testCasePlatform: tc.platform,
    testCaseStatus: "running",
    message:
      tc.platform === "browser"
        ? `${tc.id} — selesai (screenshot; video digabung di akhir mission)`
        : `${tc.id} — menyelesaikan recording…`,
    videoUrls: [...videoUrls],
    videoRecordingMeta: [...videoRecordingMeta],
    testCaseResults: [...testCaseResults],
    testCases,
  });

  // Browser mission: one continuous video at job end — not per-TC mp4.
  const serveUrl =
    tc.platform === "browser"
      ? undefined
      : agentVideoServeUrl(job.id, testCaseVideoFilenameForId(tc.id));
  const videoMeta = serveUrl
    ? buildVideoMeta(tc, serveUrl, stopResult.warning)
    : undefined;

  const safeJobId = sanitizeJobId(job.id);
  const screenshots = screenshotsForTestCase({
    allFiles: listAgentScreenshotFiles(job.id),
    testCaseId: tc.id,
    baseline: screenshotBaseline,
    toServeUrl: (file) =>
      `/api/agent-screenshots/${encodeURIComponent(safeJobId)}/${encodeURIComponent(file)}`,
  });

  const screenshotNote =
    screenshots.length === 0
      ? "Screenshot tidak berhasil diambil selama pengujian ini berjalan."
      : undefined;

  const testCaseResult: TestCaseResult = {
    testCaseId: tc.id,
    title: tc.title ?? tc.id,
    platform: tc.platform,
    status,
    summary: result.error ?? result.summary,
    screenshots: screenshots.length ? screenshots : undefined,
    videoUrl: serveUrl ?? undefined,
    label: videoMeta?.label,
    scenario: result.judgeScenario,
    stepsPerformed: result.judgeStepsPerformed,
    expectedResult: result.judgeExpectedResult,
    actualResult: result.judgeActualResult,
    conclusion: result.judgeConclusion,
    failureReason: result.judgeFailureReason,
    suggestion: result.judgeSuggestion,
    screenshotNote,
    technicalDetail: result.error && result.error !== result.summary ? result.error : undefined,
  };

  return { videoMeta, testCaseResult };
}

export async function runMultiTestCaseJob(ctx: {
  job: BridgeJob;
  testCases: TestCaseSpec[];
  runAgentForTestCase: TestCaseAgentRunner;
  emit: (msg: AgentJobMessage) => void;
  isCancelled: () => boolean;
  mcpClient?: Client;
  stopMode?: TestCaseCleanupMode;
  flowReplay?: {
    judge?: { creds: OpenaiCredentials; model: string };
    toolRecording?: RecordedToolCall[];
  };
}): Promise<OrchestratorResult> {
  const { job, testCases, runAgentForTestCase, emit, isCancelled, stopMode, flowReplay } = ctx;
  const tcTotal = testCases.length;
  let handoff: HandoffState = {};
  const videoUrls: string[] = [];
  const videoRecordingMeta: VideoRecordingMeta[] = [];
  const testCaseResults: TestCaseResult[] = [];
  let failed = false;

  markJobSegmentManaged(job.id);
  setAutomationJobId(job.id);
  setApiDataJobToken(job.apiDataToken);

  const mcpClient =
    ctx.mcpClient ??
    (await connectAutomationMcp(job.id, "hybrid", job.mobileConfig, job.apiDataToken));

  const overview = buildHybridOverviewPrompt(testCases);

  try {
    for (let i = 0; i < testCases.length; i++) {
      if (isCancelled()) break;

      const tc = testCases[i]!;
      const tcMobileConfig = mobileConfigForTestCase(tc, job.mobileConfig);
      const screenshotBaseline = listAgentScreenshotFiles(job.id).length;

      if (tc.platform === "mobile" && tcMobileConfig) {
        setActiveTestCaseMobileConfig(job.id, tcMobileConfig);
      }

      emitTestCaseProgress(emit, job, {
        testCaseIndex: i,
        testCaseTotal: tcTotal,
        testCaseId: tc.id,
        testCasePlatform: tc.platform,
        testCaseStatus: "running",
        message: `Menjalankan ${tc.id} (${tc.platform})…`,
        videoUrls: [...videoUrls],
        videoRecordingMeta: [...videoRecordingMeta],
        testCaseResults: [...testCaseResults],
        testCases,
      });

      await startSegmentRecording(job.id, tc.id, tc.platform, tcMobileConfig);
      await ensureSegmentRecordingStarted(job.id);

      const prompt = buildTestCasePrompt({
        tc,
        handoff,
        channel: job.channel,
        strategy: job.strategy,
        mobileConfig: tcMobileConfig ?? job.mobileConfig,
        promptBasePaths: job.promptBasePaths,
        testCaseIndex: i,
        testCaseTotal: tcTotal,
        isMultiTest: true,
      });

      const promptWithOverview: AgentPromptInput = {
        ...prompt,
        text: `${overview}\n\n${prompt.text}`,
      };

      const memoryAppId = await resolveMemoryAppIdForJob({
        platform: tc.platform,
        text: tc.instruction,
        mobileConfig: tcMobileConfig ?? job.mobileConfig,
        apiDataToken: job.apiDataToken,
        promptBasePaths: job.promptBasePaths,
      });

      let result: TestCaseAgentResult;
      try {
        if (flowReplay?.toolRecording) {
          flowReplay.toolRecording.length = 0;
        }

        const replay = await tryFlowReplay({
          job,
          tc,
          mcpClient,
          memoryAppId,
          judge: flowReplay?.judge,
          onToolProgress: (toolName, toolArgs) => {
            emitTestCaseProgress(emit, job, {
              testCaseIndex: i,
              testCaseTotal: tcTotal,
              testCaseId: tc.id,
              testCasePlatform: tc.platform,
              testCaseStatus: "running",
              message: `TC ${i + 1}/${tcTotal} — flow replay: ${toolName}`,
              toolName,
              videoUrls: [...videoUrls],
              videoRecordingMeta: [...videoRecordingMeta],
              testCaseResults: [...testCaseResults],
              testCases,
            });
            void logAgentRunEvent({
              agentJobId: job.id,
              runId: job.runId,
              apiDataToken: job.apiDataToken,
              message: `TC ${i + 1}/${tcTotal} tool: ${toolName} ${summarizeToolArgs(toolArgs)}`.trim(),
            });
          },
        });

        if (replay.ok) {
          result = { summary: replay.summary };
        } else {
          result = await runAgentForTestCase({
            job,
            tc,
            tcIndex: i,
            tcTotal,
            prompt: promptWithOverview,
            mcpClient,
            handoff,
            isCancelled,
            onToolProgress: (toolName, toolArgs) => {
              emitTestCaseProgress(emit, job, {
                testCaseIndex: i,
                testCaseTotal: tcTotal,
                testCaseId: tc.id,
                testCasePlatform: tc.platform,
                testCaseStatus: "running",
                message: `TC ${i + 1}/${tcTotal} — ${toolName}`,
                toolName,
                videoUrls: [...videoUrls],
                videoRecordingMeta: [...videoRecordingMeta],
                testCaseResults: [...testCaseResults],
                testCases,
              });
              void logAgentRunEvent({
                agentJobId: job.id,
                runId: job.runId,
                apiDataToken: job.apiDataToken,
                message: `TC ${i + 1}/${tcTotal} tool: ${toolName} ${summarizeToolArgs(toolArgs)}`.trim(),
              });
            },
          });

          if (
            !result.error &&
            flowReplay?.toolRecording?.length &&
            memoryAppId
          ) {
            const precondition = buildPreconditionFromToolCalls(tc.platform, flowReplay.toolRecording);
            const playbook = buildPlaybookFromRecording({
              platform: tc.platform,
              toolCalls: flowReplay.toolRecording,
              precondition,
              variables: Object.keys(tc.variables ?? {}),
            });
            if (playbook) {
              const existingContent = await loadMemoryContent({
                platform: tc.platform,
                appId: memoryAppId,
                apiDataToken: job.apiDataToken,
              });
              await persistPlaybookSection({
                platform: tc.platform,
                appId: memoryAppId,
                sectionKey: defaultSectionKeyForTestCase(tc),
                playbook,
                apiDataToken: job.apiDataToken,
                existingContent,
              }).catch(() => undefined);
            }
          }
        }
      } catch (error) {
        result = {
          summary: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }

      if (isCancelled()) {
        const finished = await finishTestCase({
          job,
          tc,
          tcIndex: i,
          tcTotal,
          screenshotBaseline,
          result: { summary: "Dibatalkan pengguna." },
          status: "error",
          emit,
          videoUrls,
          videoRecordingMeta,
          testCaseResults,
          testCases,
          stopMode,
          mobileConfig: job.mobileConfig,
        });
        testCaseResults.push(finished.testCaseResult);
        if (finished.videoMeta) {
          videoUrls.push(finished.videoMeta.url);
          videoRecordingMeta.push(finished.videoMeta);
        }
        break;
      }

      // The runner not throwing only means it stopped calling tools — it
      // does NOT mean the test case's stated goal was achieved (the
      // agent's own summary was previously the only signal). Verify
      // against the final screenshot before accepting "completed".
      if (!result.error && flowReplay?.judge) {
        const judged = await judgeTestCaseOutcomeWithLlm({
          creds: flowReplay.judge.creds,
          model: flowReplay.judge.model,
          instruction: tc.instruction,
          agentSummary: result.summary,
          screenshotBase64: result.lastScreenshot,
        });
        // Always carry structured judge fields into result for user-friendly reporting
        result = {
          ...result,
          judgeScenario: judged.scenario,
          judgeStepsPerformed: judged.stepsPerformed,
          judgeExpectedResult: judged.expectedResult,
          judgeActualResult: judged.actualResult,
          judgeConclusion: judged.conclusion,
          judgeFailureReason: judged.failureReason,
          judgeSuggestion: judged.suggestion,
        };
        if (!judged.passed) {
          result = { ...result, error: judged.reason };
        }
      }

      if (result.error) {
        failed = true;
        const finished = await finishTestCase({
          job,
          tc,
          tcIndex: i,
          tcTotal,
          screenshotBaseline,
          result,
          status: "error",
          emit,
          videoUrls,
          videoRecordingMeta,
          testCaseResults,
          testCases,
          stopMode,
          mobileConfig: job.mobileConfig,
        });
        testCaseResults.push(finished.testCaseResult);
        if (finished.videoMeta) {
          videoUrls.push(finished.videoMeta.url);
          videoRecordingMeta.push(finished.videoMeta);
        }

        emitTestCaseProgress(emit, job, {
          testCaseIndex: i,
          testCaseTotal: tcTotal,
          testCaseId: tc.id,
          testCasePlatform: tc.platform,
          testCaseStatus: "error",
          message: `${tc.id} gagal: ${result.error}`,
          videoUrls: [...videoUrls],
          videoRecordingMeta: [...videoRecordingMeta],
          testCaseResults: [...testCaseResults],
          testCases,
        });

        for (let j = i + 1; j < testCases.length; j++) {
          const skipped = testCases[j]!;
          const skippedResult: TestCaseResult = {
            testCaseId: skipped.id,
            title: skipped.title ?? skipped.id,
            platform: skipped.platform,
            status: "skipped",
            summary: "Dilewati karena test case sebelumnya gagal",
          };
          testCaseResults.push(skippedResult);
          emitTestCaseProgress(emit, job, {
            testCaseIndex: j,
            testCaseTotal: tcTotal,
            testCaseId: skipped.id,
            testCasePlatform: skipped.platform,
            testCaseStatus: "skipped",
            message: `${skipped.id} dilewati`,
            videoUrls: [...videoUrls],
            videoRecordingMeta: [...videoRecordingMeta],
            testCaseResults: [...testCaseResults],
            testCases,
          });
        }
        break;
      }

      handoff = mergeHandoffState(handoff, extractHandoffFromText(result.summary));

      const finished = await finishTestCase({
        job,
        tc,
        tcIndex: i,
        tcTotal,
        screenshotBaseline,
        result,
        status: "completed",
        emit,
        videoUrls,
        videoRecordingMeta,
        testCaseResults,
        testCases,
        stopMode,
        mobileConfig: job.mobileConfig,
      });
      testCaseResults.push(finished.testCaseResult);
      if (finished.videoMeta) {
        videoUrls.push(finished.videoMeta.url);
        videoRecordingMeta.push(finished.videoMeta);
      }

      emitTestCaseProgress(emit, job, {
        testCaseIndex: i,
        testCaseTotal: tcTotal,
        testCaseId: tc.id,
        testCasePlatform: tc.platform,
        testCaseStatus: "completed",
        message: `${tc.id} selesai`,
        videoUrls: [...videoUrls],
        videoRecordingMeta: [...videoRecordingMeta],
        testCaseResults: [...testCaseResults],
        testCases,
      });
    }

    const summary = buildMultiTestCaseSummaryMarkdown(testCaseResults);
    const resultMarkdown = buildMultiTestCaseResultMarkdown(testCaseResults);
    const combinedSummary = resultMarkdown
      ? `${summary}\n\n${resultMarkdown}`
      : summary;

    return {
      summary: combinedSummary,
      resultMarkdown,
      testCaseResults,
      videoUrls,
      videoRecordingMeta,
      handoff,
      failed,
    };
  } finally {
    clearJobSegmentManaged(job.id);
    if (!ctx.mcpClient) {
      await mcpClient.close().catch(() => undefined);
    }
  }
}
