import { apiDataJsonAuthed, getApiDataToken } from "./api-data-client";
import { request } from "@/lib/http/client";
import type {
  GeneratePromptShortcutInput,
  GeneratePromptShortcutResult,
  PromptShortcut,
  PromptShortcutVariant,
  PromptShortcutWriteInput,
} from "@/lib/prompt-shortcuts/types";

const VARIANTS = new Set<PromptShortcutVariant>(["blue", "green", "amber", "neutral"]);

function resolveVariant(value?: string): PromptShortcutVariant {
  if (value && VARIANTS.has(value as PromptShortcutVariant)) {
    return value as PromptShortcutVariant;
  }
  return "neutral";
}

function normalizePromptShortcut(item: PromptShortcut): PromptShortcut {
  return {
    ...item,
    variant: resolveVariant(item.variant),
    platform: item.platform === "mobile" ? "mobile" : "browser",
    icon: item.icon ?? "",
    defaults: item.defaults ?? {},
  };
}

function requireToken(): void {
  if (!getApiDataToken()) {
    throw new Error("Login API Data dulu untuk prompt shortcuts.");
  }
}

export async function listPromptShortcuts(): Promise<PromptShortcut[]> {
  requireToken();
  const rows = await apiDataJsonAuthed<PromptShortcut[]>("/agent/prompt-shortcuts");
  return (rows ?? []).map(normalizePromptShortcut);
}

export async function getPromptShortcut(id: string): Promise<PromptShortcut> {
  requireToken();
  const row = await apiDataJsonAuthed<PromptShortcut>(
    `/agent/prompt-shortcuts/${encodeURIComponent(id)}`
  );
  return normalizePromptShortcut(row);
}

export async function createPromptShortcut(
  input: PromptShortcutWriteInput
): Promise<PromptShortcut> {
  requireToken();
  const row = await apiDataJsonAuthed<PromptShortcut>("/agent/prompt-shortcuts", {
    method: "POST",
    body: input,
  });
  return normalizePromptShortcut(row);
}

export async function updatePromptShortcut(
  id: string,
  input: PromptShortcutWriteInput
): Promise<PromptShortcut> {
  requireToken();
  const row = await apiDataJsonAuthed<PromptShortcut>(
    `/agent/prompt-shortcuts/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: input,
    }
  );
  return normalizePromptShortcut(row);
}

export async function deletePromptShortcut(id: string): Promise<void> {
  requireToken();
  await apiDataJsonAuthed(`/agent/prompt-shortcuts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Worker LLM generate — not SoT storage. */
export async function generatePromptShortcutTemplate(
  input: GeneratePromptShortcutInput
): Promise<GeneratePromptShortcutResult> {
  return request<GeneratePromptShortcutResult>("/api/prompt-shortcuts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
