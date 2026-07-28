import type {
  FlowPlaybook,
  PlaybookMustHave,
  PreconditionMatchStatus,
} from "@knitto/shared";

type SnapshotElement = {
  role?: string | null;
  name?: string | null;
  text?: string | null;
  contentDesc?: string | null;
  resourceId?: string | null;
  inViewport?: boolean;
};

export type BrowserSnapshot = {
  url?: string;
  title?: string;
  elements: SnapshotElement[];
};

export type MobileSnapshot = {
  package?: string | null;
  activity?: string | null;
  elements: SnapshotElement[];
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function contains(haystack: string, needle: string): boolean {
  if (!needle) return true;
  return norm(haystack).includes(norm(needle));
}

function elementMatchesMustHave(element: SnapshotElement, rule: PlaybookMustHave): boolean {
  if (rule.role && !contains(element.role ?? "", rule.role)) return false;
  if (rule.name && !contains(element.name ?? "", rule.name)) return false;
  if (rule.text && !contains(element.text ?? "", rule.text)) return false;
  if (rule.contentDesc && !contains(element.contentDesc ?? "", rule.contentDesc)) return false;
  if (rule.resourceId && !contains(element.resourceId ?? "", rule.resourceId)) return false;
  return true;
}

function countMustHaveMatches(
  elements: SnapshotElement[],
  mustHave: PlaybookMustHave[]
): { matched: number; total: number } {
  if (!mustHave.length) return { matched: 1, total: 1 };
  let matched = 0;
  for (const rule of mustHave) {
    const found = elements.some((el) => elementMatchesMustHave(el, rule));
    if (found) matched += 1;
  }
  return { matched, total: mustHave.length };
}

export function matchBrowserPrecondition(
  playbook: FlowPlaybook,
  snapshot: BrowserSnapshot
): PreconditionMatchStatus {
  const pre = playbook.precondition;
  if (pre.urlIncludes && snapshot.url && !contains(snapshot.url, pre.urlIncludes)) {
    return "mismatch";
  }
  return classifyMustHave(snapshot.elements, pre.mustHave ?? []);
}

export function matchMobilePrecondition(
  playbook: FlowPlaybook,
  snapshot: MobileSnapshot
): PreconditionMatchStatus {
  const pre = playbook.precondition;
  if (pre.package && snapshot.package && !contains(snapshot.package, pre.package)) {
    return "mismatch";
  }
  if (
    pre.activityIncludes &&
    snapshot.activity &&
    !contains(snapshot.activity, pre.activityIncludes)
  ) {
    return "mismatch";
  }
  return classifyMustHave(snapshot.elements, pre.mustHave ?? []);
}

function classifyMustHave(
  elements: SnapshotElement[],
  mustHave: PlaybookMustHave[]
): PreconditionMatchStatus {
  const { matched, total } = countMustHaveMatches(elements, mustHave);
  if (total === 0) return "match";
  if (matched === total) return "match";
  if (matched === 0) return "mismatch";
  const ratio = matched / total;
  if (ratio >= 0.8) return "match";
  if (ratio < 0.5) return "mismatch";
  return "ambiguous";
}

export function compactSnapshotForJudge(
  snapshot: BrowserSnapshot | MobileSnapshot,
  limit = 20
): string {
  const inViewport = snapshot.elements.filter((el) => el.inViewport !== false).slice(0, limit);
  const header =
    "url" in snapshot && snapshot.url
      ? `url: ${snapshot.url}\n`
      : `package: ${(snapshot as MobileSnapshot).package ?? ""} activity: ${(snapshot as MobileSnapshot).activity ?? ""}\n`;
  const lines = inViewport.map((el) => {
    const parts = [
      el.role ? `role=${el.role}` : "",
      el.name ? `name=${el.name}` : "",
      el.text ? `text=${el.text}` : "",
      el.contentDesc ? `desc=${el.contentDesc}` : "",
      el.resourceId ? `id=${el.resourceId}` : "",
    ].filter(Boolean);
    return `- ${parts.join(" ")}`;
  });
  return `${header}${lines.join("\n")}`;
}
