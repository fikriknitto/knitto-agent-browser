import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { BridgeJob, TestCaseSpec } from "@knitto/shared";
import type { OpenaiCredentials } from "../../agents/openai/config.js";
import { defaultSectionKeyForTestCase } from "../prompts/prompt-builder.js";
import { resolveMemoryAppIdForJob } from "../memory/resolve-memory-app-id-for-job.js";
import { loadPlaybookForSection } from "./load-playbook.js";
import {
  matchBrowserPrecondition,
  matchMobilePrecondition,
  type BrowserSnapshot,
  type MobileSnapshot,
} from "./match-precondition.js";
import { judgePreconditionWithLlm } from "./llm-judge.js";
import { replayPlaybookSteps } from "./replay-runner.js";
import { createLogger } from "../logging.js";

const logger = createLogger("flow-replay");

export type FlowReplayResult =
  | { ok: true; summary: string; mode: "replay" }
  | { ok: false; reason: string };

async function captureSnapshot(
  mcpClient: Client,
  platform: TestCaseSpec["platform"]
): Promise<BrowserSnapshot | MobileSnapshot> {
  if (platform === "mobile") {
    const result = await mcpClient.callTool({
      name: "mobile_get_screen_snapshot",
      arguments: {},
    });
    return parseToolJson<MobileSnapshot>(result);
  }
  const result = await mcpClient.callTool({
    name: "browser_get_page_snapshot",
    arguments: {},
  });
  return parseToolJson<BrowserSnapshot>(result);
}

function parseToolJson<T>(result: unknown): T {
  if (!result || typeof result !== "object") {
    throw new Error("Empty MCP tool result");
  }
  const record = result as Record<string, unknown>;
  if (record.structuredContent && typeof record.structuredContent === "object") {
    return record.structuredContent as T;
  }
  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return JSON.parse(part.text) as T;
      }
    }
  }
  return record as T;
}

export async function tryFlowReplay(args: {
  job: BridgeJob;
  tc: TestCaseSpec;
  mcpClient: Client;
  memoryAppId?: string;
  onToolProgress?: (toolName: string, args?: Record<string, unknown>) => void;
  judge?: { creds: OpenaiCredentials; model: string };
  signal?: AbortSignal;
}): Promise<FlowReplayResult> {
  const appId =
    args.tc.memoryAppId?.trim() ||
    args.memoryAppId?.trim() ||
    (await resolveMemoryAppIdForJob({
      platform: args.tc.platform,
      text: args.tc.instruction,
      mobileConfig: args.job.mobileConfig,
      apiDataToken: args.job.apiDataToken,
    }));

  if (!appId) {
    return { ok: false, reason: "no_memory_app_id" };
  }

  const sectionKey = defaultSectionKeyForTestCase(args.tc);
  const playbook = await loadPlaybookForSection({
    platform: args.tc.platform,
    appId,
    sectionKey,
    apiDataToken: args.job.apiDataToken,
  });

  if (!playbook) {
    return { ok: false, reason: "no_playbook" };
  }

  if (playbook.platform !== args.tc.platform) {
    return { ok: false, reason: "platform_mismatch" };
  }

  let snapshot: BrowserSnapshot | MobileSnapshot;
  try {
    snapshot = await captureSnapshot(args.mcpClient, args.tc.platform);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  let matchStatus =
    args.tc.platform === "mobile"
      ? matchMobilePrecondition(playbook, snapshot as MobileSnapshot)
      : matchBrowserPrecondition(playbook, snapshot as BrowserSnapshot);

  if (matchStatus === "ambiguous" && args.judge) {
    try {
      const judged = await judgePreconditionWithLlm({
        creds: args.judge.creds,
        model: args.judge.model,
        playbook,
        snapshot,
        signal: args.signal,
      });
      matchStatus = judged;
    } catch (error) {
      logger.warn(
        `LLM judge failed, treating as mismatch: ${error instanceof Error ? error.message : String(error)}`
      );
      matchStatus = "mismatch";
    }
  } else if (matchStatus === "ambiguous") {
    matchStatus = "mismatch";
  }

  if (matchStatus !== "match") {
    return { ok: false, reason: `precondition_${matchStatus}` };
  }

  const variables = args.tc.variables ?? {};
  const replay = await replayPlaybookSteps({
    mcpClient: args.mcpClient,
    playbook,
    variables,
    onStep: (tool) => args.onToolProgress?.(tool),
  });

  if (!replay.ok) {
    logger.info(
      `Replay failed at step ${replay.failedStep ?? "?"} (${replay.tool ?? "?"}): ${replay.reason}`
    );
    return { ok: false, reason: replay.reason };
  }

  return {
    ok: true,
    mode: "replay",
    summary: `Flow replay berhasil (${replay.stepsExecuted} langkah) untuk ${args.tc.id} menggunakan memory playbook.`,
  };
}
