import { getPage } from "./session.js";
import { clearRefMap, registerRefs } from "./locators.js";

export type SnapshotElement = {
  ref: string;
  role: string | null;
  name: string | null;
  tag: string;
  text: string | null;
  placeholder: string | null;
  inputType: string | null;
  visible: boolean;
  disabled: boolean;
  inViewport: boolean;
  bbox: { x: number; y: number; width: number; height: number } | null;
};

/**
 * Plain browser script as a string — never pass a TS function to page.evaluate:
 * tsx/esbuild injects __name() helpers that do not exist in the page context.
 */
const SNAPSHOT_SCRIPT = `(interactiveOnly, maxElements) => {
  const INTERACTIVE =
    'a[href], button, input, select, textarea, summary, label[for], ' +
    '[role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], ' +
    '[role="menuitem"], [role="tab"], [role="option"], ' +
    '[aria-haspopup], [aria-expanded], [onclick], ' +
    '[tabindex]:not([tabindex="-1"]), ' +
    'div[tabindex]:not([tabindex="-1"]), span[tabindex]:not([tabindex="-1"])';

  function visible(el) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }

  function inViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }

  function classHint(el) {
    return (el.getAttribute("class") || "").toLowerCase();
  }

  function isMenuToggle(el) {
    const cls = classHint(el);
    if (cls.includes("hamburger") || cls.includes("menu-toggle") || cls.includes("nav-toggle") || cls.includes("burger")) {
      return true;
    }
    const label = (el.getAttribute("aria-label") || el.getAttribute("title") || "").toLowerCase();
    return label.includes("menu") || label.includes("navigation") || label.includes("nav");
  }

  function wrapsSvgIcon(el) {
    if (el.tagName !== "DIV" && el.tagName !== "SPAN") return false;
    return !!el.querySelector("svg") && !el.querySelector("button, a[href]");
  }

  function isPointerTarget(el) {
    return window.getComputedStyle(el).cursor === "pointer";
  }

  function titleHint(el) {
    if (el.getAttribute("title")) return el.getAttribute("title").trim();
    const titled = el.querySelector("[title]");
    if (titled && titled.getAttribute("title")) return titled.getAttribute("title").trim();
    return null;
  }

  function accessibleName(el) {
    const labelled = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("alt");
    if (labelled) return labelled.trim();

    const fromTitle = titleHint(el);
    if (fromTitle) return fromTitle.slice(0, 120);

    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const parts = labelledBy
        .split(/\\s+/)
        .map((id) => {
          const node = document.getElementById(id);
          return node && node.textContent ? node.textContent.trim() : null;
        })
        .filter(Boolean);
      if (parts.length) return parts.join(" ").slice(0, 120);
    }

    if (isMenuToggle(el)) return "Menu";

    if (wrapsSvgIcon(el) && isPointerTarget(el)) return "Icon button";

    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label && label.textContent) return label.textContent.trim();
    }

    const text = (el.textContent || "").replace(/\\s+/g, " ").trim();
    return text.slice(0, 120) || null;
  }

  function roleOf(el) {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button") return "button";
    if (wrapsSvgIcon(el) && (isPointerTarget(el) || isMenuToggle(el) || el.hasAttribute("aria-expanded"))) {
      return "button";
    }
    if (isMenuToggle(el)) return "button";
    if ((tag === "div" || tag === "span") && isPointerTarget(el) && accessibleName(el)) {
      return "menuitem";
    }
    return tag;
  }

  function isPointerMenuRow(el) {
    if (el.tagName !== "DIV" && el.tagName !== "SPAN") return false;
    if (!visible(el) || !isPointerTarget(el)) return false;
    const name = accessibleName(el);
    if (!name || name.length < 2) return false;
    const rowText = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (!rowText) return false;
    let parent = el.parentElement;
    while (parent) {
      if (
        (parent.tagName === "DIV" || parent.tagName === "SPAN") &&
        visible(parent) &&
        isPointerTarget(parent)
      ) {
        const parentText = (parent.textContent || "").replace(/\\s+/g, " ").trim();
        if (parentText === rowText) return false;
      }
      parent = parent.parentElement;
    }
    return true;
  }

  const seen = new Set();
  const results = [];
  let counter = 0;

  function addElement(el) {
    if (!el || seen.has(el) || results.length >= maxElements) return;
    if (interactiveOnly && !visible(el)) return;
    seen.add(el);
    counter += 1;
    const ref = "e" + counter;
    el.setAttribute("data-automation-ref", ref);
    const rect = el.getBoundingClientRect();
    results.push({
      ref,
      role: roleOf(el),
      name: accessibleName(el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120) || null,
      placeholder: el.getAttribute("placeholder"),
      inputType: el.tagName.toLowerCase() === "input" ? el.getAttribute("type") : null,
      visible: visible(el),
      disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
      inViewport: inViewport(el),
      bbox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      selector: '[data-automation-ref="' + ref + '"]',
      index: 0,
    });
  }

  for (const el of document.querySelectorAll(INTERACTIVE)) {
    addElement(el);
  }

  for (const el of document.querySelectorAll("div, span")) {
    if (wrapsSvgIcon(el)) {
      if (
        isPointerTarget(el) ||
        isMenuToggle(el) ||
        el.hasAttribute("aria-expanded") ||
        el.hasAttribute("aria-haspopup")
      ) {
        addElement(el);
      }
      continue;
    }
    if (isPointerMenuRow(el)) {
      addElement(el);
    }
  }

  results.sort((a, b) => Number(b.inViewport) - Number(a.inViewport));
  return results;
}`;

export async function capturePageSnapshot(args: {
  maxDepth: number;
  interactiveOnly: boolean;
  maxElements: number;
}): Promise<{ url: string; title: string; elements: SnapshotElement[] }> {
  const page = await getPage();
  const raw = await page.evaluate(
    ({ script, interactiveOnly, maxElements }) => {
      // Script is a plain function source — eval in page avoids Node/tsx transform leakage.
      const fn = (0, eval)(`(${script})`) as (
        interactiveOnly: boolean,
        maxElements: number
      ) => unknown;
      return fn(interactiveOnly, maxElements);
    },
    {
      script: SNAPSHOT_SCRIPT,
      interactiveOnly: args.interactiveOnly,
      maxElements: args.maxElements,
    }
  );

  if (!Array.isArray(raw)) {
    throw new Error(`Snapshot script returned ${typeof raw}, expected an array`);
  }

  clearRefMap();
  registerRefs(raw.map((item) => ({ ref: item.ref, selector: item.selector, index: item.index })));

  const elements: SnapshotElement[] = raw.map(
    ({ ref, role, name, tag, text, placeholder, inputType, visible, disabled, inViewport, bbox }) => ({
      ref,
      role,
      name,
      tag,
      text,
      placeholder,
      inputType,
      visible,
      disabled,
      inViewport,
      bbox,
    })
  );

  return { url: page.url(), title: await page.title(), elements };
}
