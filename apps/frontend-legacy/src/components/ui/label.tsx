import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

const labelBase = "flex flex-col gap-1.5 text-sm font-medium text-slate-400";

export type LabelProps = ComponentPropsWithoutRef<"label">;

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn(labelBase, className)} {...props} />;
}
