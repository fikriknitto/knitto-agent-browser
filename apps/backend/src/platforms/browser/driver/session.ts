import { createServer } from "node:net";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { ToolError } from "../../mcp-kit/core/index.js";
import { getAutomationJobId } from "../../../core/job-context.js";
import config from "../config.js";
import { isJobSegmentManaged } from "../../../core/evidence/segment-context.js";
import { ensureSegmentRecordingStarted } from "../../../core/evidence/segment-recording.js";
import {
  acquireBrowserLock,
  clearBrowserLock,
  releaseBrowserLock,
} from "../../../core/evidence/browser-lock.js";
import {
  ensureBrowserSegmentRecording,
  prepareVideoDir,
  startJobRecording,
  stopJobRecording,
} from "./recording.js";
import { attachPageObservers, clearObservability } from "./observability.js";

export function isRecordablePageUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed !== "" && trimmed !== "about:blank";
}

export function getOpenPage(): Page | null {
  if (page && !page.isClosed()) return page;
  return null;
}

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

const BROWSER_STATE_DIR = join(tmpdir(), "knitto-automation-browser");
const BROWSER_STATE_FILE = join(BROWSER_STATE_DIR, "state.json");

type BrowserState = { cdpUrl: string };

function writeBrowserState(cdpUrl: string): void {
  try {
    mkdirSync(BROWSER_STATE_DIR, { recursive: true });
    writeFileSync(BROWSER_STATE_FILE, JSON.stringify({ cdpUrl } satisfies BrowserState));
  } catch {
    // ignore — cleanup is best-effort
  }
}

function clearBrowserState(): void {
  try {
    unlinkSync(BROWSER_STATE_FILE);
  } catch {
    // ignore
  }
}

