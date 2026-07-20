import type { StorageEntry } from "@knitto/shared";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mediaNavPath } from "../lib/api/api-data-library-api";
import {
  getAgentRunResults,
  getStoredApiDataToken,
  listAgentRuns,
  type AgentRunSummary,
} from "../lib/api/api-data-runs-api";
import { cn } from "../lib/cn";
import { isAcceptedStorageEntry } from "../lib/prompt-attachment";
import { buildRunEvidence, type RunEvidenceItem } from "../lib/run-evidence";
import {
  modalBackdrop,
  modalHeader,
  modalRoot,
  modalShell,
  modalTitle,
} from "../lib/ui";
import type { FileSelectModifiers } from "./file-manager/file-card";
import { FileManagerPanel } from "./file-manager/file-manager-panel";
import { Badge, Button } from "./ui";

type MediaLibraryTab = "uploaded" | "from_run";

type MediaLibraryModalProps = {
  open: boolean;
  slotsLeft: number;
  attachedPaths: string[];
  onClose: () => void;
  onApply: (entries: StorageEntry[]) => Promise<void>;
  onEntryDeleted?: (path: string) => void;
  onEntryRenamed?: (oldPath: string, newPath: string) => void;
};

function isMultiSelectModifier(modifiers: FileSelectModifiers): boolean {
  return modifiers.ctrlKey || modifiers.metaKey;
}

function selectableFiles(
  visibleEntries: StorageEntry[],
  attachedPaths: string[]
): StorageEntry[] {
  const attached = new Set(attachedPaths);
  return visibleEntries.filter(
    (entry) =>
      entry.type === "file" &&
      isAcceptedStorageEntry(entry.name, entry.mimeType) &&
      !attached.has(entry.path)
  );
}

