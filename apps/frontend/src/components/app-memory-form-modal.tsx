import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import {
  useCreateAppMemory,
  useUpdateAppMemory,
} from "@/hooks/app-memory/use-app-memory-mutations";
import { useAppMemory } from "@/hooks/app-memory/use-app-memories";
import { MarkdownEditor } from "./markdown-editor";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { Button, Input, Label } from "./ui";

type AppMemoryFormModalProps = {
  mode: "create" | "edit";
  memory: AppMemorySummary | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AppMemoryFormModal({
  mode,
  memory,
  open,
  onClose,
  onSaved,
}: AppMemoryFormModalProps) {
  const createMutation = useCreateAppMemory();
  const updateMutation = useUpdateAppMemory();
  const { data: loadedMemory, isLoading: loadingDetail } = useAppMemory(
    open && mode === "edit" ? memory?.appId : null
  );

  const [appId, setAppId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const saving = createMutation.isPending || updateMutation.isPending;
  const isBusy = saving || (mode === "edit" && loadingDetail);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && loadedMemory) {
      setAppId(loadedMemory.appId);
      setContent(loadedMemory.content);
    } else if (mode === "create") {
      setAppId("");
      setContent("");
    }
    setError("");
  }, [open, mode, loadedMemory]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, isBusy, onClose]);

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  if (!open) return null;

  const handleSave = async () => {
    const trimmedId = appId.trim();
    if (!trimmedId) {
      setError("appId wajib diisi.");
      return;
    }

    setError("");
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ appId: trimmedId, content });
      } else if (memory) {
        await updateMutation.mutateAsync({
          appId: memory.appId,
          input: { content },
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan app memory");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={handleClose} />
      <div
        className="relative z-[1] flex max-h-[min(92vh,720px)] w-[min(92vw,720px)] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-memory-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} shrink-0 border-b border-white/8 pb-3`}>
          <h2 id="app-memory-form-title" className={modalTitle}>
            {mode === "create" ? "Buat app memory" : `Edit ${memory?.appId ?? "memory"}`}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="border-0 bg-transparent text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            disabled={isBusy}
            onClick={handleClose}
          >
            <XIcon size={16} />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="app-memory-id">appId</Label>
            <Input
              id="app-memory-id"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="knitto-cms atau 192.168.20.27:11011"
              disabled={mode === "edit" || isBusy}
              className="font-mono"
            />
            <p className="m-0 text-xs text-slate-500">
              Disimpan sebagai <code className="text-slate-400">{`{appId}.md`}</code> di folder memory.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <Label>Konten markdown</Label>
            {mode === "edit" && loadingDetail ? (
              <p className="m-0 text-sm text-slate-500">Memuat konten…</p>
            ) : (
              <MarkdownEditor
                value={content}
                onChange={setContent}
                disabled={isBusy}
                placeholder="# Judul memory&#10;&#10;Catatan locator, flow, dan quirks aplikasi…"
              />
            )}
          </div>

          {error && <p className="m-0 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-white/8 px-5 py-4">
          <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={handleClose}>
            Batal
          </Button>
          <Button type="button" size="sm" disabled={isBusy} onClick={() => void handleSave()}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
