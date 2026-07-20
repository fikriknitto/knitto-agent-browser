import type { DragEvent, MouseEvent } from "react";
import type { StorageEntry } from "@knitto/shared";
import type { ViewMode } from "../../hooks/use-media-library";
import { cn } from "../../lib/cn";
import { FileCard, type FileSelectModifiers } from "./file-card";

type FileGridProps = {
  entries: StorageEntry[];
  viewMode: ViewMode;
  loading: boolean;
  selectedPaths: string[];
  attachedPaths: string[];
  managePath?: string | null;
  dragOver: boolean;
  onOpen: (entry: StorageEntry) => void;
  onSelect: (entry: StorageEntry, modifiers: FileSelectModifiers) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onRename?: (entry: StorageEntry) => void;
  onDelete?: (entry: StorageEntry) => void;
  onManage?: (entry: StorageEntry) => void;
};

export function FileGrid({
  entries,
  viewMode,
  loading,
  selectedPaths,
  attachedPaths,
  managePath,
  dragOver,
  onOpen,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRename,
  onDelete,
  onManage,
}: FileGridProps) {
  const empty = !loading && entries.length === 0;
  const selectedSet = new Set(selectedPaths);
  const attachedSet = new Set(attachedPaths);

  const handleMouseDown = (event: MouseEvent) => {
    if (event.shiftKey) event.preventDefault();
  };

  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 select-none overflow-auto rounded-[10px] border border-white/6 bg-[rgba(9,12,20,0.55)]",
        dragOver && "border-blue-500/55 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.15)]"
      )}
      onMouseDown={handleMouseDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragOver && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-slate-900/82 text-[0.95rem] font-semibold text-blue-300"
          aria-hidden="true"
        >
          Lepaskan file untuk mengunggah
        </div>
      )}

      {loading && entries.length === 0 ? (
        <p className="flex min-h-48 flex-col items-center justify-center p-8 text-center text-slate-400">
          Memuat…
        </p>
      ) : empty ? (
        <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center text-slate-400">
          <p>Folder kosong</p>
          <p className="mt-1.5 max-w-md text-[0.82rem] text-slate-500">
            Unggah file atau buat folder baru. Anda juga bisa drag & drop ke sini.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 p-4"
              : "flex flex-col py-1"
          }
          role="list"
        >
          {entries.map((entry) => (
            <FileCard
              key={entry.id}
              entry={entry}
              viewMode={viewMode}
              selected={selectedSet.has(entry.path)}
              managed={managePath === entry.path}
              alreadyAttached={attachedSet.has(entry.path)}
              onOpen={onOpen}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onManage={onManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
