import type { TestCaseResult } from "@knitto/shared";
import type { AgentRunCaseItem, AgentRunResults } from "@/lib/api/api-data-runs-api";

export type RunEvidenceRole = "screenshot" | "video" | "attachment" | "other";

export type RunEvidenceItem = {
  mediaId: number
  role: RunEvidenceRole
  url?: string
  contentPath?: string
  caseOrder?: number | null
  name?: string
  kind?: string | null
};

export type RunEvidenceBundle = {
  evidence: RunEvidenceItem[]
  screenshots?: string[]
  videoUrl?: string
  videoUrls?: string[]
};

function normalizeRole(role: string): RunEvidenceRole {
  if (role === "screenshot" || role === "video" || role === "attachment") return role;
  return "other";
}

/**
 * Prefer API Data results media (presigned URLs); fall back to Worker disk URLs.
 * Typed `evidence` is the source of truth; string arrays are display adapters only.
 */
export function buildRunEvidence(
  results: AgentRunResults | null | undefined,
  fallback: { screenshots?: string[]; videoUrl?: string; videoUrls?: string[] } = {}
): RunEvidenceBundle {
  const media = results?.media ?? [];
  const evidence: RunEvidenceItem[] = media.map((m) => ({
    mediaId: m.mediaId,
    role: normalizeRole(m.role),
    url: m.url ?? undefined,
    contentPath: m.contentPath,
    caseOrder: m.caseOrder ?? null,
    name: m.name ?? undefined,
    kind: m.kind ?? null,
  }));

  const shotFromResults = evidence
    .filter((e) => e.role === "screenshot" && e.url)
    .map((e) => e.url!);
  const vidFromResults = missionVideoUrls(evidence);
  const fallbackVids =
    fallback.videoUrls?.length
      ? fallback.videoUrls
      : fallback.videoUrl
        ? [fallback.videoUrl]
        : undefined;

  const screenshots = shotFromResults.length ? shotFromResults : fallback.screenshots;
  const videoUrls = vidFromResults.length ? vidFromResults : fallbackVids;
  const videoUrl = videoUrls?.[0] ?? fallback.videoUrl;

  return {
    evidence,
    ...(screenshots?.length ? { screenshots } : {}),
    ...(videoUrls?.length ? { videoUrls } : {}),
    ...(videoUrl ? { videoUrl } : {}),
  };
}

/** All video URLs for a run, sorted by case_order then filename. */
export function missionVideoUrls(evidence: RunEvidenceItem[]): string[] {
  return [...evidence]
    .filter((e) => e.role === "video" && e.url)
    .sort((a, b) => {
      const ao = a.caseOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.caseOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return (a.name ?? "").localeCompare(b.name ?? "");
    })
    .map((e) => e.url!);
}

const EVIDENCE_ID_PREFIX_RE = /^(mission-item-\d+|tc-\d+)/i;

function evidenceIdPrefix(name: string): string | null {
  const m = name.match(EVIDENCE_ID_PREFIX_RE);
  return m ? m[1]!.toLowerCase() : null;
}

/**
 * When caseOrder is null (legacy mission-item-* uploads), map sorted unique
 * filename prefixes onto 1-based case indices.
 */
function orphanPrefixToCaseOrder(
  evidence: RunEvidenceItem[],
  caseCount: number
): Map<string, number> {
  const prefixes = new Set<string>();
  for (const e of evidence) {
    if (e.caseOrder != null || !e.name) continue;
    const prefix = evidenceIdPrefix(e.name);
    if (prefix) prefixes.add(prefix);
  }
  const sorted = [...prefixes].sort((a, b) => {
    const na = Number(a.match(/(\d+)$/)?.[1] ?? 0);
    const nb = Number(b.match(/(\d+)$/)?.[1] ?? 0);
    return na - nb || a.localeCompare(b);
  });
  const map = new Map<string, number>();
  sorted.forEach((prefix, i) => {
    if (i < caseCount) map.set(prefix, i + 1);
  });
  return map;
}

