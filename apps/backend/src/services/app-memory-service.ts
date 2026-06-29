import { statSync } from "node:fs";
import {
  deleteAppMemory,
  listAppMemories,
  readAppMemory,
  sanitizeAppId,
  writeAppMemory,
} from "../automation/libs/memory/store.js";
import type {
  CreateAppMemoryBody,
  UpdateAppMemoryBody,
} from "../validators/app-memory-schemas.js";

export type AppMemoryDto = {
  appId: string;
  content: string;
  updatedAt: string;
  sizeBytes: number;
  preview: string;
};

export type AppMemorySummaryDto = {
  appId: string;
  updatedAt: string;
  sizeBytes: number;
  preview: string;
};

export class AppMemoryNotFoundError extends Error {
  constructor(appId: string) {
    super(`App memory not found: ${appId}`);
    this.name = "AppMemoryNotFoundError";
  }
}

export class AppMemoryConflictError extends Error {
  constructor(appId: string) {
    super(`App memory already exists: ${appId}`);
    this.name = "AppMemoryConflictError";
  }
}

function toDto(record: ReturnType<typeof readAppMemory>): AppMemoryDto {
  const stat = statSync(record.path);
  const preview = record.content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0)
    ?.slice(0, 120) ?? "";

  return {
    appId: record.appId,
    content: record.content,
    updatedAt: stat.mtime.toISOString(),
    sizeBytes: stat.size,
    preview,
  };
}

export function listAppMemorySummaries(): AppMemorySummaryDto[] {
  return listAppMemories();
}

export function getAppMemory(appId: string): AppMemoryDto {
  const record = readAppMemory(appId);
  if (!record.exists) {
    throw new AppMemoryNotFoundError(sanitizeAppId(appId));
  }
  return toDto(record);
}

export function createAppMemory(body: CreateAppMemoryBody): AppMemoryDto {
  const safeId = sanitizeAppId(body.appId);
  const existing = readAppMemory(safeId);
  if (existing.exists) {
    throw new AppMemoryConflictError(safeId);
  }
  writeAppMemory(safeId, body.content, "replace");
  return getAppMemory(safeId);
}

export function updateAppMemory(appId: string, body: UpdateAppMemoryBody): AppMemoryDto {
  const safeId = sanitizeAppId(appId);
  const existing = readAppMemory(safeId);
  if (!existing.exists) {
    throw new AppMemoryNotFoundError(safeId);
  }
  writeAppMemory(safeId, body.content, "replace");
  return getAppMemory(safeId);
}

export function removeAppMemory(appId: string): void {
  const safeId = sanitizeAppId(appId);
  const existing = readAppMemory(safeId);
  if (!existing.exists) {
    throw new AppMemoryNotFoundError(safeId);
  }
  deleteAppMemory(safeId);
}
