import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { modalBackdrop, modalHeader, modalTitle } from "../../lib/ui";
import { Button, ButtonIcon } from "../ui";

type PromptTemplateModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PromptTemplateModal({ open, onClose }: PromptTemplateModalProps) {
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={onClose} />
      <div
        className="relative z-[1] flex max-h-[92vh] w-[80vw] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-template-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} shrink-0 border-b border-white/8 pb-3`}>
          <h2 id="prompt-template-modal-title" className={modalTitle}>
            Template
          </h2>
          <ButtonIcon
            type="button"
            className="h-8 w-8 min-w-0 border-0 bg-transparent! text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
            aria-label="Tutup"
            onClick={onClose}
          >
            <XIcon size={16} />
          </ButtonIcon>
        </header>
        <div className="min-h-[200px] px-5 py-4">
          
        </div>
        <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-4">
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
