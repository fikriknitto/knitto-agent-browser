import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button, Input, Textarea } from "@/components/chat/ui";
import { executeSuite } from "@/lib/api/executor-api";
import {
  generateSuggestionsFromDiscovery,
  generateSuggestionsFromRun,
} from "@/lib/api/feedback-api";
import {
  createGenerationRun,
  listGenerationRuns,
  type QaGenerationRun,
} from "@/lib/api/generation-api";
import {
  createTextDocument,
  deleteDocument,
  ingestGenerationRun,
  listDocuments,
  uploadDocument,
  type QaDocument,
  type QaRequirementItem,
} from "@/lib/api/document-api";
import {
  getDiscoveryReport,
  runDiscovery,
  type QaDiscoveryResult,
} from "@/lib/api/discovery-api";
import {
  approveCase,
  approveSuite,
  generateSuite,
  listCasesBySuite,
  listSuitesByRun,
  rejectCase,
  type QaTestCaseDetail,
  type QaTestSuite,
} from "@/lib/api/test-authoring-api";

// Halaman upload dokumen + teks bebas + trigger ingestion (docs/plan/pipeline.md §Kelompok A).
// Ingestion di sini berjalan sinkron (request/response), belum lewat RabbitMQ subscriber --
// lihat catatan di ingest-run.use-case.ts. Discovery/Planning/Generation menyusul di
// Langkah 4-5 (belum ada UI-nya di sini).