function nameMatchesId(name: string, id: string): boolean {
  const n = name.toLowerCase();
  const i = id.trim().toLowerCase();
  if (!i) return false;
  return n === i || n.startsWith(`${i}.`) || n.startsWith(`${i}-`);
}

/** Map evidence onto per-TC results by 1-based caseOrder (aligned with Worker). */
export function applyEvidenceToTestCases(
  testCaseResults: TestCaseResult[] | undefined,
  evidence: RunEvidenceItem[]
): TestCaseResult[] | undefined {
  if (!testCaseResults?.length) return testCaseResults;
  if (!evidence.length) return testCaseResults;

  const orphanMap = orphanPrefixToCaseOrder(evidence, testCaseResults.length);

  return testCaseResults.map((tc, index) => {
    const caseOrder = index + 1;
    const forCase = evidence.filter((e) => {
      if (!e.url) return false;
      if (e.caseOrder === caseOrder) return true;
      if (e.caseOrder != null) return false;
      if (nameMatchesId(e.name ?? "", tc.testCaseId)) return true;
      const prefix = e.name ? evidenceIdPrefix(e.name) : null;
      return prefix != null && orphanMap.get(prefix) === caseOrder;
    });
    const shots = forCase
      .filter((e) => e.role === "screenshot")
      .map((e) => e.url!);
    const video = forCase.find((e) => e.role === "video")?.url;

    return {
      ...tc,
      screenshots: shots.length ? shots : tc.screenshots,
      videoUrl: video ?? tc.videoUrl,
    };
  });
}

function mapApiCaseStatus(status: string | undefined): TestCaseResult["status"] {
  if (status === "PASSED") return "completed";
  if (status === "ERROR") return "error";
  if (status === "SKIPPED") return "skipped";
  if (status === "RUNNING") return "running";
  return "completed";
}

/** Build TC stack from Results API cases + evidence (for history detail). */
export function testCasesFromRunResults(
  cases: AgentRunCaseItem[] | undefined,
  evidence: RunEvidenceItem[]
): TestCaseResult[] {
  if (!cases?.length) {
    // Fallback: synthesize one TC per distinct caseOrder in evidence
    const orders = [
      ...new Set(
        evidence
          .map((e) => e.caseOrder)
          .filter((n): n is number => n != null && n > 0)
      ),
    ].sort((a, b) => a - b);
    if (!orders.length) {
      // Legacy: orphan prefixes only
      const orphanMap = orphanPrefixToCaseOrder(evidence, 64);
      const syntheticOrders = [...new Set(orphanMap.values())].sort((a, b) => a - b);
      if (!syntheticOrders.length) return [];
      const synthetic: TestCaseResult[] = syntheticOrders.map((order) => {
        const prefix =
          [...orphanMap.entries()].find(([, o]) => o === order)?.[0] ?? `case-${order}`;
        return {
          testCaseId: prefix,
          title: `Test Case ${order}`,
          platform: "browser",
          status: "completed",
          summary: "",
        };
      });
      return applyEvidenceToTestCases(synthetic, evidence) ?? [];
    }
    const synthetic: TestCaseResult[] = orders.map((order) => ({
      testCaseId: `case-${order}`,
      title: `Test Case ${order}`,
      platform: "browser",
      status: "completed",
      summary: "",
    }));
    return applyEvidenceToTestCases(synthetic, evidence) ?? [];
  }

  const mapped: TestCaseResult[] = [...cases]
    .sort((a, b) => a.caseOrder - b.caseOrder)
    .map((c) => ({
      testCaseId: String(c.testCaseId ?? c.caseOrder),
      title: c.title?.trim() || `Test Case ${c.caseOrder}`,
      platform: "browser" as const,
      status: mapApiCaseStatus(c.status),
      summary: c.summary?.trim() || "",
    }));

  return applyEvidenceToTestCases(mapped, evidence) ?? mapped;
}
