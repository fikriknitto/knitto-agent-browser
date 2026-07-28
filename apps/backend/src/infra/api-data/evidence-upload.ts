import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BridgeJob } from "@knitto/shared";
import { resolveAgentScreenshotDirForJob } from "../../core/job-context.js";
import { createLogger } from "../../core/logging.js";
import { jobMediaPayloadAsync } from "../../core/evidence/job-media-payload.js";
import { logAgentRunEvent } from "../../core/orchestration/run-event-log.js";
import {
  getAgentRunByJobId,
  linkAgentRunMedia,
  uploadAgentMedia,
} from "./agent-runs-client.js";
import { rememberEvidenceUploadToken } from "./evidence-upload-token-registry.js";

const logger = createLogger("api-data-evidence");

const PNG = /\.png$/i;
const MP4 = /\.mp4$/i;
export const EVIDENCE_MANIFEST_NAME = ".evidence-upload.json";

export type EvidenceFileStatus = "pending" | "uploaded" | "failed";

export type EvidenceManifestFile = {
  name: string;
  role: "screenshot" | "video";
  caseOrder: number | null;
  status: EvidenceFileStatus;
  mediaId?: number;
  attempts: number;
  lastError?: string;
};

export type EvidenceUploadManifest = {
  agentJobId: string;
  runId: number;
  updatedAt: string;
  files: EvidenceManifestFile[];
};

export type EvidenceUploadResult = {
  screenshots: string[];
  videoUrls: string[];
  pending: boolean;
  uploadedCount: number;
  failedCount: number;
};

function guessContentType(name: string): string {
  if (PNG.test(name)) return "image/png";
  if (MP4.test(name)) return "video/mp4";
  return "application/octet-stream";
}

