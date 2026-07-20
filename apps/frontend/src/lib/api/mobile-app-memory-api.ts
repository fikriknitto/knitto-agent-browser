import {
  deleteAppMemoryByScope,
  getAppMemoryByScope,
  listAppMemoriesByScope,
  putAppMemoryByScope,
} from "./app-memory-api";
import type {
  AppMemory,
  AppMemorySummary,
  AppMemoryUpdateInput,
  AppMemoryWriteInput,
} from "@/lib/app-memory/types";

export async function listMobileAppMemories(): Promise<AppMemorySummary[]> {
  return listAppMemoriesByScope("mobile");
}

export async function getMobileAppMemory(appId: string): Promise<AppMemory> {
  return getAppMemoryByScope("mobile", appId);
}

export async function createMobileAppMemory(input: AppMemoryWriteInput): Promise<AppMemory> {
  return putAppMemoryByScope("mobile", input.appId, input.content);
}

export async function updateMobileAppMemory(
  appId: string,
  input: AppMemoryUpdateInput
): Promise<AppMemory> {
  return putAppMemoryByScope("mobile", appId, input.content);
}

export async function deleteMobileAppMemory(appId: string): Promise<void> {
  return deleteAppMemoryByScope("mobile", appId);
}
