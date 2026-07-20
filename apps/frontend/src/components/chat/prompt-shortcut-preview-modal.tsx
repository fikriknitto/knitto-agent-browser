import type { PromptShortcut } from "@/lib/prompt-shortcuts";

type PromptShortcutPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  shortcut?: PromptShortcut | null;
  shortcutId?: string | null;
  onApply?: (shortcut: PromptShortcut) => void;
  editable?: boolean;
  onSaved?: (shortcut: PromptShortcut) => void;
};

/** Stub — preview/edit modal not fully ported yet. */
export function PromptShortcutPreviewModal({
  open,
  onClose,
  shortcut,
  onApply,
}: PromptShortcutPreviewModalProps) {
  if (!open || !shortcut) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-white/10 bg-slate-900 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="m-0 text-base font-semibold">
            {shortcut.icon ? `${shortcut.icon} ` : ""}
            {shortcut.label}
          </h2>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose}>
            Close
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-slate-300">{shortcut.template}</pre>
        {onApply && (
          <button
            type="button"
            className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
            onClick={() => onApply(shortcut)}
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
