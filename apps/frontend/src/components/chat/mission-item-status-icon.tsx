import { cn } from "@/lib/cn";
import type { MissionItemRunStatus } from "@/lib/utils/mission-run-progress";
import { CircleCheck, CircleDashed, CircleX, Loader2, MinusCircle } from "lucide-react";

type MissionItemStatusIconProps = {
  status: MissionItemRunStatus;
  className?: string;
  size?: "sm" | "md";
};

const sizeClass = { sm: "size-3.5", md: "size-4" } as const;

export function MissionItemStatusIcon({
  status,
  className,
  size = "md",
}: MissionItemStatusIconProps) {
  const iconClass = cn(sizeClass[size], className);

  switch (status) {
    case "running":
      return (
        <Loader2
          className={cn(iconClass, "animate-spin text-amber-600 dark:text-amber-400")}
          aria-label="Running"
        />
      );
    case "completed":
      return (
        <CircleCheck
          className={cn(iconClass, "text-emerald-600 dark:text-emerald-400")}
          aria-label="Passed"
        />
      );
    case "error":
      return (
        <CircleX
          className={cn(iconClass, "text-rose-600 dark:text-rose-400")}
          aria-label="Failed"
        />
      );
    case "skipped":
      return (
        <MinusCircle
          className={cn(iconClass, "text-black-40 dark:text-slate-500")}
          aria-label="Skipped"
        />
      );
    default:
      return (
        <CircleDashed
          className={cn(iconClass, "text-black-20 dark:text-slate-600")}
          aria-label="Pending"
        />
      );
  }
}

export function missionItemStatusLabel(status: MissionItemRunStatus): string {
  switch (status) {
    case "running":
      return "RUNNING";
    case "completed":
      return "PASSED";
    case "error":
      return "FAILED";
    case "skipped":
      return "SKIPPED";
    default:
      return "PENDING";
  }
}

export function missionItemStatusClass(status: MissionItemRunStatus): string {
  switch (status) {
    case "running":
      return "text-amber-700 dark:text-amber-300";
    case "completed":
      return "text-emerald-700 dark:text-emerald-300";
    case "error":
      return "text-rose-700 dark:text-rose-300";
    case "skipped":
      return "text-black-40 dark:text-slate-500";
    default:
      return "text-black-40 dark:text-slate-500";
  }
}
