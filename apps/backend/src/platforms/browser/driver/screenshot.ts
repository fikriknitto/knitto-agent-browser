import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import config from "../config.js";
import { resolveAgentScreenshotDir } from "../../../core/job-context.js";
import {
  getActiveTestCaseId,
  isJobSegmentManaged,
} from "../../../core/evidence/segment-context.js";
import { getAutomationJobId } from "../../../core/job-context.js";
import { getPage } from "./session.js";

function resolveScreenshotFileName(customPath?: string): string {
  const jobId = getAutomationJobId();
  const testCaseId = getActiveTestCaseId();
  const usePrefix = jobId && testCaseId && isJobSegmentManaged(jobId);

  if (!customPath?.trim()) {
    const base = `shot-${Date.now()}-${randomBytes(3).toString("hex")}.png`;
    return usePrefix ? `${testCaseId}-${base}` : base;
  }

  const raw = customPath.trim().replace(/[/\\:\0]/g, "_").replace(/\.\./g, "_");
  const base = basename(raw) || "screenshot.png";
  const withExt = base.toLowerCase().endsWith(".png") ? base : `${base}.png`;
  if (usePrefix && !withExt.startsWith(`${testCaseId}-`)) {
    return `${testCaseId}-${withExt}`;
  }
  return withExt;
}

function resolveScreenshotPath(customPath?: string): string {
  const dir = resolveAgentScreenshotDir(config.screenshotDir);
  return join(dir, resolveScreenshotFileName(customPath));
}

export function saveAgentScreenshotBuffer(buffer: Buffer, customPath?: string): string {
  const filePath = resolveScreenshotPath(customPath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
  return filePath;
}

export async function takePageScreenshot(args: {
  fullPage: boolean;
  path?: string;
}): Promise<{ path: string; base64: string; mimeType: "image/png" }> {
  const page = await getPage();
  const filePath = resolveScreenshotPath(args.path);
  mkdirSync(dirname(filePath), { recursive: true });

  const buffer = await page.screenshot({
    fullPage: args.fullPage,
    type: "png",
  });

  writeFileSync(filePath, buffer);

  return {
    path: filePath,
    base64: Buffer.from(buffer).toString("base64"),
    mimeType: "image/png",
  };
}
