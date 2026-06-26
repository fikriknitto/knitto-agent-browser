import { access, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveMonorepoRoot, resolvePromptShortcutsDir } from "../config/paths.js";
import type {
  CreatePromptShortcutBody,
  UpdatePromptShortcutBody,
} from "../validators/prompt-shortcut-schemas.js";
import { promptShortcutIdSchema } from "../validators/prompt-shortcut-schemas.js";

export type PromptShortcutDto = {
  id: string;
  label: string;
  icon: string;
  variant: string;
  template: string;
  defaults: Record<string, string>;
};

type Frontmatter = {
  label?: string;
  icon?: string;
  variant?: string;
  defaults?: Record<string, string>;
};

export class PromptShortcutNotFoundError extends Error {
  constructor(id: string) {
    super(`Prompt shortcut not found: ${id}`);
    this.name = "PromptShortcutNotFoundError";
  }
}

export class PromptShortcutConflictError extends Error {
  constructor(id: string) {
    super(`Prompt shortcut already exists: ${id}`);
    this.name = "PromptShortcutConflictError";
  }
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw.trim() };
  }

  const meta: Frontmatter = { defaults: {} };
  let inDefaults = false;

  for (const line of match[1]!.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === "defaults:") {
      inDefaults = true;
      continue;
    }

    if (inDefaults) {
      const nested = line.match(/^\s{2,}(\w+):\s*(.*)$/);
      if (nested) {
        meta.defaults![nested[1]!] = stripQuotes(nested[2]!.trim());
        continue;
      }
      if (!line.startsWith(" ") && trimmed.includes(":")) {
        inDefaults = false;
      } else {
        continue;
      }
    }

    const top = trimmed.match(/^(\w+):\s*(.*)$/);
    if (top) {
      const key = top[1]!;
      const value = stripQuotes(top[2]!.trim());
      if (key === "label" || key === "icon" || key === "variant") {
        meta[key] = value;
      }
    }
  }

  return { meta, body: match[2]!.trim() };
}

function titleFromFilename(name: string): string {
  return name.replace(/\.md$/, "").replace(/-/g, " ");
}

function resolveDir(): string {
  return resolvePromptShortcutsDir(resolveMonorepoRoot());
}

function resolveFilePath(id: string): string {
  const parsed = promptShortcutIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid prompt shortcut id");
  }
  return join(resolveDir(), `${parsed.data}.md`);
}

function yamlScalar(value: string): string {
  if (/[:#\n"'`{}[\],&*!|>@]/.test(value) || value.startsWith(" ") || value.endsWith(" ")) {
    return JSON.stringify(value);
  }
  return value;
}

export function serializePromptShortcutMarkdown(
  dto: Omit<PromptShortcutDto, "id">
): string {
  const lines = ["---"];
  lines.push(`label: ${yamlScalar(dto.label)}`);
  if (dto.icon) {
    lines.push(`icon: ${JSON.stringify(dto.icon)}`);
  }
  lines.push(`variant: ${dto.variant}`);
  if (Object.keys(dto.defaults).length > 0) {
    lines.push("defaults:");
    for (const [key, value] of Object.entries(dto.defaults)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(dto.template.trim());
  return `${lines.join("\n")}\n`;
}

function dtoFromFile(id: string, raw: string): PromptShortcutDto {
  const { meta, body } = parseFrontmatter(raw);
  return {
    id,
    label: meta.label ?? titleFromFilename(`${id}.md`),
    icon: meta.icon ?? "",
    variant: meta.variant ?? "neutral",
    template: body,
    defaults: meta.defaults ?? {},
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function listPromptShortcuts(): Promise<PromptShortcutDto[]> {
  const dir = resolveDir();
  const entries = await readdir(dir);
  const shortcuts: PromptShortcutDto[] = [];

  for (const file of entries) {
    if (!file.endsWith(".md")) continue;
    const raw = await readFile(join(dir, file), "utf8");
    const id = file.replace(/\.md$/, "");
    shortcuts.push(dtoFromFile(id, raw));
  }

  return shortcuts.sort((a, b) => a.label.localeCompare(b.label));
}

export async function getPromptShortcut(id: string): Promise<PromptShortcutDto> {
  const filePath = resolveFilePath(id);
  if (!(await fileExists(filePath))) {
    throw new PromptShortcutNotFoundError(id);
  }
  const raw = await readFile(filePath, "utf8");
  return dtoFromFile(id, raw);
}

function slugifyLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "shortcut";
}

async function resolveUniqueId(label: string): Promise<string> {
  let base = slugifyLabel(label);
  if (!promptShortcutIdSchema.safeParse(base).success) {
    base = "shortcut";
  }

  let candidate = base;
  let suffix = 2;
  while (await fileExists(resolveFilePath(candidate))) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createPromptShortcut(body: CreatePromptShortcutBody): Promise<PromptShortcutDto> {
  const id = await resolveUniqueId(body.label);
  const filePath = resolveFilePath(id);

  await writeFile(
    filePath,
    serializePromptShortcutMarkdown({ ...body, icon: "" }),
    "utf8"
  );
  return getPromptShortcut(id);
}

export async function updatePromptShortcut(
  id: string,
  body: UpdatePromptShortcutBody
): Promise<PromptShortcutDto> {
  const filePath = resolveFilePath(id);
  if (!(await fileExists(filePath))) {
    throw new PromptShortcutNotFoundError(id);
  }

  const existing = await getPromptShortcut(id);

  await writeFile(
    filePath,
    serializePromptShortcutMarkdown({ ...body, icon: existing.icon }),
    "utf8"
  );
  return getPromptShortcut(id);
}

export async function deletePromptShortcut(id: string): Promise<void> {
  const filePath = resolveFilePath(id);
  if (!(await fileExists(filePath))) {
    throw new PromptShortcutNotFoundError(id);
  }
  await unlink(filePath);
}
