import { useAppMemory } from "@/hooks/app-memory/use-app-memories";
import {
  useCreateAppMemory,
  useUpdateAppMemory,
} from "@/hooks/app-memory/use-app-memory-mutations";
import { useMobileAppMemory } from "@/hooks/mobile-app-memory/use-mobile-app-memories";
import {
  useCreateMobileAppMemory,
  useUpdateMobileAppMemory,
} from "@/hooks/mobile-app-memory/use-mobile-app-memory-mutations";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { MarkdownEditor } from "./markdown-editor";
import { Button, Input, Label } from "./ui";

type AppMemoryFormModalProps = {
  mode: "create" | "edit";
  memory: AppMemorySummary | null;
  memoryKind?: "browser" | "mobile";
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
  const editingAppId = open && mode === "edit" ? memory?.appId : null;
  const browserDetail = useAppMemory(memoryKind === "browser" ? editingAppId : null);
  const mobileDetail = useMobileAppMemory(memoryKind === "mobile" ? editingAppId : null);
  const loadedMemory = memoryKind === "mobile" ? mobileDetail.data : browserDetail.data;
  const loadFailed = memoryKind === "mobile" ? mobileDetail.isError : browserDetail.isError;
  const loadError = memoryKind === "mobile" ? mobileDetail.error : browserDetail.error;

  const detailReady =
    mode === "create" ||
    Boolean(loadedMemory && memory && loadedMemory.appId === memory.appId);

  const createBrowser = useCreateAppMemory();
  const updateBrowser = useUpdateAppMemory();
  const createMobile = useCreateMobileAppMemory();
  const updateMobile = useUpdateMobileAppMemory();

  const [appId, setAppId] = useState("");
  const [content, setContent] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [error, setError] = useState("");

  const saving =
    createBrowser.isPending ||
    updateBrowser.isPending ||
    createMobile.isPending ||
    updateMobile.isPending;
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
        if (memoryKind === "mobile") {
          await createMobile.mutateAsync({ appId: trimmedId, content });
        } else {
          await createBrowser.mutateAsync({ appId: trimmedId, content });
        }
      } else if (memory) {
        if (memoryKind === "mobile") {
          await updateMobile.mutateAsync({ appId: memory.appId, input: { content } });
        } else {
          await updateBrowser.mutateAsync({ appId: memory.appId, input: { content } });
        }
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
              Disimpan sebagai <code className="text-slate-400">{`{appId}.md`}</code> di folder{" "}
              {memoryKind === "mobile" ? "memory/mobile" : "memory"}.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <Label>Konten markdown</Label>
            {mode === "edit" && loadFailed ? (
              <p className="m-0 text-sm text-red-400">
                {loadError instanceof Error ? loadError.message : "Gagal memuat konten memory"}
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
