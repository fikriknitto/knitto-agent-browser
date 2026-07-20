import type { StorageEntry } from "@knitto/shared";
import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { modalBackdrop, modalHeader, modalTitle } from "../../lib/ui";
import { Button, Input, Label } from "../ui";

type RenameEntryModalProps = {
  entry: StorageEntry | null;
  busy: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function RenameEntryModal({
  entry,
  busy,
  name,
  onNameChange,
  onClose,
  onSubmit,
}: RenameEntryModalProps) {
  useEffect(() => {
    if (!entry) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [entry, busy, onClose]);

  if (!entry) return null;

  const label = entry.type === "folder" ? "folder" : "file";

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
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
        aria-labelledby="rename-entry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="rename-entry-modal-title" className={modalTitle}>
            Ubah nama {label}
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
            Nama baru
            <Input
              type="text"
              value={name}
              autoFocus
              disabled={busy}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </Label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={busy || !name.trim()}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

type DeleteEntryModalProps = {
  entry: StorageEntry | null;
  busy: boolean;
  affectsAttachments?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteEntryModal({
  entry,
  busy,
  affectsAttachments = false,
  onClose,
  onConfirm,
}: DeleteEntryModalProps) {
  useEffect(() => {
    if (!entry) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [entry, busy, onClose]);

  if (!entry) return null;

  const kind = entry.type === "folder" ? "folder" : "file";

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
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
        aria-labelledby="delete-entry-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="delete-entry-modal-title" className={modalTitle}>
            Hapus {kind}
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
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="m-0 text-sm leading-relaxed text-slate-300">
            {entry.type === "folder"
              ? `Hapus folder "${entry.name}" beserta isinya? Tindakan ini tidak dapat dibatalkan.`
              : `Hapus file "${entry.name}"? Tindakan ini tidak dapat dibatalkan.`}
          </p>
          {affectsAttachments && (
            <p className="m-0 text-sm leading-relaxed text-amber-400/90">
              Item ini sedang dilampirkan di prompt — lampiran terkait akan ikut dihapus.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Menghapus…" : "Hapus"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
