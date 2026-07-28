import type { ElementHandle, Page } from "playwright";
import { ToolError } from "../../mcp-kit/core/index.js";
import type { SemanticLocator } from "../schema.js";

export type RefEntry = {
  selector: string;
  index: number;
};

const refMap = new Map<string, RefEntry>();

export function clearRefMap(): void {
  refMap.clear();
}

export function registerRefs(entries: Array<{ ref: string; selector: string; index: number }>): void {
  refMap.clear();
  for (const entry of entries) {
    refMap.set(entry.ref, { selector: entry.selector, index: entry.index });
  }
}

export function getRefEntry(ref: string): RefEntry | undefined {
  return refMap.get(ref);
}

function escapeXPathText(text: string): string {
  if (!text.includes("'")) return `'${text}'`;
  if (!text.includes('"')) return `"${text}"`;
  return `concat('${text.replace(/'/g, "',\"'\",'")}')`;
}

async function resolveByRef(page: Page, ref: string) {
  const entry = refMap.get(ref);
  if (!entry) {
    throw new ToolError(`Unknown ref "${ref}". Call browser_get_page_snapshot first.`);
  }
  const handles = await page.locator(entry.selector).elementHandles();
  const handle = handles[entry.index];
  if (!handle) {
    throw new ToolError(`Ref "${ref}" no longer matches an element on the page.`);
  }
  return handle;
}

async function resolveByRoleName(page: Page, role: string, name?: string) {
  const roleLower = role.toLowerCase();
  const tagAliases: Record<string, string> = {
    button: "button",
    link: "a",
    textbox: "input",
    combobox: "select",
    checkbox: "input",
    option: "option",
    menuitem: "a",
  };
  const tag = tagAliases[roleLower] ?? roleLower;
  const xpath = name
    ? `//*[@role="${roleLower}" and contains(normalize-space(.), ${escapeXPathText(name)})] | //${tag}[contains(normalize-space(.), ${escapeXPathText(name)})]`
    : `//*[@role="${roleLower}"] | //${tag}`;
  const handles = await page.locator(`xpath=${xpath}`).elementHandles();
  if (!handles.length) {
    throw new ToolError(
      `No element found for role="${role}"${name ? ` name="${name}"` : ""}.`
    );
  }
  if (handles.length > 1 && name) {
    throw new ToolError(
      `Ambiguous locator role="${role}" name="${name}" (${handles.length} matches). Use get_page_snapshot ref.`
    );
  }
  return handles[0]!;
}

async function resolveByPlaceholder(page: Page, placeholder: string) {
  const handles = await page
    .locator(`[placeholder="${placeholder.replace(/"/g, '\\"')}"]`)
    .elementHandles();
  if (!handles.length) {
    throw new ToolError(`No input found with placeholder="${placeholder}".`);
  }
  return handles[0]!;
}

async function resolveByLabel(page: Page, label: string) {
  const forIds = await page.evaluate((labelText) => {
    const xpath = `//label[contains(normalize-space(.), '${labelText.replace(/'/g, "\\'")}')]`;
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const ids: string[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const node = result.snapshotItem(i);
      if (node instanceof HTMLLabelElement && node.htmlFor) ids.push(node.htmlFor);
    }
    return ids;
  }, label);

  if (forIds.length) {
    const handle = await page.$(`#${CSS.escape(forIds[0]!)}`);
    if (handle) return handle;
  }

  const labeled = await page
    .locator(
      `xpath=//label[contains(normalize-space(.), ${escapeXPathText(label)})]//input | //label[contains(normalize-space(.), ${escapeXPathText(label)})]//textarea | //label[contains(normalize-space(.), ${escapeXPathText(label)})]//select`
    )
    .elementHandles();
  if (!labeled.length) {
    throw new ToolError(`No element found for label="${label}".`);
  }
  return labeled[0]!;
}

