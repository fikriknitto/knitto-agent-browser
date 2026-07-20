import { cn } from "../lib/cn";
import type { AppliedPromptShortcut } from "../lib/prompt-compose";

const variantClasses: Record<AppliedPromptShortcut["variant"], string> = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-yellow-300",
  neutral: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

type PromptTemplateShortcutProps = {
  bases: AppliedPromptShortcut[];
  disabled?: boolean;
  onRemove: (id: string) => void;
};

export function PromptTemplateShortcut({
  bases,
  disabled,
  onRemove,
}: PromptTemplateShortcutProps) {
  if (!bases.length) return null;

  return (
    <div className="w-full h-full">
      <div className="mb-2.5 flex flex-col flex-wrap gap-2 rounded-xl bg-black/50 p-2">
        <div className="text-sm font-medium text-gray-500">System Prompt</div>
        <div className="flex flex-wrap gap-2" aria-label="System Prompt">
          {bases.map((base) => (
            <div
              key={base.id}
              className={cn(
                "group relative flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm",
                variantClasses[base.variant]
              )}
              title={base.filledText}
            >
              <span className="truncate">
                {base.icon ? `${base.icon} ` : ""}
                {base.label}
              </span>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 opacity-70 hover:bg-white/10 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Hapus ${base.label}`}
                title="Hapus"
                disabled={disabled}
                onClick={() => onRemove(base.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
