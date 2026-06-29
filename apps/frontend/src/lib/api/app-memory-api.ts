import { request, requestVoid } from "../http/client";
import type {
  AppMemory,
  AppMemorySummary,
  AppMemoryUpdateInput,
  AppMemoryWriteInput,
} from "../app-memory/types";

const API_BASE = "/api/app-memory";

export async function listAppMemories(): Promise<AppMemorySummary[]> {
  const data = await request<{ appMemories: AppMemorySummary[] }>(API_BASE);
  return data.appMemories;
}

export async function getAppMemory(appId: string): Promise<AppMemory> {
  const data = await request<{ appMemory: AppMemory }>(
    `${API_BASE}/${encodeURIComponent(appId)}`
  );
  return data.appMemory;
}

export async function createAppMemory(input: AppMemoryWriteInput): Promise<AppMemory> {
  const data = await request<{ appMemory: AppMemory }>(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.appMemory;
}

export async function updateAppMemory(
  appId: string,
  input: AppMemoryUpdateInput
): Promise<AppMemory> {
  const data = await request<{ appMemory: AppMemory }>(
    `${API_BASE}/${encodeURIComponent(appId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return data.appMemory;
}

export async function deleteAppMemory(appId: string): Promise<void> {
  await requestVoid(`${API_BASE}/${encodeURIComponent(appId)}`, {
    method: "DELETE",
  });
}