function evidenceToEntry(e: RunEvidenceItem): StorageEntry | null {
  if (!e.url && e.role === "video") {
    // still attachable by mediaId
  }
  const name = e.name?.trim() || `media-${e.mediaId}`;
  const mimeGuess =
    e.role === "screenshot" || e.kind === "image"
      ? "image/png"
      : e.role === "video" || e.kind === "video"
        ? "video/mp4"
        : "application/octet-stream";
  if (!isAcceptedStorageEntry(name, mimeGuess) && e.role === "video") {
    // allow video as file kind via generic octet if blocked — skip videos for attach
    return null;
  }
  if (!isAcceptedStorageEntry(name, mimeGuess)) {
    // try as image/png for screenshots with odd names
    if (e.role === "screenshot" && isAcceptedStorageEntry(`${name}.png`, "image/png")) {
      return {
        id: `media-${e.mediaId}`,
        name: name.includes(".") ? name : `${name}.png`,
        type: "file",
        path: mediaNavPath(e.mediaId),
        mimeType: "image/png",
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }
  return {
    id: `media-${e.mediaId}`,
    name,
    type: "file",
    path: mediaNavPath(e.mediaId),
    mimeType: mimeGuess,
    updatedAt: new Date().toISOString(),
  };
}

const PAGE_SIZE = 20;

export function MediaLibraryModal({
  open,
  slotsLeft,
  attachedPaths,
  onClose,
  onApply,
  onEntryDeleted,
  onEntryRenamed,
}: MediaLibraryModalProps) {
  const [tab, setTab] = useState<MediaLibraryTab>("uploaded");
  const [selected, setSelected] = useState<StorageEntry[]>([]);
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsOffset, setRunsOffset] = useState(0);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [pickedRunId, setPickedRunId] = useState<number | null>(null);
  const [runMedia, setRunMedia] = useState<StorageEntry[]>([]);
  const [runMediaLoading, setRunMediaLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setAnchorPath(null);
      setSelectError(null);
      setApplying(false);
      setTab("uploaded");
      setPickedRunId(null);
      setRunMedia([]);
      setRuns([]);
    }
  }, [open]);

  const loadRuns = useCallback(async (nextOffset: number, append: boolean) => {
    const token = getStoredApiDataToken();
    if (!token) {
      setRunsError("Login API Data dulu.");
      return;
    }
    setRunsLoading(true);
    setRunsError(null);
    try {
      const result = await listAgentRuns(token, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setRunsTotal(result.total);
      setRunsOffset(result.offset + result.items.length);
      setRuns((prev) => (append ? [...prev, ...result.items] : result.items));
    } catch (e) {
      setRunsError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || tab !== "from_run") return;
    setRuns([]);
    setRunsOffset(0);
    void loadRuns(0, false);
  }, [open, tab, loadRuns]);

  const openRunMedia = useCallback(async (runId: number) => {
    const token = getStoredApiDataToken();
    if (!token) return;
    setPickedRunId(runId);
    setRunMediaLoading(true);
    setSelectError(null);
    try {
      const results = await getAgentRunResults(token, runId);
      const bundled = buildRunEvidence(results);
      const entries = bundled.evidence
        .map(evidenceToEntry)
        .filter((e): e is StorageEntry => e != null);
      setRunMedia(entries);
    } catch (e) {
      setRunMedia([]);
      setSelectError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunMediaLoading(false);
    }
  }, []);

  const capSelection = useCallback(
    (entries: StorageEntry[]): StorageEntry[] => {
      if (entries.length > slotsLeft) {
        setSelectError(`Maksimal ${slotsLeft} file dapat dipilih.`);
        return entries.slice(0, slotsLeft);
      }
      setSelectError(null);
      return entries;
    },
    [slotsLeft]
  );

  const handleSelectEntry = useCallback(
    (
      entry: StorageEntry,
      visibleEntries: StorageEntry[],
      modifiers: FileSelectModifiers
    ) => {
      if (entry.type !== "file") return;
      if (attachedPaths.includes(entry.path)) {
        setSelectError("File ini sudah dilampirkan.");
        return;
      }
      if (!isAcceptedStorageEntry(entry.name, entry.mimeType)) return;

      const selectable = selectableFiles(visibleEntries, attachedPaths);

      if (modifiers.shiftKey) {
        const anchor = anchorPath ?? entry.path;
        const paths = selectable.map((item) => item.path);
        const anchorIdx = paths.indexOf(anchor);
        const currentIdx = paths.indexOf(entry.path);

        if (anchorIdx >= 0 && currentIdx >= 0) {
          const [start, end] =
            anchorIdx <= currentIdx ? [anchorIdx, currentIdx] : [currentIdx, anchorIdx];
          setSelected(capSelection(selectable.slice(start, end + 1)));
          setAnchorPath(anchor);
          return;
        }
      }

      if (isMultiSelectModifier(modifiers)) {
        setSelected((prev) => {
          const exists = prev.some((item) => item.path === entry.path);
          if (exists) {
            setSelectError(null);
            return prev.filter((item) => item.path !== entry.path);
          }
          if (prev.length >= slotsLeft) {
            setSelectError(`Maksimal ${slotsLeft} file dapat dipilih.`);
            return prev;
          }
          setSelectError(null);
          return [...prev, entry];
        });
        setAnchorPath(entry.path);
        return;
      }

      setSelected(capSelection([entry]));
      setAnchorPath(entry.path);
    },
    [anchorPath, attachedPaths, capSelection, slotsLeft]
  );

  const toggleRunMedia = (entry: StorageEntry) => {
    if (attachedPaths.includes(entry.path)) {
      setSelectError("File ini sudah dilampirkan.");
      return;
    }
    setSelected((prev) => {
      const exists = prev.some((item) => item.path === entry.path);
      if (exists) {
        setSelectError(null);
        return prev.filter((item) => item.path !== entry.path);
      }
      if (prev.length >= slotsLeft) {
        setSelectError(`Maksimal ${slotsLeft} file dapat dipilih.`);
        return prev;
      }
      setSelectError(null);
      return [...prev, entry];
    });
  };

  const handleApply = async () => {
    if (!selected.length || applying) return;
    setApplying(true);
    setSelectError(null);
    try {
      await onApply(selected);
      setSelected([]);
      setAnchorPath(null);
      onClose();
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Gagal menerapkan lampiran");
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectedPaths = selected.map((entry) => entry.path);
  const selectedSet = new Set(selectedPaths);

  return createPortal(
    <div className={modalRoot} role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={onClose} />
      <div
        className={`${modalShell} h-[90vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-library-modal-title"
      >
        <header className={modalHeader}>
          <h2 id="media-library-modal-title" className={modalTitle}>
            Media library
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className="border-0 bg-transparent text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            onClick={onClose}
          >
            <XIcon size={16} />
          </Button>
        </header>

        <div className="flex gap-1 border-b border-white/8 px-4 pt-1">
          {(
            [
              ["uploaded", "Uploaded"],
              ["from_run", "Dari run"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-t-md px-3 py-2 text-xs font-medium transition",
                tab === id
                  ? "bg-white/10 text-slate-100"
                  : "text-slate-500 hover:text-slate-300"
              )}
              onClick={() => {
                setTab(id);
                setSelected([]);
                setSelectError(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {tab === "uploaded" ? (
            <FileManagerPanel
              enabled={open && tab === "uploaded"}
              slotsLeft={slotsLeft}
              attachedPaths={attachedPaths}
              selectedPaths={selectedPaths}
              selectError={selectError}
              onSelectEntry={handleSelectEntry}
              onEntryDeleted={(path) => {
                const prefix = `${path}/`;
                setSelected((prev) =>
                  prev.filter((item) => item.path !== path && !item.path.startsWith(prefix))
                );
                setAnchorPath((prev) =>
                  prev && (prev === path || prev.startsWith(prefix)) ? null : prev
                );
                onEntryDeleted?.(path);
              }}
              onEntryRenamed={(oldPath, newPath) => {
                setSelected((prev) =>
                  prev.map((item) =>
                    item.path === oldPath
                      ? {
                          ...item,
                          path: newPath,
                          id: newPath,
                          name: newPath.split("/").pop() ?? item.name,
                        }
                      : item
                  )
                );
                setAnchorPath((prev) => (prev === oldPath ? newPath : prev));
                onEntryRenamed?.(oldPath, newPath);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <aside className="flex max-h-[40%] w-full shrink-0 flex-col border-b border-white/8 md:max-h-none md:w-[280px] md:border-b-0 md:border-r">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {runsError ? (
                    <p className="p-3 text-xs text-red-400">{runsError}</p>
                  ) : null}
                  <ul className="m-0 list-none p-0">
                    {runs.map((run) => (
                      <li key={run.runId}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full flex-col gap-0.5 border-b border-white/5 px-3 py-2 text-left text-xs hover:bg-white/5",
                            pickedRunId === run.runId && "bg-blue-500/15"
                          )}
                          onClick={() => void openRunMedia(run.runId)}
                        >
                          <span className="font-semibold text-slate-100">#{run.runId}</span>
                          <span className="flex gap-1">
                            <Badge variant="default" className="text-[0.6rem]">
                              {run.status}
                            </Badge>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {runs.length < runsTotal ? (
                    <div className="p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        disabled={runsLoading}
                        onClick={() => void loadRuns(runsOffset, true)}
                      >
                        Load more
                      </Button>
                    </div>
                  ) : null}
                  {runsLoading && !runs.length ? (
                    <p className="p-3 text-xs text-slate-500">Memuat runs…</p>
                  ) : null}
                </div>
              </aside>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {!pickedRunId ? (
                  <p className="text-sm text-slate-500">Pilih run untuk melihat evidence.</p>
                ) : null}
                {runMediaLoading ? (
                  <p className="text-sm text-slate-500">Memuat media…</p>
                ) : null}
                {selectError && tab === "from_run" ? (
                  <p className="mb-2 text-xs text-red-400">{selectError}</p>
                ) : null}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {runMedia.map((entry) => {
                    const attached = attachedPaths.includes(entry.path);
                    const isSelected = selectedSet.has(entry.path);
                    return (
                      <button
                        key={entry.path}
                        type="button"
                        disabled={attached}
                        title={
                          attached
                            ? `${entry.name} — sudah dilampirkan`
                            : entry.name
                        }
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-[0.7rem] transition",
                          attached && "cursor-not-allowed opacity-40",
                          isSelected
                            ? "border-emerald-500/60 bg-emerald-900/30"
                            : "border-white/10 bg-black/30 hover:border-emerald-500/35"
                        )}
                        onClick={() => toggleRunMedia(entry)}
                      >
                        <span className="line-clamp-2 w-full text-slate-200">{entry.name}</span>
                        <span className="text-[0.6rem] text-slate-500">
                          media:{entry.path.replace("media:", "")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {pickedRunId && !runMediaLoading && !runMedia.length ? (
                  <p className="text-sm text-slate-500">Tidak ada evidence yang bisa dilampirkan.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between gap-4 border-t border-white/8 bg-[rgba(9,12,20,0.65)] px-5 py-3.5">
          <span className="text-[0.82rem] text-slate-400">
            {selected.length > 0
              ? `${selected.length} file dipilih`
              : "Belum ada file dipilih"}
            {tab === "uploaded" && selectError ? (
              <span className="ml-2 text-red-400">{selectError}</span>
            ) : null}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={applying} onClick={onClose}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={!selected.length || applying}
              onClick={() => void handleApply()}
            >
              {applying ? "Menerapkan…" : "Terapkan"}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

/** @deprecated Use MediaLibraryModal */
export const StorageMediaModal = MediaLibraryModal;
