import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getAgentRunResults,
  listAgentRuns,
  type AgentRunSummary,
} from "@/lib/api/api-data-runs-api";
import { getApiDataToken } from "@/lib/api-data/token";
import { buildRunEvidence, testCasesFromRunResults } from "@/lib/utils/run-evidence";
import { TestCaseResultStack } from "@/components/chat/test-case-result-stack";
import { AgentScreenshots } from "@/components/evidence/agent-screenshot";
import { AgentVideos } from "@/components/evidence/agent-videos";
import { Badge, Button } from "@/components/chat/ui";

const PAGE_SIZE = 20;

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type RunDetailState = {
  run: AgentRunSummary;
  testCaseResults: ReturnType<typeof testCasesFromRunResults>;
  screenshots?: string[];
  videoUrls?: string[];
  videoUrl?: string;
};

export function RunHistoryView({
  initialRunId,
  embedDetail = true,
}: {
  initialRunId?: number | null;
  /** When false, selecting a run navigates to /history/:runId */
  embedDetail?: boolean;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<AgentRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(initialRunId ?? null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetailState | null>(null);

  const loadList = useCallback(
    async (nextOffset: number, append: boolean) => {
      const token = getApiDataToken();
      if (!token) {
        setListError("Login dulu untuk melihat run history.");
        return;
      }
      setListLoading(true);
      setListError(null);
      try {
        const result = await listAgentRuns(token, {
          limit: PAGE_SIZE,
          offset: nextOffset,
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setTotal(result.total);
        setOffset(result.offset + result.items.length);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      } catch (e) {
        setListError(e instanceof Error ? e.message : String(e));
      } finally {
        setListLoading(false);
      }
    },
    [statusFilter]
  );

  const loadDetail = useCallback(async (runId: number) => {
    const token = getApiDataToken();
    if (!token) {
      setDetailError("Login dulu untuk melihat detail run.");
      return;
    }
    setSelectedId(runId);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const results = await getAgentRunResults(token, runId);
      const bundled = buildRunEvidence(results);
      const testCaseResults = testCasesFromRunResults(results.cases, bundled.evidence);
      setDetail({
        run: {
          runId: results.run.runId,
          agentJobId: results.run.agentJobId,
          status: results.run.status ?? "",
          outcome: results.run.outcome,
          platform: results.run.platform,
          summary: results.run.summary,
          createdAt: results.run.createdAt,
          finishedAt: results.run.finishedAt,
        },
        testCaseResults,
        screenshots: bundled.screenshots,
        videoUrls: bundled.videoUrls,
        videoUrl: bundled.videoUrl,
      });
    } catch (e) {
      setDetail(null);
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setDetail(null);
    setSelectedId(initialRunId ?? null);
    void loadList(0, false);
  }, [statusFilter, loadList, initialRunId]);

  useEffect(() => {
    if (initialRunId == null) return;
    void loadDetail(initialRunId);
  }, [initialRunId, loadDetail]);

  const hasMore = items.length < total;

  const onSelectRun = (runId: number) => {
    if (embedDetail) {
      void loadDetail(runId);
      return;
    }
    navigate(`/history/${runId}`);
  };

  return (
    <div className="flex min-h-[70vh] flex-col gap-0 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)] md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-black/10 dark:border-white/8 md:w-[320px] md:border-b-0 md:border-r dark:border-white/8">
        <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/8 px-3 py-2">
          <label className="text-[0.7rem] text-black-40 dark:text-slate-500" htmlFor="run-status-filter">
            Status
          </label>
          <select
            id="run-status-filter"
            className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black-100 dark:border-white/10 dark:bg-black/40 dark:text-slate-200"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua</option>
            <option value="FINISHED">FINISHED</option>
            <option value="ERROR">ERROR</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RUNNING">RUNNING</option>
            <option value="QUEUED">QUEUED</option>
          </select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listError ? <p className="p-3 text-xs text-red-400">{listError}</p> : null}
          {!listLoading && !items.length && !listError ? (
            <p className="p-3 text-xs text-black-40 dark:text-slate-500">Belum ada run.</p>
          ) : null}
          <ul className="m-0 list-none p-0">
            {items.map((run) => (
              <li key={run.runId}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 border-b border-black/5 dark:border-white/5 px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedId === run.runId ? "bg-blue-500/15" : ""
                  }`}
                  onClick={() => onSelectRun(run.runId)}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-black-100 dark:text-slate-100">#{run.runId}</span>
                    <Badge variant="default" className="text-[0.6rem]">
                      {run.status}
                    </Badge>
                    {run.outcome ? (
                      <Badge variant="info" className="text-[0.6rem]">
                        {run.outcome}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="truncate text-[0.65rem] text-black-40 dark:text-slate-500">
                    {formatWhen(run.createdAt ?? run.finishedAt)}
                  </span>
                  {run.summary ? (
                    <span className="line-clamp-2 text-[0.7rem] text-black-40 dark:text-slate-400">{run.summary}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <div className="p-2">
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                disabled={listLoading}
                onClick={() => void loadList(offset, true)}
              >
                {listLoading ? "Memuat…" : "Load more"}
              </Button>
            </div>
          ) : null}
          {listLoading && !items.length ? (
            <p className="p-3 text-xs text-black-40 dark:text-slate-500">Memuat…</p>
          ) : null}
        </div>
      </aside>

      {embedDetail ? (
        <section className="min-h-0 flex-1 overflow-y-auto p-4">
          <RunDetailPanel
            selectedId={selectedId}
            detailLoading={detailLoading}
            detailError={detailError}
            detail={detail}
          />
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-black-40 dark:text-slate-500">
          Pilih run untuk membuka detail, atau buka{" "}
          <Link className="mx-1 text-blue-600 underline dark:text-blue-400" to="/history">
            daftar
          </Link>
          .
        </section>
      )}
    </div>
  );
}

export function RunDetailPanel({
  selectedId,
  detailLoading,
  detailError,
  detail,
}: {
  selectedId: number | null;
  detailLoading: boolean;
  detailError: string | null;
  detail: RunDetailState | null;
}) {
  if (!selectedId) {
    return <p className="text-sm text-black-40 dark:text-slate-500">Pilih run di daftar kiri.</p>;
  }
  if (detailLoading) {
    return <p className="text-sm text-black-40 dark:text-slate-500">Memuat detail…</p>;
  }
  if (detailError) {
    return <p className="text-sm text-red-400">{detailError}</p>;
  }
  if (!detail) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="m-0 text-sm font-semibold text-black-100 dark:text-slate-100">Run #{detail.run.runId}</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant="info">{detail.run.status}</Badge>
          {detail.run.outcome ? <Badge variant="default">{detail.run.outcome}</Badge> : null}
          {detail.run.platform ? <Badge variant="default">{detail.run.platform}</Badge> : null}
        </div>
        <p className="mt-2 text-xs text-black-40 dark:text-slate-500">
          Job {detail.run.agentJobId} · {formatWhen(detail.run.createdAt)}
        </p>
        {detail.run.summary ? (
          <p className="mt-2 text-sm text-black-80 dark:text-slate-300">{detail.run.summary}</p>
        ) : null}
      </div>
      {detail.testCaseResults.length ? (
        <TestCaseResultStack testCaseResults={detail.testCaseResults} />
      ) : (
        <>
          {detail.screenshots?.length ? <AgentScreenshots urls={detail.screenshots} /> : null}
          {!detail.screenshots?.length && !detail.videoUrl && !detail.videoUrls?.length ? (
            <p className="text-sm text-black-40 dark:text-slate-500">Tidak ada evidence.</p>
          ) : null}
        </>
      )}
      {(detail.videoUrls?.length || detail.videoUrl) && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-black-80 dark:text-slate-300">Videos</div>
          {(detail.videoUrls ?? (detail.videoUrl ? [detail.videoUrl] : [])).map((v) => (
            <AgentVideos key={v} url={v} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Standalone detail loader for /history/:runId */
export function RunHistoryDetailPage() {
  const { runId: runIdParam } = useParams();
  const runId = Number(runIdParam);
  const navigate = useNavigate();
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetailState | null>(null);

  useEffect(() => {
    if (!Number.isFinite(runId) || runId <= 0) {
      setDetailError("Run id tidak valid.");
      setDetailLoading(false);
      return;
    }
    const token = getApiDataToken();
    if (!token) {
      setDetailError("Login dulu untuk melihat detail run.");
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getAgentRunResults(token, runId)
      .then((results) => {
        if (cancelled) return;
        const bundled = buildRunEvidence(results);
        setDetail({
          run: {
            runId: results.run.runId,
            agentJobId: results.run.agentJobId,
            status: results.run.status ?? "",
            outcome: results.run.outcome,
            platform: results.run.platform,
            summary: results.run.summary,
            createdAt: results.run.createdAt,
            finishedAt: results.run.finishedAt,
          },
          testCaseResults: testCasesFromRunResults(results.cases, bundled.evidence),
          screenshots: bundled.screenshots,
          videoUrls: bundled.videoUrls,
          videoUrl: bundled.videoUrl,
        });
      })
      .catch((e) => {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">
          Run #{Number.isFinite(runId) ? runId : "—"}
        </h1>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate("/history")}>
          Kembali ke history
        </Button>
      </div>
      <div className="rounded-xl border border-black/10 bg-white dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)] p-4">
        <RunDetailPanel
          selectedId={Number.isFinite(runId) ? runId : null}
          detailLoading={detailLoading}
          detailError={detailError}
          detail={detail}
        />
      </div>
    </div>
  );
}
