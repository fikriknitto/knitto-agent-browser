import { PlusIcon, PencilIcon, Trash2Icon, UploadIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StorageEntry } from "@knitto/shared";
import type { SortDirection, SortField, ViewMode } from "../../hooks/use-media-library";
import { modalBackdrop, modalHeader, modalTitle } from "../../lib/ui";
import { Button, Input, Label, Select } from "../ui";

type FileToolbarProps = {
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
  uploading: boolean;
  onSearchChange: (value: string) => void;
  onSortFieldChange: (value: SortField) => void;
  onSortDirectionToggle: () => void;
  onViewModeChange: (value: ViewMode) => void;
  onUpload: (files: FileList | File[]) => void;
  onCreateFolder: (name: string) => Promise<void>;
  manageEntry?: StorageEntry | null;
  onRenameEntry?: () => void;
  onDeleteEntry?: () => void;
};

function NewFolderModal({
  open,
  busy,
  folderName,
  onFolderNameChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  folderName: string;
  onFolderNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className={modalBackdrop}
        aria-label="Tutup"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className="relative z-[1] w-[min(92vw,420px)] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-folder-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="new-folder-modal-title" className={modalTitle}>
            Folder Baru
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="border-0 bg-transparent text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            disabled={busy}
            onClick={onClose}
          >
            <XIcon size={16} />
          </Button>
        </header>
        <form
          className="flex flex-col gap-4 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Label className="grid gap-2 text-sm text-slate-300">
            Nama folder
            <Input
              type="text"
              placeholder="Nama folder"
              value={folderName}
              autoFocus
              disabled={busy}
              onChange={(event) => onFolderNameChange(event.target.value)}
            />
          </Label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={busy || !folderName.trim()}
            >
              {busy ? "Membuat…" : "Buat"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export function FileToolbar({
  searchQuery,
  sortField,
  sortDirection,
  viewMode,
  uploading,
  onSearchChange,
  onSortFieldChange,
  onSortDirectionToggle,
  onViewModeChange,
  onUpload,
  onCreateFolder,
  manageEntry,
  onRenameEntry,
  onDeleteEntry,
}: FileToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);

  const closeFolderModal = () => {
    if (folderBusy) return;
    setFolderOpen(false);
    setFolderName("");
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim() || folderBusy) return;
    setFolderBusy(true);
    try {
      await onCreateFolder(folderName);
      setFolderName("");
      setFolderOpen(false);
    } catch {
      // error surfaced by parent
    } finally {
      setFolderBusy(false);
    }
  };

  return (
    <div className="flex justify-between items-center w-full mt-6 mb-4">


      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) {
            onUpload(event.target.files);
            event.target.value = "";
          }
        }}
      />
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Label>
            <Input
              type="search"
              className="w-[250px]! h-8! rounded-md!"
              placeholder="Search in this folder"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />

          </Label>

          <div className="flex flex-wrap gap-2">

            <Button
              variant="default"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Mengunggah…" : <><UploadIcon size={16} className="mr-1" /> Upload</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFolderOpen(true)}>
              <PlusIcon size={16} className="mr-1" />
              New Folder
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!manageEntry}
              title={manageEntry ? `Ubah nama ${manageEntry.name}` : "Klik kanan item untuk mengelola"}
              onClick={onRenameEntry}
            >
              <PencilIcon size={16} className="mr-1" />
              Ubah nama
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!manageEntry}
              className="text-red-300 hover:text-red-200"
              title={manageEntry ? `Hapus ${manageEntry.name}` : "Klik kanan item untuk mengelola"}
              onClick={onDeleteEntry}
            >
              <Trash2Icon size={16} className="mr-1" />
              Hapus
            </Button>
          </div>
        </div>

        <NewFolderModal
          open={folderOpen}
          busy={folderBusy}
          folderName={folderName}
          onFolderNameChange={setFolderName}
          onClose={closeFolderModal}
          onSubmit={() => void handleCreateFolder()}
        />

      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <div className="flex items-center gap-1.5">
          <Label>
            <span className="sr-only">Urutkan</span>
            <Select
              className="px-2.5 py-1.5 text-[0.82rem]"
              value={sortField}
              onChange={(event) => onSortFieldChange(event.target.value as SortField)}
            >
              <option value="name">Nama</option>
              <option value="date">Tanggal</option>
              <option value="size">Ukuran</option>
            </Select>
          </Label>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={sortDirection === "asc" ? "Urutan naik" : "Urutan turun"}
            onClick={onSortDirectionToggle}
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        <div className="flex gap-1.5" role="group" aria-label="Tampilan">
          <Button
            variant="ghost"
            size="icon-sm"
            className={viewMode === "grid" ? "border-blue-400/45 bg-blue-500/22 text-blue-200" : undefined}
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            ⊞
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={viewMode === "list" ? "border-blue-400/45 bg-blue-500/22 text-blue-200" : undefined}
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            ☰
          </Button>
        </div>
      </div>

    </div>
  );
}
