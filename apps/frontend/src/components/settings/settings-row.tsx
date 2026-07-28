import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 dark:border-white/8",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-black-100 dark:text-slate-200">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-black-40 dark:text-slate-500">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

type SettingsRowStackedProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsRowStacked({
  label,
  description,
  children,
  className,
}: SettingsRowStackedProps) {
  return (
    <div className={cn("border-b border-black/10 py-4 dark:border-white/8", className)}>
      <div className="mb-3">
        <div className="text-sm text-black-100 dark:text-slate-200">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-black-40 dark:text-slate-500">{description}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">{children}</div>
    </div>
  );
}

export function SettingsSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
      {children}
    </h3>
  );
}
