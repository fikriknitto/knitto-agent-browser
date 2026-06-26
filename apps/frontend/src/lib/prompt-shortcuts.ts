import type { AgentJobMessage } from "@knitto/shared";

export type PromptShortcutVariant = "blue" | "green" | "amber" | "neutral";

export type PromptShortcut = {
  id: string;
  label: string;
  icon: string;
  variant: PromptShortcutVariant;
  template: string;
  defaults: Record<string, string>;
};

export type PromptShortcutWriteInput = {
  label: string;
  variant: PromptShortcutVariant;
  template: string;
  defaults: Record<string, string>;
};

export type GeneratePromptShortcutInput = {
  bridgeId: string;
  model: string;
  brief: string;
  label?: string;
};

export type GeneratePromptShortcutResult = {
  template: string;
  defaults?: Record<string, string>;
  label?: string;
};

const API_BASE = "/api/prompt-shortcuts";
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
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function fillPromptTemplate(
  template: string,
  defaults: Record<string, string>
): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, key: string) => {
    if (key in defaults) return defaults[key] ?? "";
    const lowerKey = key.toLowerCase();
    const match = Object.keys(defaults).find((k) => k.toLowerCase() === lowerKey);
    return match ? (defaults[match] ?? "") : `{${key}}`;
  });
}

export function extractTemplatePlaceholders(template: string): Record<string, string> {
  const defaults: Record<string, string> = {};
  const matches = template.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
  for (const match of matches) {
    const key = match[1]!;
    if (!(key in defaults)) defaults[key] = "";
  }
  return defaults;
}

let cachedPromptShortcuts: PromptShortcut[] | null = null;

export function invalidatePromptShortcutsCache(): void {
  cachedPromptShortcuts = null;
}

export async function fetchPromptShortcuts(): Promise<PromptShortcut[]> {
  if (cachedPromptShortcuts) return cachedPromptShortcuts;

  const response = await fetch(API_BASE);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = (await response.json()) as { promptShortcuts: PromptShortcut[] };
  cachedPromptShortcuts = data.promptShortcuts.map(normalizePromptShortcut);
  return cachedPromptShortcuts;
}

/** @deprecated use fetchPromptShortcuts */
export const loadPromptShortcuts = fetchPromptShortcuts;

export async function fetchPromptShortcut(id: string): Promise<PromptShortcut> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data = (await response.json()) as { promptShortcut: PromptShortcut };
  return normalizePromptShortcut(data.promptShortcut);
}

export async function createPromptShortcut(input: PromptShortcutWriteInput): Promise<PromptShortcut> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  invalidatePromptShortcutsCache();
  const data = (await response.json()) as { promptShortcut: PromptShortcut };
  return normalizePromptShortcut(data.promptShortcut);
}

export async function updatePromptShortcut(
  id: string,
  input: PromptShortcutWriteInput
): Promise<PromptShortcut> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  invalidatePromptShortcutsCache();
  const data = (await response.json()) as { promptShortcut: PromptShortcut };
  return normalizePromptShortcut(data.promptShortcut);
}

export async function deletePromptShortcut(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  invalidatePromptShortcutsCache();
}

export async function generatePromptShortcutTemplate(
  input: GeneratePromptShortcutInput
): Promise<GeneratePromptShortcutResult> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as GeneratePromptShortcutResult;
}

export type { AgentJobMessage };
