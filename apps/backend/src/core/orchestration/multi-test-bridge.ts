import type { AgentJobMessage, BridgeJob, TestCaseSpec } from "@knitto/shared";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { setAutomationJobId } from "../job-context.js";
import {
  connectAutomationMcp,
  disconnectAutomationMcpJobContext,
} from "../mcp/automation-mcp-client.js";

import { cleanupJobAttachments } from "../evidence/persist-attachments.js";

import { jobMediaPayloadAsync } from "../evidence/job-media-payload.js";

import { agentMessages } from "./agent-messages.js";

import type { TestCaseAgentRunner } from "./test-case-orchestrator.js";

import { runMultiTestCaseJob } from "./test-case-orchestrator.js";

import { cleanupJobPlatforms, type TestCaseCleanupMode } from "./test-case-cleanup.js";

import type { CursorTestCaseRunnerHandle } from "./multi-test-cursor.js";

import { createRecordingMcpClient } from "../flow-replay/recording-mcp-client.js";
import type { RecordedToolCall } from "../flow-replay/record-playbook.js";
import type { OpenaiCredentials } from "../../agents/openai/config.js";



export type TestCaseRunnerFactoryResult =

  | TestCaseAgentRunner

  | CursorTestCaseRunnerHandle;



function normalizeRunner(created: TestCaseRunnerFactoryResult): {

  runAgentForTestCase: TestCaseAgentRunner;

  dispose?: () => Promise<void>;

} {

  if (typeof created === "function") {

    return { runAgentForTestCase: created };

  }

  return { runAgentForTestCase: created.runAgentForTestCase, dispose: created.dispose };

}



export async function executeMultiTestBridgeJob(ctx: {

  job: BridgeJob;

  testCases: TestCaseSpec[];

  emit: (msg: AgentJobMessage) => void;

  isCancelled: () => boolean;

  createRunner: (mcpClient: Client) => TestCaseRunnerFactoryResult;

  startingMessage: string;

  cleanupMode?: TestCaseCleanupMode;

  flowReplayJudge?: { creds: OpenaiCredentials; model: string };

}): Promise<"completed" | "error" | "cancelled"> {

  const { job, testCases, emit, isCancelled, createRunner, startingMessage, cleanupMode, flowReplayJudge } = ctx;



  emit({

    type: "agent_job",

    id: job.id,

    channel: job.channel,

    status: "running",

    message: startingMessage,

    progress: 5,

    testCaseTotal: testCases.length,

    testCases,

  });



  setAutomationJobId(job.id);

  const toolRecording: RecordedToolCall[] = [];

  const rawMcpClient = await connectAutomationMcp(
    job.id,
    "hybrid",
    job.mobileConfig,
    job.apiDataToken
  );

  const mcpClient = createRecordingMcpClient(rawMcpClient, toolRecording);

  const runner = normalizeRunner(createRunner(mcpClient));



  try {

    const result = await runMultiTestCaseJob({

      job,

      testCases,

      mcpClient,

      isCancelled,

      emit,

      runAgentForTestCase: runner.runAgentForTestCase,

      stopMode: cleanupMode,

      flowReplay: {
        toolRecording,
        judge: flowReplayJudge,
      },

    });



    if (isCancelled()) {
      await cleanupJobPlatforms({
        mcpClient,
        jobId: job.id,
        testCases,
        mobileConfig: job.mobileConfig,
        cleanupMode,
      }).catch(() => undefined);

      const media = await jobMediaPayloadAsync(job.id, "hybrid");

      emit({

        type: "agent_job",

        id: job.id,

        channel: job.channel,

        status: "cancelled",

        message: agentMessages.cancelled,

        ...media,

        videoUrls: result.videoUrls,

        videoRecordingMeta: result.videoRecordingMeta,

        testCaseResults: result.testCaseResults,

        ...(result.testCaseResults.length
          ? {
              testCaseIndex: result.testCaseResults.length - 1,
              testCaseStatus: result.testCaseResults[result.testCaseResults.length - 1]!.status,
            }
          : {}),

        testCases,

      });

      return "cancelled";

    }



    // Finalize Playwright continuous video before collecting media URLs.
    await cleanupJobPlatforms({
      mcpClient,
      jobId: job.id,
      testCases,
      mobileConfig: job.mobileConfig,
      cleanupMode,
    }).catch(() => undefined);

    const media = await jobMediaPayloadAsync(job.id, "hybrid");

    if (result.failed) {

      emit({

        type: "agent_job",

        id: job.id,

        channel: job.channel,

        status: "error",

        message: "Satu atau lebih test case gagal.",

        progress: 100,

        result: result.summary,

        ...media,

        videoUrls: result.videoUrls.length ? result.videoUrls : media.videoUrls,

        videoRecordingMeta: result.videoRecordingMeta,

        testCaseResults: result.testCaseResults,

        ...(result.testCaseResults.length
          ? {
              testCaseIndex: result.testCaseResults.length - 1,
              testCaseStatus: result.testCaseResults[result.testCaseResults.length - 1]!.status,
            }
          : {}),

        testCases,

      });

      return "error";

    }



    emit({

      type: "agent_job",

      id: job.id,

      channel: job.channel,

      status: "completed",

      message: agentMessages.completed,

      progress: 100,

      result: result.summary,

      ...media,

      videoUrls: result.videoUrls.length ? result.videoUrls : media.videoUrls,

      videoRecordingMeta: result.videoRecordingMeta,

      testCaseResults: result.testCaseResults,

      // Keep these in sync with the last entry of testCaseResults — the FE
      // merges WS messages with `??` fallback (merge-agent-chat-line.ts), so
      // leaving these undefined lets a stale earlier "running" value survive
      // past this terminal message.
      ...(result.testCaseResults.length
        ? {
            testCaseIndex: result.testCaseResults.length - 1,
            testCaseStatus: result.testCaseResults[result.testCaseResults.length - 1]!.status,
          }
        : {}),

      testCases,

    });

    return "completed";

  } finally {

    await cleanupJobPlatforms({
      mcpClient,
      jobId: job.id,
      testCases,
      mobileConfig: job.mobileConfig,
      cleanupMode,
    }).catch(() => undefined);

    await runner.dispose?.().catch(() => undefined);

    disconnectAutomationMcpJobContext();

    await mcpClient.close().catch(() => undefined);

    await cleanupJobAttachments(job.id);

  }

}

