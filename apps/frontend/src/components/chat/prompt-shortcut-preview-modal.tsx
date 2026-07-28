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

/** Lightweight preview — full editable port can replace this later. */
export function PromptShortcutPreviewModal({
  open,
  onClose,
  shortcut,
  onApply,
}: PromptShortcutPreviewModalProps) {
  if (!open || !shortcut) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 dark:bg-black/60">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-black/10 bg-white p-4 text-black-100 shadow-xl dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="m-0 text-base font-semibold">
            {shortcut.icon ? `${shortcut.icon} ` : ""}
            {shortcut.label}
          </h2>
          <button
            type="button"
            className="text-black-40 hover:text-black-100 dark:text-slate-400 dark:hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-black-80 dark:text-slate-300">
          {shortcut.template}
        </pre>
        {onApply && (
          <button
            type="button"
            className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
            onClick={() => {
              onApply(shortcut);
              onClose();
            }}
          >
            Isi ke composer
          </button>
        )}
      </div>
    </div>
  );
}
