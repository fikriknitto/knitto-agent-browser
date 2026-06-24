import type { StorageEntry } from "@knitto/shared";
import { useCallback, useState, type DragEvent } from "react";
import { useFileManager } from "../../hooks/use-file-manager";
import { formatBytes, formatItemCount } from "../../lib/file-utils";
import { BreadcrumbNav } from "./breadcrumb-nav";
import type { FileSelectModifiers } from "./file-card";
import { FileGrid } from "./file-grid";
import { FileToolbar } from "./file-toolbar";

type FileManagerPanelProps = {
  enabled: boolean;
  slotsLeft: number;
  attachedPaths: string[];
  selectedPaths: string[];
  selectError: string | null;
  onSelectEntry: (
    entry: StorageEntry,
    visibleEntries: StorageEntry[],
    modifiers: FileSelectModifiers
  ) => void;
};

export function FileManagerPanel({
  enabled,
  slotsLeft,
  attachedPaths,
  selectedPaths,
  selectError,
  onSelectEntry,
}: FileManagerPanelProps) {
  const fm = useFileManager({ enabled });
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      if (event.dataTransfer.files.length) {
        void fm.uploadFiles(event.dataTransfer.files);
      }
    },
    [fm]
  );

  const handleSelect = useCallback(
    (entry: StorageEntry, modifiers: FileSelectModifiers) => {
      onSelectEntry(entry, fm.entries, modifiers);
    },
    [fm.entries, onSelectEntry]
  );

  const displayError = selectError ?? fm.error;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-1">
      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-400">
        <span>
          {formatItemCount(fm.summary.itemCount)} · {formatBytes(fm.summary.totalBytes)} Total
        </span>

      </div>

      <div className="flex justify-between">
        <BreadcrumbNav path={fm.currentPath} onNavigate={fm.navigate} />

        <FileToolbar
          searchQuery={fm.searchQuery}
          sortField={fm.sortField}
          sortDirection={fm.sortDirection}
          viewMode={fm.viewMode}
          uploading={fm.uploading}
          onSearchChange={fm.setSearchQuery}
          onSortFieldChange={fm.setSortField}
          onSortDirectionToggle={() =>
            fm.setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"))
          }
          onViewModeChange={fm.setViewMode}
          onUpload={(files) => void fm.uploadFiles(files)}
          onCreateFolder={fm.createFolder}
        />

      </div>
      {displayError && (
        <p className="m-0 text-[0.82rem] text-red-400" role="alert">
          {displayError}
        </p>
      )}

      <FileGrid
        entries={fm.entries}
        viewMode={fm.viewMode}
        loading={fm.loading}
        selectedPaths={selectedPaths}
        attachedPaths={attachedPaths}
        dragOver={dragOver}
        onOpen={fm.openFolder}
        onSelect={handleSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
  );
}
