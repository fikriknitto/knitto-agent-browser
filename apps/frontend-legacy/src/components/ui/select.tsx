import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/cn";

const selectBase =
  "w-full rounded-lg border border-white/8 bg-[rgba(15,17,26,0.8)] px-3 py-2.5 text-sm text-slate-100 transition focus:border-blue-500 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60";

export type SelectProps = ComponentPropsWithoutRef<"select">;

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn(selectBase, className)} {...props} />;
}