function parseCaseOrder(name: string): number | null {
  const m = name.match(/tc-(\d+)/i) || name.match(/^(\d+)-/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Resolve case order from tc-NN regex or job.testCases id prefix (mission-item-*, etc.). */
export function resolveEvidenceCaseOrder(
  name: string,
  testCases?: Array<{ id: string }> | null
): number | null {
  const fromName = parseCaseOrder(name);
  if (fromName != null) return fromName;
  if (!testCases?.length) return null;
  const base = name.replace(/\.(png|mp4)$/i, "");
  for (let i = 0; i < testCases.length; i += 1) {
    const id = testCases[i]!.id.trim();
    if (!id) continue;
    if (
      base === id ||
      base.startsWith(`${id}-`) ||
      name.startsWith(`${id}.`) ||
      name.startsWith(`${id}-`)
    ) {
      return i + 1;
    }
  }
  return null;
}

export function evidenceManifestPath(jobId: string): string {
  return join(resolveAgentScreenshotDirForJob(jobId), EVIDENCE_MANIFEST_NAME);
}

export function readEvidenceManifest(jobId: string): EvidenceUploadManifest | null {
  const path = evidenceManifestPath(jobId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as EvidenceUploadManifest;
  } catch {
    return null;
  }
}

export function writeEvidenceManifest(manifest: EvidenceUploadManifest): void {
  const dir = resolveAgentScreenshotDirForJob(manifest.agentJobId);
  if (!existsSync(dir)) return;
  const path = join(dir, EVIDENCE_MANIFEST_NAME);
  writeFileSync(path, JSON.stringify(manifest, null, 2), "utf8");
}

function mergeManifestFiles(
  existing: EvidenceManifestFile[] | undefined,
  diskFiles: string[],
  testCases?: Array<{ id: string }> | null
): EvidenceManifestFile[] {
  const byName = new Map((existing ?? []).map((f) => [f.name, f]));
  const next: EvidenceManifestFile[] = [];

  for (const name of diskFiles) {
    const prev = byName.get(name);
    const caseOrder =
      name.toLowerCase() === (process.env.AUTOMATION_VIDEO_FILENAME?.trim() || "recording.mp4").toLowerCase()
        ? null
        : resolveEvidenceCaseOrder(name, testCases);
    if (prev) {
      next.push({
        ...prev,
        caseOrder: prev.caseOrder ?? caseOrder,
      });
      continue;
    }
    next.push({
      name,
      role: MP4.test(name) ? "video" : "screenshot",
      caseOrder,
      status: "pending",
      attempts: 0,
    });
  }
  return next;
}

async function uploadOneFile(opts: {
  token: string;
  runId: number;
  agentJobId: string;
  file: EvidenceManifestFile;
}): Promise<EvidenceManifestFile> {
  const { token, runId, agentJobId, file } = opts;
  if (file.status === "uploaded" && file.mediaId != null) {
    return file;
  }

  const dir = resolveAgentScreenshotDirForJob(agentJobId);
  const filePath = join(dir, file.name);
  if (!existsSync(filePath)) {
    return {
      ...file,
      status: "failed",
      lastError: "file missing on disk",
      attempts: file.attempts + 1,
    };
  }

  const updated = { ...file, attempts: file.attempts + 1 };

  try {
    let mediaId = file.mediaId;
    if (mediaId == null) {
      const uploaded = await uploadAgentMedia(token, {
        filePath,
        fileName: file.name,
        contentType: guessContentType(file.name),
        runId,
        caseOrder: file.caseOrder ?? undefined,
        source: "worker_evidence",
      });
      mediaId = uploaded.mediaId;
    }

    await linkAgentRunMedia(token, runId, {
      mediaId,
      role: file.role,
      caseOrder: file.caseOrder,
    });

    return {
      ...updated,
      mediaId,
      status: "uploaded",
      lastError: undefined,
    };
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    return {
      ...updated,
      status: "failed",
      lastError,
    };
  }
}

/**
 * Upload local job screenshots/videos to API Data MinIO and link to the run.
 * Writes `.evidence-upload.json` so failed files can be flushed later.
 * Failures are logged only — never fail the agent job.
 */
export async function uploadJobEvidenceToApiData(
  job: BridgeJob
): Promise<EvidenceUploadResult> {
  const empty: EvidenceUploadResult = {
    screenshots: [],
    videoUrls: [],
    pending: false,
    uploadedCount: 0,
    failedCount: 0,
  };

  const token = job.apiDataToken?.trim();
  let runId = job.runId;
  if (!token) return empty;

  if (runId == null) {
    const found = await getAgentRunByJobId(token, job.id);
    if (found?.runId != null) {
      runId = found.runId;
      job.runId = found.runId;
    }
  }
  if (runId == null) {
    logger.child({ agentJobId: job.id }).warn("Skip evidence upload — no runId");
    return empty;
  }

  rememberEvidenceUploadToken(job.id, token, runId);

  const dir = resolveAgentScreenshotDirForJob(job.id);
  if (!existsSync(dir)) return empty;

  // Wait for late video flush before scanning directory.
  try {
    await jobMediaPayloadAsync(job.id, job.platform ?? "browser");
  } catch {
    // best-effort
  }

  const diskFiles = readdirSync(dir).filter((n) => PNG.test(n) || MP4.test(n));
  if (!diskFiles.length) return empty;

  const existing = readEvidenceManifest(job.id);
  const files = mergeManifestFiles(existing?.files, diskFiles, job.testCases);
  const jobLog = logger.child({ agentJobId: job.id, runId });

  const screenshots: string[] = [];
  const videoUrls: string[] = [];
  let uploadedCount = 0;
  let failedCount = 0;

  const nextFiles: EvidenceManifestFile[] = [];
  for (const file of files) {
    const result = await uploadOneFile({
      token,
      runId,
      agentJobId: job.id,
      file,
    });
    nextFiles.push(result);

    if (result.status === "uploaded" && result.mediaId != null) {
      uploadedCount += 1;
      const contentUrl = `${process.env.API_DATA_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8009"}/agent/media/${result.mediaId}/content`;
      if (result.role === "video") videoUrls.push(contentUrl);
      else screenshots.push(contentUrl);
    } else if (result.status !== "uploaded") {
      failedCount += 1;
      jobLog.warn(`Evidence upload failed file=${result.name}: ${result.lastError ?? "unknown"}`);
    }
  }

  const pending = nextFiles.some((f) => f.status !== "uploaded");
  const manifest: EvidenceUploadManifest = {
    agentJobId: job.id,
    runId,
    updatedAt: new Date().toISOString(),
    files: nextFiles,
  };
  writeEvidenceManifest(manifest);

  if (uploadedCount || failedCount) {
    jobLog.info(
      `Evidence sync shots=${screenshots.length} videos=${videoUrls.length} uploaded=${uploadedCount} failed=${failedCount} pending=${pending}`
    );
  }

  if (pending) {
    void logAgentRunEvent({
      agentJobId: job.id,
      runId,
      apiDataToken: token,
      level: "WARNING",
      message: `Evidence upload pending (${failedCount} file(s)) — will retry from local buffer`,
    });
  } else if (uploadedCount) {
    void logAgentRunEvent({
      agentJobId: job.id,
      runId,
      apiDataToken: token,
      level: "INFO",
      message: `Evidence uploaded (${uploadedCount} file(s))`,
    });
  }

  return { screenshots, videoUrls, pending, uploadedCount, failedCount };
}

/**
 * Retry pending/failed files for a job using an in-memory token.
 */
export async function flushEvidenceManifestForJob(
  agentJobId: string,
  token: string,
  runId: number
): Promise<EvidenceUploadResult> {
  return uploadJobEvidenceToApiData({
    id: agentJobId,
    channel: "flush",
    text: "",
    runId,
    apiDataToken: token,
  });
}
