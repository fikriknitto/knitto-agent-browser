import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ToolError } from "../../core/index.js";
import config from "../config.js";

export function sanitizeAppId(appId: string): string {
  const safe = appId.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!safe) throw new ToolError("appId is invalid after sanitization");
  return safe;
}

function memoryPath(appId: string): string {
  mkdirSync(config.memoryDir, { recursive: true });
  return join(config.memoryDir, `${sanitizeAppId(appId)}.md`);
}

export type AppMemoryListItem = {
  appId: string;
  updatedAt: string;
  sizeBytes: number;
  preview: string;
};

export function listAppMemories(): AppMemoryListItem[] {
  mkdirSync(config.memoryDir, { recursive: true });
  const entries = readdirSync(config.memoryDir, { withFileTypes: true });
  const items: AppMemoryListItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const appId = entry.name.slice(0, -3);
    const path = join(config.memoryDir, entry.name);
    const stat = statSync(path);
    const content = readFileSync(path, "utf8");
    const preview = content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0)
      ?.slice(0, 120) ?? "";

    items.push({
      appId,
      updatedAt: stat.mtime.toISOString(),
      sizeBytes: stat.size,
      preview,
    });
  }

  return items.sort((a, b) => a.appId.localeCompare(b.appId));
}

export function readAppMemory(appId: string): {
  appId: string;
  content: string;
  exists: boolean;
  path: string;
} {
  const path = memoryPath(appId);
  const exists = existsSync(path);
  const content = exists ? readFileSync(path, "utf8") : "";
  return { appId: sanitizeAppId(appId), content, exists, path };
}

export function writeAppMemory(
  appId: string,
  content: string,
  mode: "append" | "replace"
): { appId: string; path: string; mode: "append" | "replace"; bytesWritten: number } {
  const path = memoryPath(appId);
  const safeId = sanitizeAppId(appId);
  const body = content.endsWith("\n") ? content : `${content}\n`;

  if (mode === "replace" || !existsSync(path)) {
    writeFileSync(path, body, "utf8");
    return { appId: safeId, path, mode, bytesWritten: Buffer.byteLength(body, "utf8") };
  }

  const prefix = readFileSync(path, "utf8").endsWith("\n") ? "" : "\n";
  appendFileSync(path, `${prefix}${body}`, "utf8");
  return {
    appId: safeId,
    path,
    mode,
    bytesWritten: Buffer.byteLength(`${prefix}${body}`, "utf8"),
  };
}

export function deleteAppMemory(appId: string): { appId: string; path: string } {
  const path = memoryPath(appId);
  const safeId = sanitizeAppId(appId);
  if (!existsSync(path)) {
    throw new ToolError(`App memory not found: ${safeId}`);
  }
  unlinkSync(path);
  return { appId: safeId, path };
}
