import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AutomationPlatform } from "@knitto/shared";
import config from "../../platforms/browser/config.js";
import mobileConfig from "../../platforms/mobile/config.js";
import {
  resolveAgentScreenshotDirForJob,
  sanitizeJobId,
} from "../../core/job-context.js";

const MP4_EXT = /\.mp4$/i;
const TC_VIDEO_RE = /^tc-\d+\.mp4$/i;
const SAFE_VIDEO_NAME_RE = /^[a-zA-Z0-9._-]+\.mp4$/i;

const allowedVideoFilenames = () =>
  new Set([config.videoFilename, mobileConfig.videoFilename]);

function isAllowedJobVideoFilename(safeName: string): boolean {
  if (!SAFE_VIDEO_NAME_RE.test(safeName)) return false;
  if (allowedVideoFilenames().has(safeName)) return true;
  if (TC_VIDEO_RE.test(safeName)) return true;
  // Mission / custom segment ids (e.g. mission-item-13.mp4)
  return true;
}

export function resolveAgentVideoFile(jobId: string, filename: string): string | null {
  const safeName = filename.trim();
  if (!safeName || !MP4_EXT.test(safeName)) return null;
  if (!isAllowedJobVideoFilename(safeName)) return null;

  const filePath = join(resolveAgentScreenshotDirForJob(jobId), safeName);
  if (!existsSync(filePath)) return null;
  return filePath;
}

export function listAgentVideoFilenames(jobId: string): string[] {
  const dir = resolveAgentScreenshotDirForJob(jobId);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => isAllowedJobVideoFilename(name))
    .sort((a, b) => {
      const aTc = TC_VIDEO_RE.test(a);
      const bTc = TC_VIDEO_RE.test(b);
      if (aTc && bTc) return a.localeCompare(b);
      if (aTc) return -1;
      if (bTc) return 1;
      return a.localeCompare(b);
    });
}

export function agentVideoServeUrls(jobId: string): string[] {
  const safeJobId = sanitizeJobId(jobId);
  return listAgentVideoFilenames(jobId).map(
    (filename) =>
      `/api/agent-videos/${encodeURIComponent(safeJobId)}/${encodeURIComponent(filename)}`
  );
}

export function agentVideoServeUrl(
  jobId: string,
  filenameOrPlatform?: string | AutomationPlatform
): string | undefined {
  const safeJobId = sanitizeJobId(jobId);

  if (filenameOrPlatform === "browser" || filenameOrPlatform === "mobile" || filenameOrPlatform === "hybrid") {
    const filename =
      filenameOrPlatform === "mobile" ? mobileConfig.videoFilename : config.videoFilename;
    const filePath = join(resolveAgentScreenshotDirForJob(jobId), filename);
    if (!existsSync(filePath)) {
      const tcVideos = listAgentVideoFilenames(jobId).filter((n) => TC_VIDEO_RE.test(n));
      if (tcVideos.length) {
        return `/api/agent-videos/${encodeURIComponent(safeJobId)}/${encodeURIComponent(tcVideos[0]!)}`;
      }
      return undefined;
    }
    return `/api/agent-videos/${encodeURIComponent(safeJobId)}/${encodeURIComponent(filename)}`;
  }

  const filename = filenameOrPlatform ?? config.videoFilename;
  const filePath = join(resolveAgentScreenshotDirForJob(jobId), filename);
  if (!existsSync(filePath)) return undefined;
  return `/api/agent-videos/${encodeURIComponent(safeJobId)}/${encodeURIComponent(filename)}`;
}