async function resolveByText(page: Page, text: string): Promise<ElementHandle<Element>> {
  const handle = await page.evaluateHandle((searchText) => {
    function escapeXPathLiteral(value: string) {
      if (!value.includes("'")) return `'${value}'`;
      if (!value.includes('"')) return `"${value}"`;
      return `concat('${value.replace(/'/g, "',\"'\",'")}')`;
    }

    function isPointer(el: Element) {
      return window.getComputedStyle(el).cursor === "pointer";
    }

    function isVisible(el: Element) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function normalizeText(el: Element) {
      return (el.textContent || "").replace(/\s+/g, " ").trim();
    }

    function titleHint(el: Element) {
      if (el.getAttribute("title")) return el.getAttribute("title")!.trim();
      const titled = el.querySelector("[title]");
      if (titled?.getAttribute("title")) return titled.getAttribute("title")!.trim();
      return null;
    }

    function pickClickTarget(node: Element): Element {
      let best = node;
      let current: Element | null = node;

      while (current) {
        const tag = current.tagName.toLowerCase();
        if (tag === "div" || tag === "span" || tag === "a" || tag === "button") {
          if (isVisible(current) && normalizeText(current).includes(searchText.trim())) {
            if (isPointer(current)) best = current;
            else if (!isPointer(best)) best = current;
          }
        }
        current = current.parentElement;
      }

      return best;
    }

    const xpath = `//*[not(self::script or self::style) and contains(normalize-space(.), ${escapeXPathLiteral(searchText)})]`;
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const deduped = new Map<Element, Element>();
    for (let i = 0; i < result.snapshotLength; i++) {
      const node = result.snapshotItem(i);
      if (!(node instanceof Element) || !isVisible(node)) continue;
      const target = pickClickTarget(node);
      if (!isVisible(target)) continue;
      deduped.set(target, target);
    }

    const candidates = Array.from(deduped.keys());
    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const aPointer = isPointer(a) ? 1 : 0;
      const bPointer = isPointer(b) ? 1 : 0;
      if (aPointer !== bPointer) return bPointer - aPointer;

      const aTitle = titleHint(a) === searchText.trim() ? 1 : 0;
      const bTitle = titleHint(b) === searchText.trim() ? 1 : 0;
      if (aTitle !== bTitle) return bTitle - aTitle;

      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return bRect.width * bRect.height - aRect.width * aRect.height;
    });

    return candidates[0]!;
  }, text);

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    throw new ToolError(`No element found containing text="${text}".`);
  }

  return element as ElementHandle<Element>;
}

export async function resolveOptionByText(page: Page, text: string) {
  const xpath = `//*[self::option or self::li or @role='option' or @role='menuitem'][contains(normalize-space(.), ${escapeXPathText(text)})]`;
  const handles = await page.locator(`xpath=${xpath}`).elementHandles();
  if (!handles.length) {
    throw new ToolError(`No option found matching "${text}".`);
  }
  return handles[0]!;
}

export async function resolveLocator(
  page: Page,
  locator: SemanticLocator
): Promise<ElementHandle<Element>> {
  let handle: ElementHandle<Node>;
  if (locator.ref) handle = await resolveByRef(page, locator.ref);
  else if (locator.role) handle = await resolveByRoleName(page, locator.role, locator.name);
  else if (locator.placeholder) handle = await resolveByPlaceholder(page, locator.placeholder);
  else if (locator.label) handle = await resolveByLabel(page, locator.label);
  else if (locator.text) handle = await resolveByText(page, locator.text);
  else {
    throw new ToolError(
      "Locator requires ref, role (+optional name), label, placeholder, or text. Do not use data-testid."
    );
  }
  return handle as ElementHandle<Element>;
}

export async function isLocatorVisible(page: Page, locator: SemanticLocator): Promise<boolean> {
  const handle = await resolveLocator(page, locator);
  return handle.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.width > 0 &&
      rect.height > 0
    );
  });
}
