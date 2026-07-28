import { Agent } from "@cursor/sdk";
import type { TestCaseAgentRunner } from "./test-case-orchestrator.js";
import { buildCursorSdkMessage } from "../prompts/prompt-builder.js";
import config from "../../agents/cursor/config.js";
import { resolveMonorepoRoot } from "../../config/paths.js";
import {
  automationMcpSpawnArgs,
  cursorHybridMcpServerConfig,
  resolveAutomationMcpPath,
  resolveMobileMcpPath,
} from "../mcp/automation-mcp-config.js";
import { devicePool } from "../../platforms/mobile/driver/device-pool.js";
import {
  setMobileJobConfig,
  setMobileJobUdid,
} from "../../platforms/mobile/session/mobile-job-context.js";
import type { MobileConfig } from "@knitto/shared";

export type CursorTestCaseRunnerHandle = {
  runAgentForTestCase: TestCaseAgentRunner;
  dispose: () => Promise<void>;
};

export function createCursorTestCaseRunner(
  jobId: string,
  modelId: string,
  acquiredUdid?: string,
  mobileConfig?: MobileConfig,
  apiDataToken?: string
): CursorTestCaseRunnerHandle {
  const browserMcpPath = resolveAutomationMcpPath();
  const mobileMcpPath = resolveMobileMcpPath();
  const spawnBrowser = automationMcpSpawnArgs({
    command: config.automationMcpCommand,
    mcpPath: browserMcpPath,
  });
  const spawnMobile = automationMcpSpawnArgs({
    command: config.automationMcpCommand,
    mcpPath: mobileMcpPath,
  });

  const resolvedMobile =
    mobileConfig?.appPackage
      ? {
          ...mobileConfig,
          udid: acquiredUdid ?? mobileConfig.udid,
        }
      : undefined;

  const mcpServers = cursorHybridMcpServerConfig({
    browserCommand: spawnBrowser.command,
    browserArgs: spawnBrowser.args,
    mobileCommand: spawnMobile.command,
    mobileArgs: spawnMobile.args,
    cwd: resolveMonorepoRoot(),
    jobId,
    mobileConfig: resolvedMobile,
    segmentManaged: true,
    apiDataToken,
  });

  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;
  let activeRunCancel: (() => Promise<void>) | null = null;

  async function releaseAgent(): Promise<void> {
    if (activeRunCancel) {
      await activeRunCancel().catch(() => undefined);
      activeRunCancel = null;
    }
    if (agent) {
      const disposeFn = agent[Symbol.asyncDispose];
      if (typeof disposeFn === "function") {
        await disposeFn.call(agent).catch(() => undefined);
      }
      agent = null;
    }
  }

  async function ensureAgent() {
    if (!agent) {
      agent = await Agent.create({
        apiKey: config.cursorApiKey!,
        model: { id: modelId },
        local: {
          cwd: config.bridgeCwd,
          settingSources: [],
        },
        mcpServers,
      });
    }
    return agent;
  }

  const runAgentForTestCase: TestCaseAgentRunner = async ({
    prompt,
    isCancelled,
    onToolProgress,
  }) => {
    if (isCancelled()) {
      return { summary: "", error: "cancelled" };
    }

    try {
      const currentAgent = await ensureAgent();
      const sendMessage = buildCursorSdkMessage(prompt);
      let summary = "";

      const run = await currentAgent.send(sendMessage, {
        model: { id: modelId },
        mcpServers,
        onDelta: ({ update }) => {
          if (update.type === "tool-call-started") {
            const tc = update.toolCall;
            const toolName = tc.type === "mcp" ? (tc.args.toolName ?? undefined) : undefined;
            if (toolName) onToolProgress(toolName);
          }
          if (update.type === "summary") {
            summary = update.summary;
          }
        },
      });

      activeRunCancel = async () => {
        await run.cancel().catch(() => undefined);
      };

      const result = await run.wait();
      activeRunCancel = null;

      if (result.status === "error") {
        return { summary: "", error: "Cursor agent run failed" };
      }

      const finalSummary =
        summary ||
        (typeof result.result === "string"
          ? result.result
          : JSON.stringify(result.result ?? "Selesai."));

      return { summary: finalSummary.trim() || "Selesai." };
    } finally {
      await releaseAgent();
    }
  };

  const dispose = async (): Promise<void> => {
    await releaseAgent();
  };

  return { runAgentForTestCase, dispose };
}

export async function acquireCursorHybridDevice(
  jobId: string,
  mobileConfig?: MobileConfig
): Promise<string | undefined> {
  if (!mobileConfig?.appPackage?.trim()) return undefined;
  setMobileJobConfig(jobId, mobileConfig);
  // udid omitted / empty → device pool Auto
  const udid = await devicePool.acquire(jobId, mobileConfig.udid);
  setMobileJobUdid(jobId, udid);
  return udid;
}
