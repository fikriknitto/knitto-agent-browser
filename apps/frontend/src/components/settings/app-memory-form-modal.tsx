import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import {
  saveAppMemory,
  useAppMemoryDetail,
  type MemoryKind,
} from "@/hooks/app-memory/use-app-memories";
import { MarkdownEditor } from "@/components/chat/markdown-editor";
import { modalBackdrop, modalHeader, modalTitle } from "@/lib/utils/ui";
import { Button, Input, Label } from "@/components/chat/ui";

type AppMemoryFormModalProps = {
  mode: "create" | "edit";
  memory: AppMemorySummary | null;
  memoryKind?: MemoryKind;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AppMemoryFormModal({
  mode,
  memory,
  memoryKind = "browser",
  open,
  onClose,
  onSaved,
}: AppMemoryFormModalProps) {
  const editingAppId = open && mode === "edit" ? memory?.appId ?? null : null;
  const detail = useAppMemoryDetail(memoryKind, editingAppId);
  const loadedMemory = detail.data;
  const detailReady =
    mode === "create" ||
    Boolean(loadedMemory && memory && loadedMemory.appId === memory.appId);

  const [appId, setAppId] = useState("");
  const [content, setContent] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isBusy = saving || (mode === "edit" && !detailReady);
  const editorReady = mode === "create" ? open : initializedFor === memory?.appId;

  useEffect(() => {
    if (!open) {
      setInitializedFor(null);
      return;
    }

    if (mode === "create") {
      setAppId("");
      setContent("");
      setInitializedFor("create");
      setError("");
      return;
    }

    if (!detailReady || !loadedMemory || !memory) return;

    setAppId(loadedMemory.appId);
    setContent(loadedMemory.content);
    setInitializedFor(loadedMemory.appId);
    setError("");
  }, [open, mode, detailReady, loadedMemory, memory]);

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

  if (!open) return null;

  const handleSave = async () => {
    const trimmedId = appId.trim();
    if (!trimmedId) {
      setError("appId wajib diisi.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveAppMemory(
        memoryKind,
        mode,
        mode === "create" ? trimmedId : memory!.appId,
        content
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan app memory");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={() => !isBusy && onClose()} />
      <div
        className="relative z-[1] flex max-h-[min(92vh,720px)] w-[min(92vw,1080px)] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
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
            className="border-0 bg-transparent text-xl text-slate-300"
            aria-label="Tutup"
            disabled={isBusy}
            onClick={onClose}
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
              Disimpan sebagai <code className="text-slate-400">{`${appId || "…"}.md`}</code> di
              folder {memoryKind === "mobile" ? "memory/mobile" : "memory"}.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <Label>Konten markdown</Label>
            {mode === "edit" && detail.isError ? (
              <p className="m-0 text-sm text-red-400">
                {detail.error?.message ?? "Gagal memuat konten memory"}
              </p>
            ) : mode === "edit" && !editorReady ? (
              <p className="m-0 text-sm text-slate-500">Memuat konten…</p>
            ) : (
              <MarkdownEditor
                key={mode === "edit" ? memory?.appId : "create"}
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
          <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onClose}>
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
