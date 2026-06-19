import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePackageRoot(moduleUrl: string): string {
  return join(dirname(fileURLToPath(moduleUrl)), "../../..");
}

export function resolveAutomationMcpPath(moduleUrl: string): string {
  if (process.env.AUTOMATION_MCP_PATH) return process.env.AUTOMATION_MCP_PATH;
  return join(resolvePackageRoot(moduleUrl), "src/mcp/index.ts");
}

export function automationMcpEnv(): Record<string, string> {
  return {
    AUTOMATION_HEADLESS: process.env.AUTOMATION_HEADLESS ?? "false",
    AUTOMATION_SLOW_MO_MS: process.env.AUTOMATION_SLOW_MO_MS ?? "",
    AUTOMATION_MEMORY_DIR: process.env.AUTOMATION_MEMORY_DIR ?? "",
    AUTOMATION_SCREENSHOT_DIR: process.env.AUTOMATION_SCREENSHOT_DIR ?? "",
    AUTOMATION_BROWSER_TIMEOUT_MS: process.env.AUTOMATION_BROWSER_TIMEOUT_MS ?? "",
  };
}

export function automationMcpSpawnArgs(opts: {
  command: string;
  mcpPath: string;
}): { command: string; args: string[] } {
  if (opts.command === "pnpm") {
    return { command: opts.command, args: ["exec", "tsx", opts.mcpPath] };
  }
  if (opts.command === "npx") {
    return { command: opts.command, args: ["tsx", opts.mcpPath] };
  }
  return { command: opts.command, args: [opts.mcpPath] };
}

export function cursorMcpServerConfig(opts: {
  command: string;
  args: string[];
  cwd: string;
}): Record<string, { command: string; args: string[]; env: Record<string, string> }> {
  const env = automationMcpEnv();
  const filtered = Object.fromEntries(Object.entries(env).filter(([, v]) => v));
  return {
    automation: {
      command: opts.command,
      args: opts.args,
      env: filtered,
    },
  };
}

export function buildOpenRouterMcpServers(opts: {
  command: string;
  args: string[];
  cwd: string;
}) {
  const env = automationMcpEnv();
  const filtered = Object.fromEntries(Object.entries(env).filter(([, v]) => v));
  return {
    automation: {
      type: "stdio" as const,
      command: opts.command,
      args: opts.args,
      env: filtered,
      cwd: opts.cwd,
    },
  };
}
