import { XMLParser } from "fast-xml-parser";
import type { Browser } from "webdriverio";
import mobileConfig from "../config.js";
import { getAutomationJobId } from "../job-context.js";
import { getMobileJobUdid } from "../session/mobile-job-context.js";

export type SnapshotElement = {
  ref: string;
  className: string | null;
  text: string | null;
  contentDesc: string | null;
  resourceId: string | null;
  clickable: boolean;
  editable: boolean;
  enabled: boolean;
  bbox: { x: number; y: number; width: number; height: number } | null;
  xpath: string;
};

// Scoped per job (getAutomationJobId()) — this module is loaded once per
// backend process, and the OpenAI-agent path runs mobile tools in-process
// (createInProcessMobileMcpClient, see core/mcp/hybrid-mcp-client.ts), so
// concurrent mobile jobs share this module. A single unscoped Map/counter
// would let one job's mobile_tap/mobile_input_text resolve a ref against
// another job's page tree. Falls back to a shared "__default" scope when no
// job id is set (e.g. direct/unit-test usage) to preserve prior behavior.
const DEFAULT_SCOPE = "__default";
const refMapsByJob = new Map<string, Map<string, string>>();

function currentScope(): string {
  return getAutomationJobId() ?? DEFAULT_SCOPE;
}

function resetRefs(): Map<string, string> {
  const map = new Map<string, string>();
  refMapsByJob.set(currentScope(), map);
  return map;
}

function parseBounds(bounds: string | undefined): SnapshotElement["bbox"] {
  if (!bounds) return null;
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * One entry of fast-xml-parser's `preserveOrder: true` output:
 * `{ [tagName]: OrderedNode[], ":@": { attr: value, ... } }`.
 *
 * preserveOrder matters: Appium UiAutomator2's getPageSource() names each
 * element after its CLASS (`<android.widget.EditText …>`), so siblings have
 * heterogeneous tag names. The default (grouped-by-tag) parse loses sibling
 * document order across different tags, which would corrupt the positional
 * `/*[i]` xpaths we hand back to Appium for ref-based tap/input.
 */
type OrderedNode = Record<string, unknown>;

const ATTRS_KEY = ":@";
const TEXT_KEY = "#text";

function nodeTag(node: OrderedNode): string | undefined {
  return Object.keys(node).find((key) => key !== ATTRS_KEY && key !== TEXT_KEY);
}

function nodeAttrs(node: OrderedNode): Record<string, string> {
  const attrs = node[ATTRS_KEY];
  if (attrs && typeof attrs === "object") return attrs as Record<string, string>;
  return {};
}

function walkOrderedNode(
  node: OrderedNode,
  elements: SnapshotElement[],
  interactiveOnly: boolean,
  maxElements: number,
  xpath: string,
  scopedRefMap: Map<string, string>,
  counter: { value: number }
): void {
  if (elements.length >= maxElements) return;

  const tag = nodeTag(node);
  if (!tag) return;

  const attrs = nodeAttrs(node);
  // Appium sets a `class` attribute on every element; `uiautomator dump`'s
  // `<node>` format does too. Fall back to the tag name (which IS the class
  // in Appium's format) when the attribute is missing.
  const className = String(attrs.class ?? (tag === "node" ? "" : tag));
  const text = attrs.text ? String(attrs.text) : null;
  const contentDesc = attrs["content-desc"] ? String(attrs["content-desc"]) : null;
  const resourceId = attrs["resource-id"] ? String(attrs["resource-id"]) : null;
  const clickable = String(attrs.clickable) === "true";
  // UiAutomator2 XML has NO `editable` attribute (verified against a live
  // BlueStacks device + Appium session) — editability must be derived from
  // the class. Keep the attrs.editable check for any source that does
  // provide it (e.g. synthetic fixtures).
  const editable =
    className.includes("EditText") || String(attrs.editable) === "true";
  const enabled = String(attrs.enabled) !== "false";
  const bounds = parseBounds(attrs.bounds ? String(attrs.bounds) : undefined);

  const isInteractive = clickable || editable;
  if (!interactiveOnly || isInteractive) {
    counter.value += 1;
    const ref = `e${counter.value}`;
    elements.push({
      ref,
      className: className || null,
      text,
      contentDesc,
      resourceId,
      clickable,
      editable,
      enabled,
      bbox: bounds,
      xpath,
    });
    scopedRefMap.set(ref, xpath);
  }

  const children = node[tag];
  if (!Array.isArray(children)) return;
  // Positional wildcard xpaths (`/*[i]`) match any tag name, so the same
  // path works against Appium's class-named tags AND `<node>`-style XML.
  let elementIndex = 0;
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const childTag = nodeTag(child as OrderedNode);
    if (!childTag) continue;
    elementIndex += 1;
    walkOrderedNode(
      child as OrderedNode,
      elements,
      interactiveOnly,
      maxElements,
      `${xpath}/*[${elementIndex}]`,
      scopedRefMap,
      counter
    );
  }
}

export function getRefXpath(ref: string): string | undefined {
  return refMapsByJob.get(currentScope())?.get(ref);
}

export async function captureScreenSnapshot(
  driver: Browser,
  opts: { interactiveOnly?: boolean; maxElements?: number } = {}
): Promise<{
  package: string | null;
  activity: string | null;
  udid: string | null;
  elements: Omit<SnapshotElement, "xpath">[];
}> {
  const interactiveOnly = opts.interactiveOnly ?? true;
  const maxElements = opts.maxElements ?? mobileConfig.snapshotMaxElements;

  const scopedRefMap = resetRefs();
  const xml = await driver.getPageSource();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    preserveOrder: true,
  });
  const parsed = parser.parse(xml) as OrderedNode[];

  const elements: SnapshotElement[] = [];
  const hierarchyEntry = Array.isArray(parsed)
    ? parsed.find((entry) => entry && typeof entry === "object" && "hierarchy" in entry)
    : undefined;
  const rootChildren = hierarchyEntry?.hierarchy;
  if (Array.isArray(rootChildren)) {
    const counter = { value: 0 };
    let elementIndex = 0;
    for (const child of rootChildren) {
      if (!child || typeof child !== "object") continue;
      const childTag = nodeTag(child as OrderedNode);
      if (!childTag) continue;
      elementIndex += 1;
      walkOrderedNode(
        child as OrderedNode,
        elements,
        interactiveOnly,
        maxElements,
        `/hierarchy/*[${elementIndex}]`,
        scopedRefMap,
        counter
      );
    }
  }

  const jobId = getAutomationJobId();
  let pkg: string | null = null;
  let activity: string | null = null;
  let udid: string | null = jobId ? (getMobileJobUdid(jobId) ?? null) : null;

  try {
    pkg = await driver.getCurrentPackage();
  } catch {
    // ignore
  }
  try {
    activity = await driver.getCurrentActivity();
  } catch {
    // ignore
  }

  return {
    package: pkg,
    activity,
    udid,
    elements: elements.map(({ xpath: _x, ...rest }) => rest),
  };
}
