import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { Cookie } from "playwright";
import { ToolError } from "../../mcp-kit/core/index.js";
import { getBrowserContext, getPage } from "./session.js";
import config from "../config.js";

async function requireContext() {
  const ctx = await getBrowserContext();
  if (!ctx) throw new ToolError("No browser context open. Call browser_navigate first.");
  return ctx;
}

/**
 * Run a JS expression in the page and return its (JSON-serialisable) result.
 * Pass a plain expression string, e.g. `document.title` or
 * `JSON.stringify([...document.querySelectorAll('.row')].length)`.
 */
export async function evaluateExpression(expression: string): Promise<string> {
  const page = await getPage();
  let result: unknown;
  try {
    result = await page.evaluate(expression);
  } catch (error) {
    throw new ToolError(`evaluate failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (result === undefined) return "undefined";
  try {
    return typeof result === "string" ? result : JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export async function getCookies(urls?: string[]): Promise<Cookie[]> {
  const ctx = await requireContext();
  return ctx.cookies(urls);
}

export async function setCookies(cookies: unknown[]): Promise<number> {
  const ctx = await requireContext();
  await ctx.addCookies(cookies as Parameters<typeof ctx.addCookies>[0]);
  return cookies.length;
}

function resolveStatePath(path: string | undefined): string {
  const dir = config.screenshotDir;
  mkdirSync(dir, { recursive: true });
  if (!path) return join(dir, `storage-state-${Date.now()}.json`);
  return isAbsolute(path) ? path : join(dir, path);
}

/** Persist cookies + localStorage of the current context to a JSON file. */
export async function saveStorageState(path?: string): Promise<{ path: string }> {
  const ctx = await requireContext();
  const target = resolveStatePath(path);
  await ctx.storageState({ path: target });
  return { path: target };
}

type StorageState = {
  cookies?: unknown[];
  origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
};

/**
 * Restore cookies immediately + seed localStorage on next navigation (via
 * addInitScript). Call BEFORE browser_navigate to skip login. localStorage only
 * takes effect once the page navigates to the matching origin.
 */
export async function loadStorageState(path: string): Promise<{
  cookies: number;
  origins: number;
}> {
  const ctx = await requireContext();
  const abs = isAbsolute(path) ? path : join(config.screenshotDir, path);
  let state: StorageState;
  try {
    state = JSON.parse(await readFile(abs, "utf8")) as StorageState;
  } catch (error) {
    throw new ToolError(`Cannot read storage state "${abs}": ${error instanceof Error ? error.message : String(error)}`);
  }

  if (state.cookies?.length) {
    await ctx.addCookies(state.cookies as Parameters<typeof ctx.addCookies>[0]);
  }

  const origins = state.origins ?? [];
  for (const origin of origins) {
    const items = origin.localStorage ?? [];
    if (!items.length) continue;
    const script = `(() => { if (location.origin === ${JSON.stringify(origin.origin)}) { const items = ${JSON.stringify(items)}; for (const it of items) { try { localStorage.setItem(it.name, it.value); } catch {} } } })();`;
    await ctx.addInitScript(script);
  }

  return { cookies: state.cookies?.length ?? 0, origins: origins.length };
}
