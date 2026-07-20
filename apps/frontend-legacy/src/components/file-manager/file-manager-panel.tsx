import type { StorageEntry } from "@knitto/shared";
import { useCallback, useEffect, useState, type DragEvent } from "react";
import { useMediaLibrary } from "../../hooks/use-media-library";
import { formatBytes, formatItemCount } from "../../lib/file-utils";
import { storagePathAffectsPaths } from "../../lib/prompt-attachment";
import { BreadcrumbNav } from "./breadcrumb-nav";
import type { FileSelectModifiers } from "./file-card";
import { DeleteEntryModal, RenameEntryModal } from "./file-entry-modals";
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
  onEntryDeleted?: (path: string) => void;
  onEntryRenamed?: (oldPath: string, newPath: string) => void;
};

export function FileManagerPanel({
  enabled,
  attachedPaths,
  selectedPaths,
  selectError,
  onSelectEntry,
  onEntryDeleted,
  onEntryRenamed,
}: FileManagerPanelProps) {
  const fm = useMediaLibrary({ enabled });
  const [dragOver, setDragOver] = useState(false);
  const [manageEntry, setManageEntry] = useState<StorageEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<StorageEntry | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StorageEntry | null>(null);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    if (!renameTarget) {
      setRenameName("");
      return;
    }
    setRenameName(renameTarget.name);
  }, [renameTarget]);

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

  const openRename = useCallback((entry: StorageEntry) => {
    setManageEntry(entry);
    setRenameTarget(entry);
  }, []);

  const openDelete = useCallback((entry: StorageEntry) => {
    setManageEntry(entry);
    setDeleteTarget(entry);
  }, []);

  const closeRename = useCallback(() => {
    if (mutating) return;
    setRenameTarget(null);
  }, [mutating]);

  const closeDelete = useCallback(() => {
    if (mutating) return;
    setDeleteTarget(null);
  }, [mutating]);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget || !renameName.trim() || mutating) return;
    setMutating(true);
    try {
      const entry = await fm.renameEntry(renameTarget.path, renameName);
      if (entry) {
        onEntryRenamed?.(renameTarget.path, entry.path);
        setManageEntry(entry);
      }
      setRenameTarget(null);
    } catch {
      // error surfaced by hook
    } finally {
      setMutating(false);
    }
  }, [fm, mutating, onEntryRenamed, renameName, renameTarget]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || mutating) return;
    setMutating(true);
    try {
      await fm.deleteEntry(deleteTarget.path);
      onEntryDeleted?.(deleteTarget.path);
      setManageEntry(null);
      setDeleteTarget(null);
    } catch {
      // error surfaced by hook
    } finally {
      setMutating(false);
    }
  }, [deleteTarget, fm, mutating, onEntryDeleted]);

  const displayError = selectError ?? fm.error;
  const deleteAffectsAttachments = deleteTarget
    ? storagePathAffectsPaths(deleteTarget.path, attachedPaths)
    : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-1">
      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-400">
        <span>
          {formatItemCount(fm.summary.itemCount)} · {formatBytes(fm.summary.totalBytes)} Total
        </span>
        {manageEntry && (
          <span className="text-blue-300/90">
            Dikelola: <span className="font-medium text-blue-200">{manageEntry.name}</span>
          </span>
        )}
      </div>

      <BreadcrumbNav path={fm.currentPath} onNavigate={fm.navigate} />

      <FileToolbar
        searchQuery={fm.searchQuery}
        sortField={fm.sortField}
        sortDirection={fm.sortDirection}
        viewMode={fm.viewMode}
        uploading={fm.uploading}
        manageEntry={manageEntry}
        onSearchChange={fm.setSearchQuery}
        onSortFieldChange={fm.setSortField}
        onSortDirectionToggle={() =>
          fm.setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"))
        }
        onViewModeChange={fm.setViewMode}
        onUpload={(files) => void fm.uploadFiles(files)}
        onCreateFolder={fm.createFolder}
        onRenameEntry={() => manageEntry && openRename(manageEntry)}
        onDeleteEntry={() => manageEntry && openDelete(manageEntry)}
      />

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
        managePath={manageEntry?.path ?? null}
        dragOver={dragOver}
        onOpen={fm.openFolder}
        onSelect={handleSelect}
        onRename={openRename}
        onDelete={openDelete}
        onManage={setManageEntry}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      <RenameEntryModal
        entry={renameTarget}
        busy={mutating}
        name={renameName}
        onNameChange={setRenameName}
        onClose={closeRename}
        onSubmit={() => void handleRenameSubmit()}
      />

      <DeleteEntryModal
        entry={deleteTarget}
        busy={mutating}
        affectsAttachments={deleteAffectsAttachments}
        onClose={closeDelete}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
