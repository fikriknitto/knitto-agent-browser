import { PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "../lib/cn";
import type { PromptShortcut } from "../lib/prompt-shortcuts";

const variantClasses: Record<PromptShortcut["variant"], string> = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-yellow-300",
  neutral: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

type PromptShortcutItemProps = {
  shortcut: PromptShortcut;
  manageMode: boolean;
  disabled?: boolean;
  onSelect: (shortcut: PromptShortcut) => void;
  onEdit: (shortcut: PromptShortcut) => void;
  onDelete: (shortcut: PromptShortcut) => void;
};

export function PromptShortcutItem({
  shortcut,
  manageMode,
  disabled,
  onSelect,
  onEdit,
  onDelete,
}: PromptShortcutItemProps) {
  return (
    <div
      className={cn(
        "group relative flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-sm",
        variantClasses[shortcut.variant],
        !manageMode && !disabled && "cursor-pointer hover:opacity-60"
      )}
      onClick={() => {
        if (manageMode || disabled) return;
        onSelect(shortcut);
      }}
    >
      <span>
        {shortcut.icon ? `${shortcut.icon} ` : ""}
        {shortcut.label}
      </span>
      {manageMode && (
        <span className="ml-1 flex gap-0.5">
          <button
            type="button"
            className="rounded p-0.5 opacity-80 hover:bg-white/10 hover:opacity-100"
            aria-label={`Edit ${shortcut.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(shortcut);
            }}
          >
            <PencilIcon size={14} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 opacity-80 hover:bg-red-500/20 hover:text-red-300"
            aria-label={`Hapus ${shortcut.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(shortcut);
            }}
          >
            <Trash2Icon size={14} />
          </button>
        </span>
      )}
    </div>
  );
}
