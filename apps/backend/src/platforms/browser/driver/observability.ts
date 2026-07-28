import type { Page, Response } from "playwright";
import { getPage } from "./session.js";
import config from "../config.js";

/**
 * Passive console + network collectors for the shared browser page.
 *
 * Playwright's `Page` already emits `console`/`pageerror`/`response`; we buffer a
 * bounded window so `browser_get_console_logs` / `browser_get_requests` can read
 * recent activity without the agent having to attach listeners. Buffers are
 * cleared per job (fresh browser launch) — see `clearObservability` usage in
 * session.ts.
 */

export type ConsoleEntry = { type: string; text: string; at: number };
export type NetworkEntry = { method: string; url: string; status: number; at: number };

const MAX_ENTRIES = 1000;

let consoleLogs: ConsoleEntry[] = [];
let networkEvents: NetworkEntry[] = [];
const observedPages = new WeakSet<Page>();

function push<T>(arr: T[], item: T): void {
  arr.push(item);
  if (arr.length > MAX_ENTRIES) arr.shift();
}

/** Reset buffers — called on a fresh browser launch so jobs don't leak into each other. */
export function clearObservability(): void {
  consoleLogs = [];
  networkEvents = [];
}

/** Attach console/network listeners once per Page. Idempotent per page object. */
export function attachPageObservers(page: Page): void {
  if (observedPages.has(page)) return;
  observedPages.add(page);

  page.on("console", (msg) => {
    push(consoleLogs, { type: msg.type(), text: msg.text(), at: Date.now() });
  });
  page.on("pageerror", (err) => {
    push(consoleLogs, { type: "error", text: err.message, at: Date.now() });
  });
  page.on("response", (res) => {
    push(networkEvents, {
      method: res.request().method(),
      url: res.url(),
      status: res.status(),
      at: Date.now(),
    });
  });
}

/** Pure filter — exported for testing. */
export function filterConsole(
  entries: ConsoleEntry[],
  opts?: { level?: string[]; limit?: number }
): ConsoleEntry[] {
  let out = entries;
  if (opts?.level?.length) {
    const wanted = new Set(opts.level.map((l) => l.toLowerCase()));
    out = out.filter((e) => wanted.has(e.type.toLowerCase()));
  }
  if (opts?.limit && opts.limit > 0) out = out.slice(-opts.limit);
  return out;
}

/** Pure filter — exported for testing. */
export function filterNetwork(
  entries: NetworkEntry[],
  opts?: { urlPattern?: string; method?: string; limit?: number }
): NetworkEntry[] {
  let out = entries;
  if (opts?.urlPattern) {
    const re = new RegExp(opts.urlPattern, "i");
    out = out.filter((e) => re.test(e.url));
  }
  if (opts?.method) {
    const m = opts.method.toUpperCase();
    out = out.filter((e) => e.method.toUpperCase() === m);
  }
  if (opts?.limit && opts.limit > 0) out = out.slice(-opts.limit);
  return out;
}

export function getConsoleLogs(opts?: { level?: string[]; limit?: number }): ConsoleEntry[] {
  return filterConsole(consoleLogs, opts);
}

export function getNetworkEvents(opts?: {
  urlPattern?: string;
  method?: string;
  limit?: number;
}): NetworkEntry[] {
  return filterNetwork(networkEvents, opts);
}

const MAX_BODY_CHARS = 20_000;

/** Block until a response matching urlPattern (+optional method) arrives. */
export async function waitForResponse(args: {
  urlPattern: string;
  method?: string;
  timeoutMs?: number;
  includeBody?: boolean;
}): Promise<{ url: string; status: number; ok: boolean; method: string; body?: string }> {
  const page = await getPage();
  const re = new RegExp(args.urlPattern, "i");
  const wantedMethod = args.method?.toUpperCase();

  const predicate = (res: Response): boolean => {
    if (!re.test(res.url())) return false;
    if (wantedMethod && res.request().method().toUpperCase() !== wantedMethod) return false;
    return true;
  };

  const res = await page.waitForResponse(predicate, {
    timeout: args.timeoutMs ?? config.browserTimeoutMs,
  });

  const out: { url: string; status: number; ok: boolean; method: string; body?: string } = {
    url: res.url(),
    status: res.status(),
    ok: res.ok(),
    method: res.request().method(),
  };

  if (args.includeBody) {
    try {
      const text = await res.text();
      out.body = text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}…[truncated]` : text;
    } catch {
      out.body = "[body unavailable]";
    }
  }

  return out;
}
