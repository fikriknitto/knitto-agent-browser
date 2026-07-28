import { basename, extname, resolve } from "node:path";
import { existsSync, statSync } from "node:fs";
import type { Browser } from "webdriverio";
import { ToolError } from "../../mcp-kit/core/index.js";
import { pushFile } from "../adb/adb-client.js";
import mobileConfig from "../config.js";
import { getAutomationJobId } from "../job-context.js";
import { getMobileJobConfig, getMobileJobUdid } from "../session/mobile-job-context.js";
import { resolveLocator } from "./locators.js";
import {
  getDriver,
  isInstrumentationCrash,
  recreateSessionAfterCrash,
  withInstrumentationRecovery,
} from "./session.js";
import type { MobileLocator } from "../schema.js";
import { assertPageOpen } from "./screenshot.js";

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "msi",
  "dll",
  "ps1",
  "com",
  "scr",
]);

/**
 * Cheap post-tap sanity check — not enforcement. If a tap left the job's
 * target app package (e.g. landed on the launcher/back-gesture area and
 * backgrounded/closed the app), surface it as a warning in the tool result
 * instead of silently returning success:true. Never throws.
 */
async function warnIfLeftTargetApp(driver: Browser): Promise<string | undefined> {
  const jobId = getAutomationJobId();
  const targetPackage = jobId ? getMobileJobConfig(jobId)?.appPackage : undefined;
  if (!targetPackage) return undefined;
  try {
    const currentPackage = await driver.getCurrentPackage();
    if (currentPackage && currentPackage !== targetPackage) {
      return `Tap left target app (now: ${currentPackage}) — check the tapped coordinates/element, this may have hit a nav/back-gesture area.`;
    }
  } catch {
    // ignore — best-effort signal only
  }
  return undefined;
}

export async function tapElement(
  locator: MobileLocator,
  clickCenter = true
): Promise<{ success: boolean; locator: MobileLocator; warning?: string }> {
  await assertPageOpen();
  return withInstrumentationRecovery(async (driver) => {
    const el = await resolveLocator(driver, locator);

    let warning: string | undefined;
    if (clickCenter) {
      const rect = await el.getLocation();
      const size = await el.getSize();
      const x = rect.x + size.width / 2;
      const y = rect.y + size.height / 2;
      ({ warning } = await tapAtCoordinates(driver, x, y));
    } else {
      await el.click();
      warning = await warnIfLeftTargetApp(driver);
    }

    return { success: true, locator, ...(warning ? { warning } : {}) };
  });
}

export async function tapAtCoordinates(
  driver: Browser,
  x: number,
  y: number
): Promise<{ success: boolean; x: number; y: number; warning?: string }> {
  try {
    await driver.execute("mobile: clickGesture", { x, y });
  } catch {
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 50 },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
  }
  const warning = await warnIfLeftTargetApp(driver);
  return { success: true, x, y, ...(warning ? { warning } : {}) };
}

export async function tapAt(
  x: number,
  y: number
): Promise<{ success: boolean; x: number; y: number; warning?: string }> {
  await assertPageOpen();
  return withInstrumentationRecovery((driver) => tapAtCoordinates(driver, x, y));
}

const MIN_SCROLL_DIMENSION = 100;
/** Default step — small enough to avoid skipping list rows during search. */
const DEFAULT_SCROLL_AMOUNT_PX = 200;
const MIN_SCROLL_PERCENT = 8;
/** Max gesture percent per up/down step (caps large `amount` values). */
const MAX_STEP_SCROLL_PERCENT = 30;
/** Max gesture percent for top/bottom jumps (still incremental; call again if needed). */
const MAX_EDGE_SCROLL_PERCENT = 45;

function scrollGesturePercent(amount: number, scrollHeight: number, maxPercent: number): number {
  const raw = Math.round((amount / scrollHeight) * 100);
  return Math.min(maxPercent, Math.max(MIN_SCROLL_PERCENT, raw));
}

type ScrollBounds = { left: number; top: number; width: number; height: number };

function computeSafeInsets(screenWidth: number, screenHeight: number) {
  const topInset = Math.max(48, Math.round(screenHeight * 0.1));
  const bottomInset = Math.max(48, Math.round(screenHeight * 0.08));
  const sideInset = Math.round(screenWidth * 0.05);
  return { topInset, bottomInset, sideInset };
}

function shrinkInsetsForSmallScreen(
  screenWidth: number,
  screenHeight: number,
  topInset: number,
  bottomInset: number,
  sideInset: number
): ScrollBounds {
  const reducedTop = Math.round(topInset * 0.5);
  const reducedBottom = Math.round(bottomInset * 0.5);
  const reducedSide = Math.round(sideInset * 0.5);
  return {
    left: reducedSide,
    top: reducedTop,
    width: screenWidth - 2 * reducedSide,
    height: screenHeight - reducedTop - reducedBottom,
  };
}

