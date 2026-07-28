import "dotenv/config";
import { join } from "node:path";
import { resolveMemoryDir, resolveMonorepoRoot, resolveScreenshotDir } from "../../config/paths.js";

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export default {
  get headless() {
    return envBool("AUTOMATION_HEADLESS", false);
  },
  get slowMoMs() {
    return envInt("AUTOMATION_SLOW_MO_MS", 0);
  },
  get browserTimeoutMs() {
    return envInt("AUTOMATION_BROWSER_TIMEOUT_MS", 30_000);
  },
  get memoryDir() {
    return resolveMemoryDir();
  },
  get screenshotDir() {
    return resolveScreenshotDir();
  },
  get uploadDir() {
    const fromEnv = process.env.AUTOMATION_UPLOAD_DIR?.trim();
    if (fromEnv) return join(resolveMonorepoRoot(), fromEnv);
    return join(this.screenshotDir, "uploads");
  },
  get uploadMaxBytes() {
    return envInt("AUTOMATION_UPLOAD_MAX_BYTES", 10 * 1024 * 1024);
  },
  get viewportWidth() {
    return envInt("AUTOMATION_VIEWPORT_WIDTH", 1280);
  },
  get viewportHeight() {
    return envInt("AUTOMATION_VIEWPORT_HEIGHT", 720);
  },
  get snapshotMaxElements() {
    return envInt("AUTOMATION_SNAPSHOT_MAX_ELEMENTS", 100);
  },
  get recordVideo() {
    return envBool("AUTOMATION_RECORD_VIDEO", true);
  },
  get recordFps() {
    return envInt("AUTOMATION_RECORD_FPS", 25);
  },
  /** Playback speed for finalized mission/job video (1 = realtime). */
  get videoSpeed() {
    const n = Number(process.env.AUTOMATION_VIDEO_SPEED?.trim() || "1.5");
    return Number.isFinite(n) && n > 0 ? n : 1.5;
  },
  /** Drop duplicate/static frames via ffmpeg mpdecimate before speed-up. */
  get videoTrimIdle() {
    return envBool("AUTOMATION_VIDEO_TRIM_IDLE", true);
  },
  get ffmpegPath() {
    return process.env.AUTOMATION_FFMPEG_PATH?.trim() || undefined;
  },
  get videoFilename() {
    const name = process.env.AUTOMATION_VIDEO_FILENAME?.trim();
    return name || "recording.mp4";
  },
  get chromiumExecutablePath() {
    return (
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
      process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
      undefined
    );
  },
};
