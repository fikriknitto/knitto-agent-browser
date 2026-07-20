import type { TestCaseResult } from "@knitto/shared";
import type { AgentRunCaseItem, AgentRunResults } from "./api/api-data-runs-api";

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
  const vidFromResults = evidence
    .filter((e) => e.role === "video" && e.url)
    .map((e) => e.url!);

  const screenshots = shotFromResults.length ? shotFromResults : fallback.screenshots;
  const videoUrls = vidFromResults.length
    ? vidFromResults
    : fallback.videoUrls;
  const videoUrl = videoUrls?.[0] ?? fallback.videoUrl;

  return {
    evidence,
    ...(screenshots?.length ? { screenshots } : {}),
    ...(videoUrls?.length ? { videoUrls } : {}),
    ...(videoUrl ? { videoUrl } : {}),
  };
}

/** Map evidence onto per-TC results by 1-based caseOrder (aligned with Worker). */
export function applyEvidenceToTestCases(
  testCaseResults: TestCaseResult[] | undefined,
  evidence: RunEvidenceItem[]
): TestCaseResult[] | undefined {
  if (!testCaseResults?.length) return testCaseResults;
  if (!evidence.length) return testCaseResults;

  return testCaseResults.map((tc, index) => {
    const caseOrder = index + 1;
    const forCase = evidence.filter((e) => e.caseOrder === caseOrder && e.url);
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
    if (!orders.length) return [];
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
