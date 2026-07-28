import { existsSync } from "node:fs";
import type { MobileConfig, TestCasePlatform } from "@knitto/shared";
import { testCaseVideoFilenameForId } from "@knitto/shared";
import type { Browser } from "webdriverio";
import { createLogger } from "../logging.js";
import {
  getOpenPage,
  isRecordablePageUrl,
} from "../../platforms/browser/driver/session.js";
import {
  ensureBrowserSegmentRecording,
  resolveAgentVideoPath,
  stopBrowserSegment,
} from "../../platforms/browser/driver/recording.js";
import config from "../../platforms/browser/config.js";
import mobileConfig from "../../platforms/mobile/config.js";
import {
  getDriver,
  hasActiveSession,
  openDriver,
} from "../../platforms/mobile/driver/session.js";
import { getMobileJobConfig } from "../../platforms/mobile/session/mobile-job-context.js";
import {
  ensureMobileSegmentRecording,
  setSegmentRecordingManaged,
  stopMobileSegment,
} from "../../platforms/mobile/session/recording.js";
import { setAutomationJobId } from "../job-context.js";
import {
  clearJobSegmentManaged as clearSegmentContext,
  clearPendingSegment,
  clearSegmentStarted,
  getPendingSegment,
  isJobSegmentManaged,
  isSegmentStarted,
  markJobSegmentManaged as markSegmentContext,
  markSegmentStarted,
  setActiveTestCaseId,
  setPendingSegment,
} from "./segment-context.js";
import {
  clearActiveSegment,
  clearSegmentStopRequest,
  readSegmentStateFile,
  requestSegmentStop,
  waitForSegmentInactive,
} from "./segment-state-file.js";
import {
  callCursorSubprocessTool,
  type CursorMcpToolResult,
} from "../mcp/cursor-mcp-tool-runner.js";
import type { TestCaseCleanupMode } from "../orchestration/test-case-cleanup.js";

const logger = createLogger("segment-recording");

const APP_VISIBLE_POLL_MS = 200;
const APP_VISIBLE_TIMEOUT_MS = 5000;

export type StopSegmentResult = {
  path?: string;
  warning?: string;
};

export { isJobSegmentManaged };

export function markJobSegmentManaged(jobId: string): void {
  markSegmentContext(jobId);
  setSegmentRecordingManaged(jobId, true);
}

export function clearJobSegmentManaged(jobId: string): void {
  clearSegmentContext(jobId);
  setSegmentRecordingManaged(jobId, false);
}

function isRecordingEnabled(): boolean {
  return config.recordVideo || mobileConfig.recordVideo;
}

async function waitForAppVisible(
  driver: Browser,
  appPackage: string,
  timeoutMs = APP_VISIBLE_TIMEOUT_MS
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const currentPackage = await driver.getCurrentPackage();
      if (currentPackage === appPackage) return true;
    } catch {
      // app may not be foreground yet
    }
    await new Promise((resolve) => setTimeout(resolve, APP_VISIBLE_POLL_MS));
  }
  return false;
}

async function tryStartBrowserSegment(jobId: string, testCaseId: string): Promise<boolean> {
  const openPage = getOpenPage();
  if (!openPage) {
    logger.info(`Browser segment deferred for ${testCaseId} — no open page yet`);
    return false;
  }

  if (!isRecordablePageUrl(openPage.url())) {
    logger.info(
      `Browser segment deferred for ${testCaseId} — page not navigated (${openPage.url()})`
    );
    return false;
  }

  try {
    const started = await ensureBrowserSegmentRecording(openPage, jobId);
    if (started) {
      markSegmentStarted(jobId, testCaseId);
      logger.info(`Browser segment started after navigate: tc=${testCaseId}`);
      return true;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`Browser segment not ready for ${testCaseId}: ${msg}`);
  }
  return false;
}

async function tryStartMobileSegment(jobId: string, testCaseId: string): Promise<boolean> {
  if (!hasActiveSession(jobId)) {
    logger.info(`Mobile segment deferred for ${testCaseId} — no active session`);
    return false;
  }

  const mobileCfg = getMobileJobConfig(jobId);
  if (!mobileCfg?.appPackage) {
    logger.info(`Mobile segment deferred for ${testCaseId} — app package not configured`);
    return false;
  }

  try {
    const driver = await openDriver();
    const visible = await waitForAppVisible(driver, mobileCfg.appPackage);
    if (!visible) {
      logger.warn(
        `Mobile app ${mobileCfg.appPackage} not foreground before segment start — recording anyway`
      );
    }

    const started = await ensureMobileSegmentRecording(driver, jobId);
    if (started) {
      markSegmentStarted(jobId, testCaseId);
      logger.info(`Mobile segment started after launch: tc=${testCaseId}`);
      return true;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`Mobile segment not ready for ${testCaseId}: ${msg}`);
  }
  return false;
}

