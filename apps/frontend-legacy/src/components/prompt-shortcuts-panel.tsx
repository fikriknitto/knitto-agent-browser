import { usePromptShortcuts } from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import { useState } from "react";
import type { PromptShortcut } from "../lib/prompt-shortcuts";
import { PromptShortcutApplyModal } from "./prompt-shortcut-apply-modal";
import { PromptShortcutPreviewModal } from "./prompt-shortcut-preview-modal";
import { PromptShortcutItem } from "./prompt-shortcut-item";

type PromptShortcutsPanelProps = {
  disabled?: boolean;
  /** Preview modal: allow inline edit & save template. */
  previewEditable?: boolean;
  onSelect?: (shortcut: PromptShortcut) => void;
  onAddPromptBase: (shortcut: PromptShortcut, filledText: string) => void;
  onApplyMainPrompt: (filledText: string) => void;
};

export function PromptShortcutsPanel({
  disabled,
  previewEditable = false,
  onSelect,
  onAddPromptBase,
  onApplyMainPrompt,
}: PromptShortcutsPanelProps) {
  const { data: shortcuts = [], isError, error } = usePromptShortcuts();
  const [previewShortcut, setPreviewShortcut] = useState<PromptShortcut | null>(null);
  const [pendingShortcut, setPendingShortcut] = useState<PromptShortcut | null>(null);

  const loadError = isError
    ? error instanceof Error
      ? error.message
      : "Gagal memuat prompt shortcuts"
    : "";

  const handleSelect = (shortcut: PromptShortcut) => {
    if (disabled) return;
    setPreviewShortcut(shortcut);
    onSelect?.(shortcut);
  };

  const handleSaved = (shortcut: PromptShortcut) => {
    setPreviewShortcut(shortcut);
  };

  const handleApplyFromPreview = (shortcut: PromptShortcut) => {
    setPendingShortcut(shortcut);
  };

  const handleChoose = (type: "base" | "main", filledText: string) => {
    if (!pendingShortcut) return;
    if (type === "base") {
      onAddPromptBase(pendingShortcut, filledText);
    } else {
      onApplyMainPrompt(filledText);
    }
    setPendingShortcut(null);
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Template</span>
        </div>

        {loadError && <p className="m-0 text-xs text-red-400">{loadError}</p>}

        {shortcuts.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">Belum ada prompt shortcut.</p>
        ) : (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shortcuts.map((shortcut) => (
              <PromptShortcutItem
                key={shortcut.id}
                shortcut={shortcut}
                manageMode={false}
                disabled={disabled}
                onSelect={handleSelect}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      <PromptShortcutPreviewModal
        open={previewShortcut !== null}
        shortcut={previewShortcut}
        editable={previewEditable}
        onClose={() => setPreviewShortcut(null)}
        onApply={handleApplyFromPreview}
        onSaved={handleSaved}
      />

      <PromptShortcutApplyModal
        shortcut={pendingShortcut}
        open={pendingShortcut !== null}
        onClose={() => setPendingShortcut(null)}
        onChoose={handleChoose}
      />
    </>
  );
}
