import { FileTextIcon, LayersIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { fillPromptTemplate, type PromptShortcut } from "../lib/prompt-shortcuts";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { Button } from "./ui";

export type PromptShortcutApplyType = "base" | "main";

type PromptShortcutApplyModalProps = {
  shortcut: PromptShortcut | null;
  open: boolean;
  onClose: () => void;
  onChoose: (type: PromptShortcutApplyType, filledText: string) => void;
};

export function PromptShortcutApplyModal({
  shortcut,
  open,
  onClose,
  onChoose,
}: PromptShortcutApplyModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open || !shortcut) return null;

  const filledText = fillPromptTemplate(shortcut.template, shortcut.defaults);

  const handleChoose = (type: PromptShortcutApplyType) => {
    if (!filledText.trim()) {
      onClose();
      return;
    }
    onChoose(type, filledText);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={onClose} />
      <div
        className="relative z-[1] w-[min(92vw,440px)] overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-shortcut-apply-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} border-b border-white/8 pb-3`}>
          <h2 id="prompt-shortcut-apply-title" className={modalTitle}>
            Terapkan template: {shortcut.label}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="border-0 bg-transparent text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            onClick={onClose}
          >
            <XIcon size={16} />
          </Button>
        </header>

        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="m-0 text-sm text-slate-400">
            Pilih bagaimana template ini diterapkan ke composer.
          </p>

          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/8"
            onClick={() => handleChoose("base")}
          >
            <LayersIcon className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
            <div>
              <div className="text-sm font-medium text-slate-100">System Prompt</div>
              <div className="mt-1 text-xs text-slate-500">
                Instruksi otomasi / template. Ditampilkan sebagai chip di atas editor.
              </div>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/8"
            onClick={() => handleChoose("main")}
          >
            <FileTextIcon className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden />
            <div>
              <div className="text-sm font-medium text-slate-100">Main prompt</div>
              <div className="mt-1 text-xs text-slate-500">
                Instruksi utama di composer. Mengganti isi editor
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
