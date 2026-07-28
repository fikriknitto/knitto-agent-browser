import type { AgentMission } from "@/lib/api/api-data-missions-api";
import type { ChatLine } from "@/types/automation";

export type MissionItemRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "skipped";

export type MissionRunSummary = {
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  running: number;
  total: number;
  isTerminal: boolean;
  activeIndex: number | null;
};

function testCaseIdToIndex(testCaseId: string): number | null {
  const match = /^tc-(\d+)$/i.exec(testCaseId.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n - 1 : null;
}

function isTerminalJobStatus(status: ChatLine["status"]): boolean {
  return status === "completed" || status === "error" || status === "cancelled";
}

export function findActiveMissionJobLine(
  chatLines: ChatLine[],
  mission: AgentMission | null,
  fallbackJobId?: string | null
): ChatLine | undefined {
  if (!mission) return undefined;

  const jobId = mission.agentJobId ?? fallbackJobId ?? null;
  if (!jobId) return undefined;

  const agentLines = chatLines.filter((l) => l.role === "agent" && l.id === jobId);
  if (!agentLines.length) return undefined;

  return agentLines[agentLines.length - 1];
}

export function deriveMissionItemStatuses(
  itemCount: number,
  line: ChatLine | undefined
): MissionItemRunStatus[] {
  if (itemCount <= 0) return [];

  const statuses: MissionItemRunStatus[] = Array.from({ length: itemCount }, () => "pending");

  if (line?.testCaseResults?.length) {
    for (const tc of line.testCaseResults) {
      const index = testCaseIdToIndex(tc.testCaseId);
      if (index == null || index >= itemCount) continue;
      if (tc.status === "completed") statuses[index] = "completed";
      else if (tc.status === "error") statuses[index] = "error";
      else if (tc.status === "skipped") statuses[index] = "skipped";
      else if (tc.status === "running") statuses[index] = "running";
    }
  }

  const activeIndex = line?.testCaseIndex;
  const tcStatus = line?.testCaseStatus;
  const jobFailed = line?.status === "error" || tcStatus === "error";
  const hasResults = Boolean(line?.testCaseResults?.length);
  const jobTerminal = isTerminalJobStatus(line?.status);

  // Once the job has reached a terminal status, testCaseResults[] above is
  // the authoritative, always-fully-populated source (the job's terminal WS
  // message doesn't refresh testCaseIndex/testCaseStatus — see
  // multi-test-bridge.ts). Applying this overlay on top of it after
  // terminal risks stomping an already-correct "completed" back to a stale
  // "running" if a late/out-of-order progress message left those scalar
  // fields behind. Only apply the overlay pre-terminal, or as a fallback
  // when there's no testCaseResults data at all to derive from.
  if (!jobTerminal || !hasResults) {
    if (activeIndex != null && activeIndex >= 0 && activeIndex < itemCount) {
      if (tcStatus === "running") {
        statuses[activeIndex] = "running";
      } else if (tcStatus === "completed") {
        statuses[activeIndex] = "completed";
      } else if (tcStatus === "error") {
        statuses[activeIndex] = "error";
      } else if (tcStatus === "skipped") {
        statuses[activeIndex] = "skipped";
      } else if (
        (line?.status === "queued" || line?.status === "running") &&
        statuses[activeIndex] === "pending"
      ) {
        statuses[activeIndex] = "running";
      }
    } else if (!hasResults) {
      const fallbackIndex = 0;
      if (tcStatus === "running") statuses[fallbackIndex] = "running";
      else if (tcStatus === "completed") statuses[fallbackIndex] = "completed";
      else if (tcStatus === "error") statuses[fallbackIndex] = "error";
      else if (tcStatus === "skipped") statuses[fallbackIndex] = "skipped";
      else if (line?.status === "queued" || line?.status === "running") {
        statuses[fallbackIndex] = "running";
      }
    }
  }

  if (jobFailed && activeIndex != null) {
    for (let index = activeIndex + 1; index < itemCount; index++) {
      if (statuses[index] === "pending") statuses[index] = "skipped";
    }
  }

  return statuses;
}

export function summarizeMissionRun(
  statuses: MissionItemRunStatus[],
  line: ChatLine | undefined
): MissionRunSummary {
  const total = statuses.length;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let pending = 0;
  let running = 0;

  for (const s of statuses) {
    if (s === "completed") passed += 1;
    else if (s === "error") failed += 1;
    else if (s === "skipped") skipped += 1;
    else if (s === "running") running += 1;
    else pending += 1;
  }

  const runningIndex = statuses.findIndex((s) => s === "running");
  const activeIndex = running > 0 && runningIndex >= 0 ? runningIndex : null;

  return {
    passed,
    failed,
    skipped,
    pending,
    running,
    total,
    isTerminal: Boolean(line && isTerminalJobStatus(line.status)),
    activeIndex,
  };
}
