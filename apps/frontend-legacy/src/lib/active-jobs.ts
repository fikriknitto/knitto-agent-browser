import type { AgentJobMessage } from "@knitto/shared";

export function isActiveJobStatus(status: AgentJobMessage["status"]): boolean {
  return status === "queued" || status === "running";
}

export function isTerminalJobStatus(status: AgentJobMessage["status"]): boolean {
  return status === "completed" || status === "error" || status === "cancelled";
}

export function syncActiveJobIds(
  jobId: string,
  status: AgentJobMessage["status"],
  activeJobIds: Set<string>
): "idle" | "busy" {
  if (isActiveJobStatus(status)) {
    activeJobIds.add(jobId);
  } else {
    activeJobIds.delete(jobId);
  }
  return activeJobIds.size > 0 ? "busy" : "idle";
}