function applySafeInsetsToBounds(
  left: number,
  top: number,
  width: number,
  height: number,
  screenWidth: number,
  screenHeight: number
): ScrollBounds {
  const { topInset, bottomInset, sideInset } = computeSafeInsets(screenWidth, screenHeight);

  const safeLeft = Math.max(left, sideInset);
  const safeTop = Math.max(top, topInset);
  const right = Math.min(left + width, screenWidth - sideInset);
  const bottom = Math.min(top + height, screenHeight - bottomInset);
  const safeWidth = right - safeLeft;
  const safeHeight = bottom - safeTop;

  if (safeWidth < MIN_SCROLL_DIMENSION || safeHeight < MIN_SCROLL_DIMENSION) {
    return shrinkInsetsForSmallScreen(screenWidth, screenHeight, topInset, bottomInset, sideInset);
  }

  return { left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight };
}

async function getScrollBounds(driver: Browser, locator?: MobileLocator): Promise<ScrollBounds> {
  const win = await driver.getWindowSize();

  if (locator) {
    const el = await resolveLocator(driver, locator);
    const rect = await el.getLocation();
    const size = await el.getSize();
    return applySafeInsetsToBounds(rect.x, rect.y, size.width, size.height, win.width, win.height);
  }

  const { topInset, bottomInset, sideInset } = computeSafeInsets(win.width, win.height);
  const bounds: ScrollBounds = {
    left: sideInset,
    top: topInset,
    width: win.width - 2 * sideInset,
    height: win.height - topInset - bottomInset,
  };

  if (bounds.width < MIN_SCROLL_DIMENSION || bounds.height < MIN_SCROLL_DIMENSION) {
    return shrinkInsetsForSmallScreen(win.width, win.height, topInset, bottomInset, sideInset);
  }

  return bounds;
}

export async function scrollScreen(args: {
  direction: "up" | "down" | "top" | "bottom";
  amount?: number;
  locator?: MobileLocator;
}): Promise<{ success: boolean }> {
  await assertPageOpen();
  const amount = args.amount ?? DEFAULT_SCROLL_AMOUNT_PX;

  return withInstrumentationRecovery(async (driver) => {
    const { left, top, width, height } = await getScrollBounds(driver, args.locator);

    const stepPercent = scrollGesturePercent(amount, height, MAX_STEP_SCROLL_PERCENT);
    let direction: string = args.direction;
    if (args.direction === "top") direction = "up";
    if (args.direction === "bottom") direction = "down";

    if (args.direction === "top") {
      await driver.execute("mobile: scrollGesture", {
        left,
        top,
        width,
        height,
        direction: "up",
        percent: scrollGesturePercent(amount, height, MAX_EDGE_SCROLL_PERCENT),
      });
    } else if (args.direction === "bottom") {
      await driver.execute("mobile: scrollGesture", {
        left,
        top,
        width,
        height,
        direction: "down",
        percent: scrollGesturePercent(amount, height, MAX_EDGE_SCROLL_PERCENT),
      });
    } else {
      await driver.execute("mobile: scrollGesture", {
        left,
        top,
        width,
        height,
        direction,
        percent: stepPercent,
      });
    }

    return { success: true };
  });
}

/**
 * Decide, from what getText() returned after setValue(), whether the value
 * landed ("ok") or the field must be cleared and retyped via IME injection
 * ("retype"). Two hard-won rules encoded here:
 *
 * 1. PASSWORD FIELDS return a masked string (e.g. "•••••"), never the raw
 *    value — an exact-match check treats every password as "failed" and the
 *    old fallback then typed the value AGAIN at the cursor, doubling the
 *    password ("dmain" → "dmaindmain", 10 mask dots on screen, login
 *    rejected). A masked string of the RIGHT LENGTH means the value landed.
 * 2. The caller must CLEAR before any retype — appending was the bug.
 */
export function decideInputTextRetry(current: string, expected: string): "ok" | "retype" {
  const trimmedCurrent = current.trim();
  const trimmedExpected = expected.trim();
  if (trimmedCurrent === trimmedExpected) return "ok";
  // Masked-password heuristic: one masking char repeated, same length as
  // the expected value (•/·/*/dot variants used across Android skins).
  if (
    trimmedCurrent.length === trimmedExpected.length &&
    trimmedCurrent.length > 0 &&
    /^([•·*●○.])\1*$/.test(trimmedCurrent)
  ) {
    return "ok";
  }
  return "retype";
}

