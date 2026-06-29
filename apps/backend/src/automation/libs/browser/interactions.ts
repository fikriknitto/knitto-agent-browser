import type { Page } from "puppeteer";
import { ToolError } from "../../core/index.js";
import { resolveLocator, resolveOptionByText } from "./locators.js";
import type { SemanticLocator } from "../schema.js";
import { getPage } from "./session.js";

export async function scrollPage(args: {
  direction: "up" | "down" | "top" | "bottom";
  amount?: number;
  locator?: SemanticLocator;
  smooth?: boolean;
}): Promise<{ success: boolean }> {
  const page = await getPage();
  const amount = args.amount ?? 400;

  if (args.locator) {
    const handle = await resolveLocator(page, args.locator);
    await handle.evaluate(
      (el, dir, px, smooth) => {
        el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
        if (dir === "down") el.scrollBy({ top: px, behavior: smooth ? "smooth" : "auto" });
        if (dir === "up") el.scrollBy({ top: -px, behavior: smooth ? "smooth" : "auto" });
      },
      args.direction,
      amount,
      args.smooth ?? true
    );
    return { success: true };
  }

  await page.evaluate(
    (dir, px, smooth) => {
      const behavior = smooth ? "smooth" : "auto";
      if (dir === "top") window.scrollTo({ top: 0, behavior });
      else if (dir === "bottom") window.scrollTo({ top: document.body.scrollHeight, behavior });
      else if (dir === "down") window.scrollBy({ top: px, behavior });
      else window.scrollBy({ top: -px, behavior });
    },
    args.direction,
    amount,
    args.smooth ?? true
  );

  return { success: true };
}

export async function hoverLocator(locator: SemanticLocator): Promise<{ success: boolean }> {
  const page = await getPage();
  const handle = await resolveLocator(page, locator);
  await handle.hover();
  return { success: true };
}

export async function clickLocator(
  locator: SemanticLocator,
  clickCenter = false
): Promise<{ success: boolean; locator: SemanticLocator }> {
  const page = await getPage();
  const handle = await resolveLocator(page, locator);

  if (clickCenter) {
    const box = await handle.boundingBox();
    if (!box) {
      throw new ToolError("Element has no bounding box — cannot click center.");
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await handle.click();
  }

  return { success: true, locator };
}

export async function clickAt(x: number, y: number): Promise<{ success: boolean; x: number; y: number }> {
  const page = await getPage();
  await page.mouse.click(x, y);
  return { success: true, x, y };
}

export async function pressKey(key: string, locator?: SemanticLocator): Promise<{ success: boolean; key: string }> {
  const normalizedKey = key.trim();
  if (normalizedKey.toLowerCase() === "escape") {
    throw new ToolError(
      "Escape is disabled. To dismiss a modal: automation_click Batal/Cancel/Close/X, or automation_click_at on the backdrop outside the modal bbox. To submit a form: click Simpan/Save/Submit."
    );
  }

  const page = await getPage();
  if (locator) {
    const handle = await resolveLocator(page, locator);
    await handle.focus();
  }
  await page.keyboard.press(key as Parameters<Page["keyboard"]["press"]>[0]);
  return { success: true, key };
}

export async function selectOption(
  locator: SemanticLocator,
  value: string
): Promise<{ success: boolean; value: string }> {
  const page = await getPage();
  const handle = await resolveLocator(page, locator);
  const tag = await handle.evaluate((el) => el.tagName.toLowerCase());

  if (tag === "select") {
    await handle.evaluate((el, val) => {
      if (el instanceof HTMLSelectElement) {
        el.value = val;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, value);
    return { success: true, value };
  }

  await handle.click();
  const optionHandle = await resolveOptionByText(page, value);
  await optionHandle.click();
  return { success: true, value };
}

export async function waitForCondition(args: {
  type: "text" | "locator" | "network_idle" | "timeout";
  text?: string;
  locator?: SemanticLocator;
  match?: "contains" | "exact";
  timeoutMs?: number;
}): Promise<{ success: boolean; type: string }> {
  const page = await getPage();
  const timeout = args.timeoutMs ?? 10_000;

  if (args.type === "timeout") {
    await new Promise((r) => setTimeout(r, Math.min(timeout, 30_000)));
    return { success: true, type: args.type };
  }

  if (args.type === "network_idle") {
    await page.waitForNetworkIdle({ idleTime: 500, timeout });
    return { success: true, type: args.type };
  }

  if (args.type === "text" && args.text) {
    const match = args.match ?? "contains";
    await page.waitForFunction(
      (text, matchMode) => {
        const body = document.body?.innerText ?? "";
        return matchMode === "exact" ? body.trim() === text.trim() : body.includes(text);
      },
      { timeout },
      args.text,
      match
    );
    return { success: true, type: args.type };
  }

  if (args.type === "locator" && args.locator) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const handle = await resolveLocator(page, args.locator);
        const visible = await handle.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (visible) return { success: true, type: args.type };
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new ToolError(`Timed out waiting for locator after ${timeout}ms`);
  }

  throw new ToolError("Invalid wait_for arguments");
}