function readBrowserState(): BrowserState | null {
  try {
    return JSON.parse(readFileSync(BROWSER_STATE_FILE, "utf8")) as BrowserState;
  } catch {
    return null;
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Failed to bind ephemeral port"));
        return;
      }
      const { port } = addr;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function bindOpenPage(p: Page): void {
  page = p;
  page.setDefaultTimeout(config.browserTimeoutMs);
  attachPageObservers(p);
}

async function attachToExistingBrowser(b: Browser): Promise<Browser> {
  browser = b;
  const contexts = b.contexts();
  context = contexts[0] ?? (await b.newContext({
    viewport: { width: config.viewportWidth, height: config.viewportHeight },
  }));
  const pages = context.pages();
  bindOpenPage(pages.find((p) => !p.isClosed()) ?? pages[0] ?? (await context.newPage()));
  return b;
}

/** Reconnect to a live browser from state.json (Cursor multi-TC / MCP stdio). */
export async function connectBrowserFromStateFile(): Promise<Browser | null> {
  const state = readBrowserState();
  if (!state?.cdpUrl) return null;

  try {
    const connected = await chromium.connectOverCDP(state.cdpUrl);
    return attachToExistingBrowser(connected);
  } catch {
    return null;
  }
}

async function launchBrowser(): Promise<Browser> {
  const jobId = getAutomationJobId();
  if (jobId) {
    acquireBrowserLock(jobId);
  }

  if (browser?.isConnected()) return browser;

  const reconnected = await connectBrowserFromStateFile();
  if (reconnected) return reconnected;

  const port = await findFreePort();
  const cdpUrl = `http://127.0.0.1:${port}`;

  browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMoMs > 0 ? config.slowMoMs : undefined,
    executablePath: config.chromiumExecutablePath,
    args: [
      `--remote-debugging-port=${port}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  // Fresh browser = fresh job: drop console/network buffers from any prior job.
  clearObservability();
  writeBrowserState(cdpUrl);

  const videoDir = jobId && config.recordVideo ? prepareVideoDir(jobId) : undefined;

  context = await browser.newContext({
    viewport: { width: config.viewportWidth, height: config.viewportHeight },
    ...(videoDir
      ? {
          recordVideo: {
            dir: videoDir,
            size: { width: config.viewportWidth, height: config.viewportHeight },
          },
        }
      : {}),
  });

  const p = await context.newPage();
  bindOpenPage(p);

  process.on("exit", () => {
    void browser?.close().catch(() => undefined);
  });

  return browser;
}

async function startRecordingForPage(active: Page): Promise<void> {
  const jobId = getAutomationJobId();
  if (!jobId) return;

  if (isJobSegmentManaged(jobId)) {
    if (!isRecordablePageUrl(active.url())) return;
    await ensureBrowserSegmentRecording(active, jobId);
  } else {
    await startJobRecording(active);
  }
}

export async function getPage(): Promise<Page> {
  const jobId = getAutomationJobId();
  if (jobId) {
    acquireBrowserLock(jobId);
  }

  if (page && !page.isClosed()) {
    if (jobId) {
      await startRecordingForPage(page);
    }
    return page;
  }
  await launchBrowser();
  if (!page || page.isClosed()) {
    throw new ToolError("Failed to open browser page.");
  }
  if (jobId) {
    await startRecordingForPage(page);
  }
  return page;
}

export async function getBrowserContext(): Promise<BrowserContext | null> {
  if (context) return context;
  await getPage();
  return context;
}

type GotoWaitUntil = "load" | "domcontentloaded" | "networkidle" | "commit";

function mapWaitUntil(
  waitUntil: "load" | "domcontentloaded" | "networkidle0" | "networkidle2" | GotoWaitUntil
): GotoWaitUntil {
  if (waitUntil === "networkidle0" || waitUntil === "networkidle2") return "networkidle";
  return waitUntil;
}

export async function navigatePage(
  url: string,
  waitUntil: "load" | "domcontentloaded" | "networkidle0" | "networkidle2"
): Promise<{ url: string; title: string }> {
  const p = await getPage();
  await p.goto(url, {
    waitUntil: mapWaitUntil(waitUntil),
    timeout: config.browserTimeoutMs,
  });
  const jobId = getAutomationJobId();
  if (jobId && isJobSegmentManaged(jobId)) {
    await ensureSegmentRecordingStarted(jobId);
  }
  return { url: p.url(), title: await p.title() };
}

export async function getPageText(): Promise<string> {
  const p = await getPage();
  return p.evaluate(() => document.body?.innerText ?? "");
}

export async function goBack(): Promise<{ url: string; title: string }> {
  const p = await getPage();
  await p.goBack({ waitUntil: "domcontentloaded", timeout: config.browserTimeoutMs });
  return { url: p.url(), title: await p.title() };
}

export async function goForward(): Promise<{ url: string; title: string }> {
  const p = await getPage();
  await p.goForward({ waitUntil: "domcontentloaded", timeout: config.browserTimeoutMs });
  return { url: p.url(), title: await p.title() };
}

export async function closeBrowser(): Promise<void> {
  const jobId = getAutomationJobId();

  if (page && !page.isClosed()) {
    await page.close().catch(() => undefined);
  }
  page = null;

  if (context) {
    await context.close().catch(() => undefined);
    context = null;
  }

  // Context close flushes Playwright webm — then speed/transcode to recording.mp4
  await stopJobRecording();

  if (browser) {
    await browser.close().catch(() => undefined);
    browser = null;
    clearBrowserState();
    if (jobId) releaseBrowserLock(jobId);
    else clearBrowserLock();
    return;
  }

  await closeBrowserFromStateFile();
  if (jobId) releaseBrowserLock(jobId);
  else clearBrowserLock();
}

/** Capture PNG base64 from the live browser via saved CDP endpoint (Cursor SDK path). */
export async function captureScreenshotFromStateFile(): Promise<string | undefined> {
  const state = readBrowserState();
  if (!state?.cdpUrl) return undefined;

  try {
    const remote = await chromium.connectOverCDP(state.cdpUrl);
    const ctx = remote.contexts()[0];
    const pages = ctx?.pages() ?? [];
    const active = pages.find((p) => !p.isClosed()) ?? pages[0];
    if (!active || active.isClosed()) return undefined;
    const buffer = await active.screenshot({ fullPage: false, type: "png" });
    // Do not remote.close() — that would kill the shared Chromium process.
    return Buffer.from(buffer).toString("base64");
  } catch {
    return undefined;
  }
}

/** Close browser from another process via saved CDP endpoint (Cursor SDK path). */
export async function closeBrowserFromStateFile(): Promise<boolean> {
  const state = readBrowserState();
  if (!state?.cdpUrl) return false;

  try {
    const remote = await chromium.connectOverCDP(state.cdpUrl);
    for (const ctx of remote.contexts()) {
      await ctx.close().catch(() => undefined);
    }
    const jobId = getAutomationJobId();
    if (jobId) {
      await stopJobRecording();
    }
    await remote.close().catch(() => undefined);
    clearBrowserState();
    browser = null;
    context = null;
    page = null;
    clearBrowserLock();
    return true;
  } catch {
    clearBrowserState();
    clearBrowserLock();
    return false;
  }
}

export function assertPageOpen(): void {
  if (!page || page.isClosed()) {
    throw new ToolError("No browser page open. Call browser_navigate first.");
  }
}
