import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let cachedMonorepoRoot: string | undefined;

/** Monorepo root (knitto-browser-agent/) */
export function resolveMonorepoRoot(): string {
  if (cachedMonorepoRoot) return cachedMonorepoRoot;

  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      cachedMonorepoRoot = dir;
      return dir;
    }
    dir = dirname(dir);
  }

  cachedMonorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
  return cachedMonorepoRoot;
}

export function resolveMemoryDir(root = resolveMonorepoRoot()): string {
  const fromEnv = process.env.AUTOMATION_MEMORY_DIR?.trim();
  if (!fromEnv) return join(root, "memory");
  return resolve(root, fromEnv);
}

export function resolveScreenshotDir(root = resolveMonorepoRoot()): string {
  const fromEnv = process.env.AUTOMATION_SCREENSHOT_DIR?.trim();
  if (fromEnv) return resolve(root, fromEnv);
  // Ephemeral job evidence workspace — under STORAGE_ROOT to avoid a second root folder.
  // Durable history lives in API Data / MinIO; this path is mid-job + upload buffer only.
  // NOTE: this is the parent of the "agents/{jobId}/" tree — job-context.ts's
  // resolveAgentScreenshotDir(ForJob) appends "agents"+jobId on top of this.
  // Do not also append "agents" here, or job evidence ends up nested twice
  // (storage/agents/agents/{jobId}/, the double-folder bug this fixed).
  return resolveStorageRoot(root);
}

export function resolvePromptShortcutsDir(root = resolveMonorepoRoot()): string {
  return join(root, "prompt-shortcuts");
}

export function resolveMcpStdioEntry(root = resolveMonorepoRoot()): string {
  if (process.env.AUTOMATION_MCP_PATH?.trim()) {
    return resolve(root, process.env.AUTOMATION_MCP_PATH.trim());
  }
  return join(root, "apps", "backend", "src", "platforms", "browser", "mcp-stdio-server.ts");
}

export function resolveMobileMcpStdioEntry(root = resolveMonorepoRoot()): string {
  if (process.env.MOBILE_MCP_PATH?.trim()) {
    return resolve(root, process.env.MOBILE_MCP_PATH.trim());
  }
  return join(root, "apps", "backend", "src", "platforms", "mobile", "mcp-stdio-server.ts");
}

export function resolveMobileMemoryDir(root = resolveMonorepoRoot()): string {
  const fromEnv = process.env.MOBILE_MEMORY_DIR?.trim();
  if (!fromEnv) return join(root, "memory", "mobile");
  return resolve(root, fromEnv);
}

export function resolveStorageRoot(root = resolveMonorepoRoot()): string {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (!fromEnv) return join(root, "storage");
  return resolve(root, fromEnv);
}
