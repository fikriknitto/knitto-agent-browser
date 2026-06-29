import { XIcon } from "lucide-react";
import { createPortal } from "react-dom";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { Button } from "./ui";

type AppMemoryDeleteModalProps = {
  memory: AppMemorySummary | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AppMemoryDeleteModal({
  memory,
  busy,
  onClose,
  onConfirm,
}: AppMemoryDeleteModalProps) {
  if (!memory) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={busy ? undefined : onClose} />
      <div
        className="relative z-[1] w-[min(92vw,420px)] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-app-memory-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="delete-app-memory-title" className={modalTitle}>
            Hapus app memory
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
            Hapus memory <code className="text-slate-200">{memory.appId}</code> (
            {memory.appId}.md)? Tindakan ini tidak dapat dibatalkan.
          </p>
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