export async function ensureSegmentRecordingStarted(jobId: string): Promise<boolean> {
  const pending = getPendingSegment(jobId);
  if (!pending || isSegmentStarted(jobId, pending.testCaseId)) {
    return isSegmentStarted(jobId, pending?.testCaseId ?? "");
  }

  setAutomationJobId(jobId);
  const { testCaseId, platform } = pending;

  if (platform === "browser") {
    return tryStartBrowserSegment(jobId, testCaseId);
  }

  return tryStartMobileSegment(jobId, testCaseId);
}

export async function startSegmentRecording(
  jobId: string,
  testCaseId: string,
  platform: TestCasePlatform,
  mobileConfig?: MobileConfig
): Promise<void> {
  if (!isRecordingEnabled()) return;

  setAutomationJobId(jobId);
  setActiveTestCaseId(testCaseId);
  const filename = testCaseVideoFilenameForId(testCaseId);

  setPendingSegment(jobId, {
    testCaseId,
    filename,
    platform,
    mobileConfig: platform === "mobile" ? mobileConfig : undefined,
  });
  logger.info(`Segment deferred: job=${jobId} tc=${testCaseId} platform=${platform}`);
}

async function stopSegmentInProcess(
  jobId: string,
  testCaseId: string,
  platform: TestCasePlatform
): Promise<string | undefined> {
  if (platform === "browser") {
    const path = await stopBrowserSegment();
    if (path) clearActiveSegment(jobId);
    return path;
  }

  if (!hasActiveSession(jobId)) return undefined;

  const driver = await getDriver();
  const filename = testCaseVideoFilenameForId(testCaseId);
  const path = await stopMobileSegment(driver, jobId, filename);
  if (path) clearActiveSegment(jobId);
  return path;
}

async function stopSegmentViaCursorSubprocess(
  jobId: string,
  testCaseId: string,
  platform: TestCasePlatform,
  mobileConfig?: MobileConfig
): Promise<CursorMcpToolResult> {
  // Browser uses continuous Playwright video — never spawn subprocess stop per TC.
  if (platform === "browser") {
    clearActiveSegment(jobId);
    return { stopped: true };
  }

  requestSegmentStop(jobId, testCaseId);

  const result = await callCursorSubprocessTool({
    jobId,
    server: "mobile",
    toolName: "mobile_stop_test_case_segment",
    arguments: { testCaseId },
    mobileConfig,
  });

  const inactive = await waitForSegmentInactive(jobId, testCaseId);
  if (!inactive) {
    logger.warn(`Segment stop timed out for ${testCaseId} — video may be incomplete`);
  }

  clearSegmentStopRequest(jobId);

  const filename = testCaseVideoFilenameForId(testCaseId);
  const expectedPath = resolveAgentVideoPath(jobId, filename);

  if (!result.path && existsSync(expectedPath)) {
    return { ...result, path: expectedPath, stopped: true };
  }

  return result;
}

export async function stopSegmentRecording(
  jobId: string,
  testCaseId: string,
  platform: TestCasePlatform,
  opts?: { stopMode?: TestCaseCleanupMode; mobileConfig?: MobileConfig }
): Promise<StopSegmentResult> {
  if (!isRecordingEnabled()) return {};

  setAutomationJobId(jobId);

  // Browser: continuous mission video — bookkeeping only, no per-TC file.
  if (platform === "browser") {
    clearPendingSegment(jobId);
    clearSegmentStarted(jobId, testCaseId);
    setActiveTestCaseId(null);
    clearActiveSegment(jobId);
    return {};
  }

  let warning: string | undefined;
  if (!isSegmentStarted(jobId, testCaseId)) {
    warning = `Segment recording for ${testCaseId} never started — video may be missing or black`;
    logger.warn(warning);
  }

  let path: string | undefined;
  const stopMode = opts?.stopMode ?? "in-process";

  if (stopMode === "cursor-subprocess") {
    const remote = await stopSegmentViaCursorSubprocess(
      jobId,
      testCaseId,
      platform,
      opts?.mobileConfig
    );
    path = remote.path;
    if (remote.warning) warning = warning ? `${warning}; ${remote.warning}` : remote.warning;
  } else {
    path = await stopSegmentInProcess(jobId, testCaseId, platform);
  }

  const state = readSegmentStateFile(jobId);
  if (!path && state?.active?.testCaseId === testCaseId && state.active.outputPath) {
    path = existsSync(state.active.outputPath) ? state.active.outputPath : undefined;
  }

  clearPendingSegment(jobId);
  clearSegmentStarted(jobId, testCaseId);
  setActiveTestCaseId(null);
  clearActiveSegment(jobId);

  return { path, warning };
}