export default function SettingsRequirementsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<QaGenerationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<QaDocument[]>([]);
  const [requirementItems, setRequirementItems] = useState<QaRequirementItem[]>([]);
  const [discoveryResults, setDiscoveryResults] = useState<QaDiscoveryResult[]>([]);
  const [suite, setSuite] = useState<QaTestSuite | null>(null);
  const [cases, setCases] = useState<QaTestCaseDetail[]>([]);
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadRuns = async () => {
    try {
      setRuns(await listGenerationRuns());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat generation runs");
    }
  };

  const reloadCases = async (suiteId: number) => {
    setCases(await listCasesBySuite(suiteId));
  };

  const reloadRunDetail = async (runId: number) => {
    try {
      setDocuments(await listDocuments(runId));
      setDiscoveryResults(await getDiscoveryReport(runId));
      const suites = await listSuitesByRun(runId);
      const latest = suites[0] ?? null;
      setSuite(latest);
      if (latest) await reloadCases(latest.id);
      else setCases([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dokumen");
    }
  };

  useEffect(() => {
    void reloadRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId != null) void reloadRunDetail(selectedRunId);
  }, [selectedRunId]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">
          Requirements &amp; Generation
        </h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Upload BRD/PRD atau catatan bebas per generation run, lalu jalankan ingestion untuk
          memecahnya jadi requirement item bernomor.
        </p>
      </div>

      {error && <p className="m-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="m-0 text-sm font-medium">Generation Runs</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const run = await createGenerationRun({});
                await reloadRuns();
                setSelectedRunId(run.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal membuat generation run");
              }
            }}
          >
            <PlusIcon className="size-3.5" />
            Run baru
          </Button>
        </div>
        <ul className="space-y-1">
          {runs.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                onClick={() => setSelectedRunId(run.id)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                  run.id === selectedRunId
                    ? "bg-black/10 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <span className="font-mono">#{run.id}</span>{" "}
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase dark:bg-white/10">
                  {run.status}
                </span>{" "}
                <span className="text-black-40 dark:text-slate-500">
                  {new Date(run.createdAt).toLocaleString("id-ID")}
                </span>
              </button>
            </li>
          ))}
          {runs.length === 0 && (
            <li className="text-xs italic text-black-40 dark:text-slate-600">Belum ada run.</li>
          )}
        </ul>
      </div>

      {selectedRun && (
        <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
          <p className="m-0 pb-2 text-sm font-medium">
            Dokumen &mdash; run #{selectedRun.id}
          </p>

          <ul className="space-y-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">
                  {doc.filename ?? "(catatan bebas)"}{" "}
                  <span className="text-black-40 dark:text-slate-600">[{doc.kind}]</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    deleteDocument(doc.id).then(() => reloadRunDetail(selectedRun.id))
                  }
                  className="text-red-400 hover:text-red-300"
                  aria-label={`Hapus dokumen ${doc.filename ?? doc.id}`}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </li>
            ))}
            {documents.length === 0 && (
              <li className="text-xs italic text-black-40 dark:text-slate-600">Belum ada dokumen.</li>
            )}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.txt,.md"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  await uploadDocument(selectedRun.id, file);
                  await reloadRunDetail(selectedRun.id);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal upload dokumen");
                } finally {
                  setBusy(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="size-3.5" />
              Upload dokumen (PDF/DOCX/XLSX)
            </Button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-black-60 dark:text-slate-400">
              Catatan bebas / requirement teks
            </label>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              placeholder="Tulis requirement atau catatan tester di sini…"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={async () => {
                if (!freeText.trim()) return;
                try {
                  await createTextDocument(selectedRun.id, { text: freeText.trim() });
                  setFreeText("");
                  await reloadRunDetail(selectedRun.id);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal menyimpan catatan");
                }
              }}
            >
              <PlusIcon className="size-3.5" />
              Simpan catatan
            </Button>
          </div>

          <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/8">
            <Button
              type="button"
              variant="outline"
              disabled={busy || documents.length === 0}
              onClick={async () => {
                setBusy(true);
                try {
                  const items = await ingestGenerationRun(selectedRun.id);
                  setRequirementItems(items);
                  await reloadRuns();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal menjalankan ingestion");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Jalankan Ingestion
            </Button>

            {requirementItems.length > 0 && (
              <ul className="mt-3 space-y-1">
                {requirementItems.map((item) => (
                  <li key={item.id} className="text-xs">
                    <span className="font-mono text-black-60 dark:text-slate-400">
                      {item.requirementCode}
                    </span>{" "}
                    {item.text.length > 140 ? `${item.text.slice(0, 140)}…` : item.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/8">
            <div className="flex items-center justify-between">
              <p className="m-0 text-sm font-medium">Discovery Report</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      setDiscoveryResults(await runDiscovery(selectedRun.id));
                      await reloadRuns();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal menjalankan discovery");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Jalankan Discovery
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || discoveryResults.length === 0}
                  onClick={async () => {
                    try {
                      await generateSuggestionsFromDiscovery(selectedRun.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal generate suggestions");
                    }
                  }}
                >
                  Generate Suggestions
                </Button>
              </div>
            </div>

            <ul className="mt-2 space-y-1">
              {discoveryResults.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      r.matchStatus === "matched"
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {r.matchStatus}
                  </span>
                  <span>{r.serviceName}</span>
                  <span className="text-black-40 dark:text-slate-600">
                    ({r.evidenceRequirementIds.length} requirement)
                  </span>
                  {r.gapNotes && (
                    <span className="italic text-black-40 dark:text-slate-600">
                      — {r.gapNotes}
                    </span>
                  )}
                </li>
              ))}
              {discoveryResults.length === 0 && (
                <li className="text-xs italic text-black-40 dark:text-slate-600">
                  Belum dijalankan.
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/8">
            <div className="flex items-center justify-between">
              <p className="m-0 text-sm font-medium">
                Test Suite{" "}
                {suite && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      suite.status === "approved"
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    {suite.status}
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || discoveryResults.length === 0}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const s = await generateSuite(selectedRun.id);
                      setSuite(s);
                      await reloadCases(s.id);
                      await reloadRuns();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal generate suite");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Generate Test Suite
                </Button>
                {suite && suite.status === "draft" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        const s = await approveSuite(suite.id);
                        setSuite(s);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Gagal approve suite");
                      }
                    }}
                  >
                    Approve Suite
                  </Button>
                )}
                {suite && suite.status === "approved" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const { run } = await executeSuite(suite.id);
                        await generateSuggestionsFromRun(run.runId).catch(() => undefined);
                        navigate(`/history/${run.runId}`);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Gagal eksekusi suite");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Execute Suite (API)
                  </Button>
                )}
              </div>
            </div>

            <ul className="mt-2 space-y-2">
              {cases.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-black/10 px-2 py-1.5 dark:border-white/8"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{c.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                          c.status === "approved"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : c.status === "rejected"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : "bg-black/5 dark:bg-white/10"
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.isNew && (
                        <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                          new
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="m-0 mt-1 text-[11px] text-black-40 dark:text-slate-500">
                    {c.type} &middot; {c.platform} &middot; {c.priority} &middot;{" "}
                    {c.requirementIds.length} requirement
                  </p>
                  {c.status === "draft" && (
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:underline dark:text-green-400"
                        onClick={async () => {
                          await approveCase(c.id);
                          if (suite) await reloadCases(suite.id);
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={async () => {
                          await rejectCase(c.id);
                          if (suite) await reloadCases(suite.id);
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {cases.length === 0 && (
                <li className="text-xs italic text-black-40 dark:text-slate-600">
                  Belum ada test case, klik Generate Test Suite.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
