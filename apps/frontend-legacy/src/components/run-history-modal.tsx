import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getAgentRunResults,
  getStoredApiDataToken,
  listAgentRuns,
  type AgentRunSummary,
} from "../lib/api/api-data-runs-api";
import {
  buildRunEvidence,
  testCasesFromRunResults,
} from "../lib/run-evidence";
import {
  modalBackdrop,
  modalHeader,
  modalRoot,
  modalShell,
  modalTitle,
} from "../lib/ui";
import { TestCaseResultStack } from "./test-case-result-stack";
import { AgentScreenshots } from "./agent-screenshot";
import { AgentVideos } from "./agent-videos";
import { Badge, Button } from "./ui";

const PAGE_SIZE = 20;

type RunHistoryModalProps = {
  open: boolean;
  initialRunId?: number | null;
  onClose: () => void;
};

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function RunHistoryModal({ open, initialRunId, onClose }: RunHistoryModalProps) {
  const [items, setItems] = useState<AgentRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    run: AgentRunSummary
    testCaseResults: ReturnType<typeof testCasesFromRunResults>
    screenshots?: string[]
    videoUrls?: string[]
    videoUrl?: string
  } | null>(null);

  const loadList = useCallback(
    async (nextOffset: number, append: boolean) => {
      const token = getStoredApiDataToken();
      if (!token) {
        setListError("Login API Data dulu.");
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
    const token = getStoredApiDataToken();
    if (!token) {
      setDetailError("Login API Data dulu.");
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
    if (!open) return;
    setItems([]);
    setOffset(0);
    setDetail(null);
    setSelectedId(initialRunId ?? null);
    void loadList(0, false);
  }, [open, statusFilter, loadList, initialRunId]);

  useEffect(() => {
    if (!open || initialRunId == null) return;
    void loadDetail(initialRunId);
  }, [open, initialRunId, loadDetail]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasMore = items.length < total;

  return createPortal(
    <div className={modalRoot} role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={onClose} />
      <div
        className={`${modalShell} h-[90vh] max-w-[1100px]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-history-modal-title"
      >
        <header className={modalHeader}>
          <h2 id="run-history-modal-title" className={modalTitle}>
            Run history
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className="border-0 bg-transparent text-xl text-slate-300"
            aria-label="Tutup"
            onClick={onClose}
          >
            <XIcon size={16} />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-0 md:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b border-white/8 md:w-[320px] md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <label className="text-[0.7rem] text-slate-500" htmlFor="run-status-filter">
                Status
              </label>
              <select
                id="run-status-filter"
                className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-slate-200"
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
              {listError ? (
                <p className="p-3 text-xs text-red-400">{listError}</p>
              ) : null}
              {!listLoading && !items.length && !listError ? (
                <p className="p-3 text-xs text-slate-500">Belum ada run.</p>
              ) : null}
              <ul className="m-0 list-none p-0">
                {items.map((run) => (
                  <li key={run.runId}>
                    <button
                      type="button"
                      className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-3 py-2.5 text-left transition hover:bg-white/5 ${
                        selectedId === run.runId ? "bg-blue-500/15" : ""
                      }`}
                      onClick={() => void loadDetail(run.runId)}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-100">
                          #{run.runId}
                        </span>
                        <Badge variant="default" className="text-[0.6rem]">
                          {run.status}
                        </Badge>
                        {run.outcome ? (
                          <Badge variant="info" className="text-[0.6rem]">
                            {run.outcome}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="truncate text-[0.65rem] text-slate-500">
                        {formatWhen(run.createdAt ?? run.finishedAt)}
                      </span>
                      {run.summary ? (
                        <span className="line-clamp-2 text-[0.7rem] text-slate-400">
                          {run.summary}
                        </span>
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
                <p className="p-3 text-xs text-slate-500">Memuat…</p>
              ) : null}
            </div>
          </aside>

          <section className="min-h-0 flex-1 overflow-y-auto p-4">
            {!selectedId ? (
              <p className="text-sm text-slate-500">Pilih run di daftar kiri.</p>
            ) : null}
            {detailLoading ? (
              <p className="text-sm text-slate-500">Memuat detail…</p>
            ) : null}
            {detailError ? (
              <p className="text-sm text-red-400">{detailError}</p>
            ) : null}
            {detail && !detailLoading ? (
              <div className="space-y-4">
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-100">
                    Run #{detail.run.runId}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="info">{detail.run.status}</Badge>
                    {detail.run.outcome ? (
                      <Badge variant="default">{detail.run.outcome}</Badge>
                    ) : null}
                    {detail.run.platform ? (
                      <Badge variant="default">{detail.run.platform}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Job {detail.run.agentJobId} · {formatWhen(detail.run.createdAt)}
                  </p>
                  {detail.run.summary ? (
                    <p className="mt-2 text-sm text-slate-300">{detail.run.summary}</p>
                  ) : null}
                </div>
                {detail.testCaseResults.length ? (
                  <TestCaseResultStack testCaseResults={detail.testCaseResults} />
                ) : (
                  <>
                    {detail.screenshots?.length ? (
                      <AgentScreenshots urls={detail.screenshots} />
                    ) : null}
                    {(detail.videoUrls?.length || detail.videoUrl) && (
                      <div className="space-y-2">
                        {(detail.videoUrls ?? (detail.videoUrl ? [detail.videoUrl] : [])).map(
                          (v) => (
                            <AgentVideos key={v} url={v} />
                          )
                        )}
                      </div>
                    )}
                    {!detail.screenshots?.length &&
                    !detail.videoUrl &&
                    !detail.videoUrls?.length ? (
                      <p className="text-sm text-slate-500">Tidak ada evidence.</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

