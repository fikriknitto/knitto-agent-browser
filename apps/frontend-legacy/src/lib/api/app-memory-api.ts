import { apiDataJsonAuthed, getStoredApiDataToken } from "./api-data-client";
import type {
  AppMemory,
  AppMemorySummary,
  AppMemoryUpdateInput,
  AppMemoryWriteInput,
} from "../app-memory/types";

type ApiMemorySummary = {
  appId: string
  scope?: string
  updatedAt: string
  sizeBytes: number
  preview: string
};

type ApiMemory = {
  appId: string
  scope?: string
  content: string
  updatedAt: string | null
  exists?: boolean
};

function toSummary(row: ApiMemorySummary): AppMemorySummary {
  return {
    appId: row.appId,
    updatedAt: row.updatedAt,
    sizeBytes: row.sizeBytes,
    preview: row.preview,
  };
}

function toMemory(row: ApiMemory): AppMemory {
  const content = row.content ?? "";
  return {
    appId: row.appId,
    content,
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    sizeBytes: new TextEncoder().encode(content).length,
    preview:
      content
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0)
        ?.slice(0, 120) ?? "",
  };
}

function requireToken(): void {
  if (!getStoredApiDataToken()) {
    throw new Error("Login API Data dulu untuk app memory.");
  }
}

export async function listAppMemoriesByScope(
  scope: "browser" | "mobile"
): Promise<AppMemorySummary[]> {
  requireToken();
  const rows = await apiDataJsonAuthed<ApiMemorySummary[]>(
    `/agent/app-memory?scope=${scope}`
  );
  return (rows ?? []).map(toSummary);
}

export async function getAppMemoryByScope(
  scope: "browser" | "mobile",
  appId: string
): Promise<AppMemory> {
  requireToken();
  const row = await apiDataJsonAuthed<ApiMemory>(
    `/agent/app-memory/${encodeURIComponent(appId)}?scope=${scope}`
  );
  return toMemory(row);
}

export async function putAppMemoryByScope(
  scope: "browser" | "mobile",
  appId: string,
  content: string,
  opts?: { mode?: "replace" | "upsert_section"; sectionKey?: string }
): Promise<AppMemory> {
  requireToken();
  const row = await apiDataJsonAuthed<ApiMemory>(
    `/agent/app-memory/${encodeURIComponent(appId)}`,
    {
      method: "PUT",
      body: {
        scope,
        content,
        mode: opts?.mode ?? "replace",
        ...(opts?.sectionKey ? { sectionKey: opts.sectionKey } : {}),
      },
    }
  );
  return toMemory(row);
}

export async function deleteAppMemoryByScope(
  scope: "browser" | "mobile",
  appId: string
): Promise<void> {
  requireToken();
  await apiDataJsonAuthed(`/agent/app-memory/${encodeURIComponent(appId)}?scope=${scope}`, {
    method: "DELETE",
  });
}

/** Browser scope — drop-in for former Worker /api/app-memory */
export async function listAppMemories(): Promise<AppMemorySummary[]> {
  return listAppMemoriesByScope("browser");
}

export async function getAppMemory(appId: string): Promise<AppMemory> {
  return getAppMemoryByScope("browser", appId);
}

export async function createAppMemory(input: AppMemoryWriteInput): Promise<AppMemory> {
  return putAppMemoryByScope("browser", input.appId, input.content);
}

export async function updateAppMemory(
  appId: string,
  input: AppMemoryUpdateInput
): Promise<AppMemory> {
  return putAppMemoryByScope("browser", appId, input.content);
}

export async function deleteAppMemory(appId: string): Promise<void> {
  return deleteAppMemoryByScope("browser", appId);
}
