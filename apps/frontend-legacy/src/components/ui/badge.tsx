import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

const badgeVariants = {
  default: "border-transparent bg-white/8 text-slate-200",
  success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  info: "border-blue-500/30 bg-blue-500/15 text-blue-400",
  danger: "border-red-500/30 bg-red-500/15 text-red-300",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
