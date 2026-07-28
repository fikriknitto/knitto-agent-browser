import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

const textareaBase =
  "w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm leading-normal text-black-100 transition focus:border-blue-500 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 min-h-24 dark:border-white/8 dark:bg-[rgba(15,17,26,0.8)] dark:text-slate-100";

export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(textareaBase, className)} {...props} />;
}
