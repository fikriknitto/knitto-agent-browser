import type { MobileConfig, TestCasePlatform } from "@knitto/shared";
import { getAutomationJobId } from "../job-context.js";
import {
  deleteSegmentStateFile,
  readSegmentStateFile,
  updateSegmentStateFile,
  type SegmentStateFile,
} from "./segment-state-file.js";

export type PendingSegment = {
  testCaseId: string;
  filename: string;
  platform: TestCasePlatform;
  mobileConfig?: MobileConfig;
};

const managedJobs = new Set<string>();
const pendingByJob = new Map<string, PendingSegment>();
const startedSegments = new Set<string>();
let activeTestCaseId: string | null = null;

function segmentKey(jobId: string, testCaseId: string): string {
  return `${jobId}:${testCaseId}`;
}

function syncFromFile(jobId: string): SegmentStateFile | null {
  const file = readSegmentStateFile(jobId);
  if (!file) return null;

  if (file.managed) managedJobs.add(jobId);
  if (file.pending) pendingByJob.set(jobId, file.pending);
  else pendingByJob.delete(jobId);

  for (const tcId of file.startedTestCases) {
    startedSegments.add(segmentKey(jobId, tcId));
  }
  activeTestCaseId = file.activeTestCaseId;
  return file;
}

export function markJobSegmentManaged(jobId: string): void {
  managedJobs.add(jobId);
  updateSegmentStateFile(jobId, (state) => ({ ...state, managed: true }));
}

export function isJobSegmentManaged(jobId: string): boolean {
  if (managedJobs.has(jobId)) return true;
  if (process.env.AUTOMATION_MULTI_TC === "1" || process.env.MOBILE_MULTI_TC === "1") {
    return true;
  }
  const file = readSegmentStateFile(jobId);
  if (file?.managed) {
    managedJobs.add(jobId);
    return true;
  }
  return false;
}

/** Active segment bookkeeping (memory + state file only — not MULTI_TC env). */
export function isJobSegmentActive(jobId: string): boolean {
  if (managedJobs.has(jobId)) return true;
  const file = readSegmentStateFile(jobId);
  if (file?.managed) {
    managedJobs.add(jobId);
    return true;
  }
  return false;
}

export function isMultiTcCloseBlocked(jobId?: string | null): boolean {
  if (process.env.AUTOMATION_FORCE_CLOSE === "1" || process.env.MOBILE_FORCE_CLOSE === "1") {
    return false;
  }
  if (jobId) {
    return isJobSegmentActive(jobId);
  }
  return process.env.AUTOMATION_MULTI_TC === "1" || process.env.MOBILE_MULTI_TC === "1";
}

export function clearJobSegmentManaged(jobId: string): void {
  managedJobs.delete(jobId);
  pendingByJob.delete(jobId);
  for (const key of startedSegments) {
    if (key.startsWith(`${jobId}:`)) startedSegments.delete(key);
  }
  if (activeTestCaseId && readSegmentStateFile(jobId)?.activeTestCaseId === activeTestCaseId) {
    activeTestCaseId = null;
  }
  deleteSegmentStateFile(jobId);
}

export function setPendingSegment(jobId: string, segment: PendingSegment): void {
  pendingByJob.set(jobId, segment);
  updateSegmentStateFile(jobId, (state) => ({
    ...state,
    managed: true,
    pending: segment,
  }));
}

export function getPendingSegment(jobId: string): PendingSegment | undefined {
  syncFromFile(jobId);
  return pendingByJob.get(jobId) ?? readSegmentStateFile(jobId)?.pending ?? undefined;
}

export function clearPendingSegment(jobId: string): void {
  pendingByJob.delete(jobId);
  updateSegmentStateFile(jobId, (state) => ({ ...state, pending: null }));
}

export function markSegmentStarted(jobId: string, testCaseId: string): void {
  startedSegments.add(segmentKey(jobId, testCaseId));
  updateSegmentStateFile(jobId, (state) => {
    const started = new Set(state.startedTestCases);
    started.add(testCaseId);
    return { ...state, startedTestCases: [...started] };
  });
}

export function isSegmentStarted(jobId: string, testCaseId: string): boolean {
  syncFromFile(jobId);
  if (startedSegments.has(segmentKey(jobId, testCaseId))) return true;
  return readSegmentStateFile(jobId)?.startedTestCases.includes(testCaseId) ?? false;
}

export function clearSegmentStarted(jobId: string, testCaseId: string): void {
  startedSegments.delete(segmentKey(jobId, testCaseId));
  updateSegmentStateFile(jobId, (state) => ({
    ...state,
    startedTestCases: state.startedTestCases.filter((id) => id !== testCaseId),
  }));
}

export function setActiveTestCaseId(testCaseId: string | null): void {
  activeTestCaseId = testCaseId?.trim() || null;
  const jobId = getAutomationJobId();
  if (jobId) {
    updateSegmentStateFile(jobId, (state) => ({
      ...state,
      activeTestCaseId: activeTestCaseId,
    }));
  }
}

export function getActiveTestCaseId(): string | null {
  const jobId = getAutomationJobId();
  if (jobId) {
    const file = readSegmentStateFile(jobId);
    if (file?.activeTestCaseId) return file.activeTestCaseId;
  }
  return activeTestCaseId;
}
