import type { AgentJobMessage } from "@knitto/shared";
import type { ChatLine } from "./types";
import { isTerminalJobStatus } from "./active-jobs";

function mergeVideoUrls(
  prev?: string[],
  incoming?: string[]
): string[] | undefined {
  if (!incoming?.length) return prev;
  const merged = [...(prev ?? [])];
  for (const url of incoming) {
    if (!merged.includes(url)) merged.push(url);
  }
  return merged;
}

export function mergeAgentChatLine(msg: AgentJobMessage, prevLine?: ChatLine): ChatLine {
  const isTerminal = isTerminalJobStatus(msg.status);

  const text = isTerminal
    ? (msg.result ?? msg.message ?? prevLine?.text ?? "")
    : (msg.message || prevLine?.text || "Memproses…");

  const videoUrls = mergeVideoUrls(prevLine?.videoUrls, msg.videoUrls);

  return {
    id: msg.id,
    role: "agent",
    text,
    status: msg.status,
    progress: msg.progress ?? prevLine?.progress,
    screenshots: msg.screenshots ?? prevLine?.screenshots,
    videoUrl: msg.videoUrl ?? videoUrls?.[0] ?? prevLine?.videoUrl,
    videoUrls,
    videoRecordingMeta: msg.videoRecordingMeta ?? prevLine?.videoRecordingMeta,
    testCaseIndex: msg.testCaseIndex ?? prevLine?.testCaseIndex,
    testCaseTotal: msg.testCaseTotal ?? prevLine?.testCaseTotal,
    testCaseId: msg.testCaseId ?? prevLine?.testCaseId,
    testCasePlatform: msg.testCasePlatform ?? prevLine?.testCasePlatform,
    testCaseStatus: msg.testCaseStatus ?? prevLine?.testCaseStatus,
    testCases: msg.testCases ?? prevLine?.testCases,
    testCaseResults: msg.testCaseResults ?? prevLine?.testCaseResults,
    toolName: msg.toolName ?? prevLine?.toolName,
    runId: msg.runId ?? prevLine?.runId,
  };
}