export async function inputText(args: {
  locator: MobileLocator;
  value: string;
  clear?: boolean;
  hideKeyboard?: boolean;
}): Promise<{ success: boolean; locator: MobileLocator }> {
  await assertPageOpen();
  return withInstrumentationRecovery(async (driver) => {
    const el = await resolveLocator(driver, args.locator);
    await el.click();
    if (args.clear !== false) {
      await el.clearValue();
    }
    await el.setValue(args.value);

    if (args.value) {
      let current = "";
      try {
        current = await el.getText();
      } catch {
        // treat as unknown → retype path below (after a clear, it's safe)
      }
      if (decideInputTextRetry(current, args.value) === "retype") {
        // React Native TextInput can ignore setValue()'s ACTION_SET_TEXT
        // (bypasses the JS bridge's onChangeText) — retype via IME
        // injection. ALWAYS clear first: typing at the cursor on top of
        // partial/failed content appends (the double-password bug).
        try {
          await el.clearValue();
        } catch {
          // ignore — clearing an already-empty field can throw on some devices
        }
        try {
          await driver.execute("mobile: type", { text: args.value });
        } catch {
          // Best-effort only — if the gesture isn't supported, keep whatever
          // setValue() already produced rather than failing the whole call.
        }
      }
    }

    if (args.hideKeyboard !== false) {
      try {
        await driver.hideKeyboard();
      } catch {
        // ignore
      }
    }
    return { success: true, locator: args.locator };
  });
}

export async function pressMobileKey(
  key: "BACK" | "HOME" | "ENTER" | "TAB" | "DEL" | "MENU"
): Promise<{ success: boolean; key: string }> {
  await assertPageOpen();
  const keyCodeMap: Record<string, number> = {
    BACK: 4,
    HOME: 3,
    ENTER: 66,
    TAB: 61,
    DEL: 67,
    MENU: 82,
  };
  await withInstrumentationRecovery((driver) => driver.pressKeyCode(keyCodeMap[key]!));
  return { success: true, key };
}

export async function uploadFileToInput(args: {
  locator: MobileLocator;
  filePath: string;
}): Promise<{
  success: boolean;
  locator: MobileLocator;
  filePath: string;
  fileName: string;
  remotePath: string;
}> {
  const absolutePath = assertSafeUploadPath(args.filePath);
  await assertPageOpen();
  const jobId = getAutomationJobId();
  const udid = jobId ? getMobileJobUdid(jobId) : undefined;
  if (!udid) {
    throw new ToolError("Device UDID tidak tersedia untuk upload.");
  }

  const fileName = basename(absolutePath);
  const remotePath = `/sdcard/Download/knitto-uploads/${fileName}`;
  await pushFile(udid, absolutePath, remotePath);

  await withInstrumentationRecovery(async (driver) => {
    const el = await resolveLocator(driver, args.locator);
    await el.click();
    try {
      await el.setValue(remotePath);
    } catch {
      await el.addValue(remotePath);
    }
  });

  return {
    success: true,
    locator: args.locator,
    filePath: absolutePath,
    fileName,
    remotePath,
  };
}

export async function assertVisible(
  locator: MobileLocator
): Promise<{ success: boolean; locator: MobileLocator; visible: boolean }> {
  await assertPageOpen();
  return withInstrumentationRecovery(async (driver) => {
    const el = await resolveLocator(driver, locator);
    const visible = await el.isDisplayed();
    if (!visible) {
      throw new ToolError(`Element not visible: ${JSON.stringify(locator)}`);
    }
    return { success: true, locator, visible: true };
  });
}

export async function waitFor(args: {
  type: "locator" | "text" | "timeout";
  text?: string;
  locator?: MobileLocator;
  timeoutMs?: number;
}): Promise<{ success: boolean; type: "locator" | "text" | "timeout" }> {
  await assertPageOpen();
  let driver = await getDriver();
  const timeout = args.timeoutMs ?? 10_000;

  if (args.type === "timeout") {
    await driver.pause(timeout);
    return { success: true, type: "timeout" };
  }

  const jobId = getAutomationJobId();

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (args.type === "locator" && args.locator) {
      try {
        const el = await resolveLocator(driver, args.locator);
        if (await el.isDisplayed()) {
          return { success: true, type: "locator" };
        }
      } catch (error) {
        if (jobId && isInstrumentationCrash(error)) {
          driver = await recreateSessionAfterCrash(jobId);
        }
        // otherwise keep polling — locator just isn't there yet
      }
    }
    if (args.type === "text" && args.text) {
      try {
        const source = await driver.getPageSource();
        if (source.includes(args.text)) {
          return { success: true, type: "text" };
        }
      } catch (error) {
        if (jobId && isInstrumentationCrash(error)) {
          driver = await recreateSessionAfterCrash(jobId);
        } else {
          throw error;
        }
      }
    }
    await driver.pause(300);
  }

  throw new ToolError(`Wait timed out after ${timeout}ms`);
}

function assertSafeUploadPath(filePath: string): string {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new ToolError(`File not found: ${absolutePath}`);
  }
  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    throw new ToolError(`Path is not a file: ${absolutePath}`);
  }
  if (stats.size > mobileConfig.uploadMaxBytes) {
    throw new ToolError(
      `File exceeds max upload size (${mobileConfig.uploadMaxBytes} bytes): ${absolutePath}`
    );
  }
  const ext = extname(absolutePath).slice(1).toLowerCase();
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new ToolError(`Blocked file extension ".${ext}"`);
  }
  return absolutePath;
}
