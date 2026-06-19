import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function envStr(key: string, fallback = ""): string {
  return process.env[key]?.trim() ?? fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function resolveProjectRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../..");
}

export default {
  get headless() {
    return envBool("AUTOMATION_HEADLESS", false);
  },
  get slowMoMs() {
    return envInt("AUTOMATION_SLOW_MO_MS", 0);
  },
  get browserTimeoutMs() {
    return envInt("AUTOMATION_BROWSER_TIMEOUT_MS", 30_000);
  },
  get memoryDir() {
    return envStr("AUTOMATION_MEMORY_DIR") || join(resolveProjectRoot(), "memory");
  },
  get screenshotDir() {
    return envStr("AUTOMATION_SCREENSHOT_DIR") || join(resolveProjectRoot(), "screenshoot");
  },
  get viewportWidth() {
    return envInt("AUTOMATION_VIEWPORT_WIDTH", 1280);
  },
  get viewportHeight() {
    return envInt("AUTOMATION_VIEWPORT_HEIGHT", 720);
  },
};
