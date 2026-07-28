import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { copyFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { platform as osPlatform } from "node:os";
import { spawn } from "node:child_process";
import type { Page } from "playwright";
import { createLogger } from "../../mcp-kit/core/index.js";
import {
  getAutomationJobId,
  resolveAgentScreenshotDir,
  resolveAgentScreenshotDirForJob,
} from "../../../core/job-context.js";
import {
  getPendingSegment,
  isSegmentStarted,
  markSegmentStarted,
} from "../../../core/evidence/segment-context.js";
import { clearActiveSegment, setActiveSegment } from "../../../core/evidence/segment-state-file.js";
import config from "../config.js";
import { buildVideoFilterChain } from "./video-filter.js";

const logger = createLogger("browser-recording");

const MIN_VIDEO_BYTES = 10_240;

/** Continuous mission/job recording (Playwright context.recordVideo). */
let recordingActive = false;
let videoDir: string | null = null;
let finalizedPath: string | null = null;
let stopPromise: Promise<string | undefined> | null = null;
let headlessWarningLogged = false;

function logHeadlessBlackScreenRisk(): void {
  if (headlessWarningLogged || !config.headless) return;
  if (osPlatform() === "win32") {
    logger.warn(
      "AUTOMATION_HEADLESS=true on Windows — set AUTOMATION_HEADLESS=false for clearer recordings"
    );
  }
  headlessWarningLogged = true;
}

function logFfmpegPathWarning(): void {
  if (config.ffmpegPath) return;
  logger.warn(
    "AUTOMATION_FFMPEG_PATH not set — video speed/transcode may fail if ffmpeg is not on PATH"
  );
}

export function resolveAgentVideoPath(jobId?: string, filename?: string): string {
  const name = filename ?? config.videoFilename;
  const dir = jobId
    ? resolveAgentScreenshotDirForJob(jobId)
    : resolveAgentScreenshotDir();
  return join(dir, name);
}

/** Ensure job dir exists for Playwright recordVideo output. */
export function prepareVideoDir(jobId: string): string {
  const dir = resolveAgentScreenshotDirForJob(jobId);
  mkdirSync(dir, { recursive: true });
  videoDir = dir;
  recordingActive = true;
  logHeadlessBlackScreenRisk();
  logFfmpegPathWarning();
  logger.info(`Playwright recordVideo dir ready: ${dir}`);
  return dir;
}

export function isJobRecording(): boolean {
  return recordingActive;
}

export function isSegmentMode(): boolean {
  return false;
}

async function waitForVideoFile(
  filePath: string,
  timeoutMs = 12_000,
  intervalMs = 150
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;

  while (Date.now() < deadline) {
    try {
      const stats = await stat(filePath);
      if (stats.size > 0) {
        if (stats.size === lastSize) return true;
        lastSize = stats.size;
      }
    } catch {
      // not ready
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return existsSync(filePath);
}

export async function waitForJobVideoReady(
  jobId: string,
  timeoutMs = 12_000
): Promise<void> {
  if (!config.recordVideo) return;
  const path = resolveAgentVideoPath(jobId);
  await waitForVideoFile(path, timeoutMs);
}

function runFfmpeg(args: string[]): Promise<void> {
  const bin = config.ffmpegPath || "ffmpeg";
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

async function probeVideoDurationSec(inputPath: string): Promise<number | undefined> {
  const bin = config.ffmpegPath || "ffmpeg";
  return new Promise((resolve) => {
    const child = spawn(bin, ["-i", inputPath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", () => resolve(undefined));
    child.on("close", () => {
      const match = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(stderr);
      if (!match) {
        resolve(undefined);
        return;
      }
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      if (!Number.isFinite(hours + minutes + seconds)) {
        resolve(undefined);
        return;
      }
      resolve(hours * 3600 + minutes * 60 + seconds);
    });
  });
}

async function transcodeVideo(inputPath: string, outputPath: string): Promise<void> {
  const filter = buildVideoFilterChain({
    speed: config.videoSpeed,
    trimIdle: config.videoTrimIdle,
  });

  if (!filter) {
    if (inputPath !== outputPath) {
      await copyFile(inputPath, outputPath);
    }
    return;
  }

  const tmp = `${outputPath}.tmp.mp4`;
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-filter:v",
    filter,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    tmp,
  ]);
  if (existsSync(outputPath)) unlinkSync(outputPath);
  renameSync(tmp, outputPath);
}

function findNewestRecordedFile(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir).filter((n) => /\.(webm|mp4)$/i.test(n));
  let best: string | null = null;
  let bestMtime = 0;
  for (const name of candidates) {
    if (name === config.videoFilename) continue;
    const full = join(dir, name);
    try {
      const m = statSync(full).mtimeMs;
      if (m >= bestMtime) {
        bestMtime = m;
        best = full;
      }
    } catch {
      // skip
    }
  }
  if (best) return best;
  const fallback = join(dir, config.videoFilename);
  return existsSync(fallback) ? fallback : null;
}

/**
 * Multi-TC browser: one continuous Playwright video per mission (bookkeeping only).
 */
export async function ensureBrowserSegmentRecording(
  page: Page,
  jobId: string
): Promise<boolean> {
  const pending = getPendingSegment(jobId);
  if (!pending || pending.platform !== "browser") return false;
  if (isSegmentStarted(jobId, pending.testCaseId)) return true;

  const pageUrl = page.url();
  if (pageUrl === "about:blank" || !pageUrl.trim()) {
    return false;
  }

  await startJobRecording(page);
  markSegmentStarted(jobId, pending.testCaseId);
  setActiveSegment(jobId, {
    testCaseId: pending.testCaseId,
    filename: config.videoFilename,
    outputPath: resolveAgentVideoPath(jobId),
    platform: "browser",
    startedAt: new Date().toISOString(),
  });
  logger.info(`Browser continuous recording active for mission TC ${pending.testCaseId}`);
  return true;
}

export async function startJobRecording(_page: Page): Promise<void> {
  if (!config.recordVideo) return;
  const jobId = getAutomationJobId();
  if (!jobId) return;

  if (!recordingActive || !videoDir) {
    prepareVideoDir(jobId);
  }
  recordingActive = true;
}

/**
 * Finalize Playwright video after context.close() (caller must close context first).
 * Converts newest webm/mp4 in video dir → recording.mp4 at AUTOMATION_VIDEO_SPEED.
 */
export async function finalizePlaywrightVideo(jobId?: string): Promise<string | undefined> {
  const id = jobId ?? getAutomationJobId();
  if (!id || !config.recordVideo) return finalizedPath ?? undefined;

  const dir = videoDir ?? resolveAgentScreenshotDirForJob(id);
  const outPath = resolveAgentVideoPath(id);

  await new Promise((r) => setTimeout(r, 500));

  const source = findNewestRecordedFile(dir);
  if (!source) {
    if (existsSync(outPath)) return outPath;
    logger.warn(`No Playwright video file found in ${dir}`);
    return undefined;
  }

  try {
    const durationBefore = await probeVideoDurationSec(source);
    await transcodeVideo(source, outPath);
    const durationAfter = await probeVideoDurationSec(outPath);
    if (source !== outPath && existsSync(source)) {
      try {
        unlinkSync(source);
      } catch {
        // keep raw if delete fails
      }
    }
    const ready = await waitForVideoFile(outPath);
    if (ready) {
      const fileStats = await stat(outPath);
      const trimLabel = config.videoTrimIdle ? "trim+speed" : "speed";
      const durationNote =
        durationBefore != null && durationAfter != null
          ? `, duration ${durationBefore.toFixed(1)}s→${durationAfter.toFixed(1)}s`
          : "";
      logger.info(
        `Recording saved: ${outPath} (${fileStats.size} bytes, ${trimLabel}=${config.videoSpeed}x${durationNote})`
      );
      if (fileStats.size < MIN_VIDEO_BYTES) {
        logger.warn(`Recording file suspiciously small (${fileStats.size} bytes): ${outPath}`);
      }
      finalizedPath = outPath;
      clearActiveSegment(id);
      return outPath;
    }
  } catch (error) {
    logger.warn(
      `Video finalize/speed failed: ${error instanceof Error ? error.message : String(error)}`
    );
    try {
      if (source !== outPath) await copyFile(source, outPath);
      finalizedPath = outPath;
      return outPath;
    } catch {
      return existsSync(source) ? source : undefined;
    }
  }

  return existsSync(outPath) ? outPath : undefined;
}

async function finalizeStop(): Promise<string | undefined> {
  const jobId = getAutomationJobId();
  recordingActive = false;
  const path = await finalizePlaywrightVideo(jobId ?? undefined);
  videoDir = null;
  return path;
}

/**
 * Call after BrowserContext.close() so Playwright has flushed the webm.
 */
export async function stopJobRecording(): Promise<string | undefined> {
  if (stopPromise) return stopPromise;

  stopPromise = finalizeStop().finally(() => {
    stopPromise = null;
  });

  return stopPromise;
}

export async function startBrowserSegment(
  page: Page,
  jobId: string,
  _filename: string
): Promise<void> {
  await startJobRecording(page);
  logger.info(`startBrowserSegment redirected to continuous recording job=${jobId}`);
}

/**
 * Per-TC stop is a no-op for browser video (continuous until job end).
 */
export async function stopBrowserSegment(): Promise<string | undefined> {
  const jobId = getAutomationJobId();
  if (jobId) clearActiveSegment(jobId);
  logger.info("browser stopBrowserSegment no-op (continuous mission video)");
  return undefined;
}
