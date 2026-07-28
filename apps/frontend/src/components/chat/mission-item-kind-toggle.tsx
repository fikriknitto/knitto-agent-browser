import { cn } from "@/lib/cn";
import type { MissionItemKind } from "@/lib/api/api-data-missions-api";
import { Flag } from "lucide-react";

type MissionItemKindToggleProps = {
  value: MissionItemKind;
  disabled?: boolean;
  onChange: (kind: MissionItemKind) => void;
  className?: string;
};

const OPTIONS: { value: MissionItemKind; label: string; icon?: typeof Flag }[] = [
  { value: "todo", label: "TODO" },
  { value: "checkpoint", label: "CHECKPOINT", icon: Flag },
];

export function MissionItemKindToggle({
  value,
  disabled,
  onChange,
  className,
}: MissionItemKindToggleProps) {
  const active = value === "checkpoint" ? "checkpoint" : "todo";

  return (
    <div
      className={cn("mission-kind-toggle", className)}
      role="group"
      aria-label="Item kind"
    >
      {OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            className={cn(
              "mission-kind-toggle__btn",
              isActive && "mission-kind-toggle__btn--active"
            )}
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
          >
            {Icon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function MissionItemKindBadge({ kind }: { kind: string }) {
  const isCheckpoint = kind === "checkpoint";
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isCheckpoint
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
          : "bg-black/5 text-black-60 dark:bg-white/10 dark:text-slate-400"
      )}
    >
      {isCheckpoint ? "CHECKPOINT" : "TODO"}
    </span>
  );
}
