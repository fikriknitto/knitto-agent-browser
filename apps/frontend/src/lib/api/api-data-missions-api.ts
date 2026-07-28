import { apiDataRequest } from "./api-data-client";
import { request } from "@/lib/http/client";

export type MissionStatus =
  | "DRAFT"
  | "READY"
  | "APPROVED"
  | "CANCELLED"
  | "ARCHIVED";

export type MissionItemKind = "todo" | "checkpoint";

export type MissionItem = {
  itemId: number;
  missionId: number;
  itemOrder: number;
  kind: MissionItemKind | string;
  title: string;
  body: string | null;
  testCaseId: number | null;
  requiresEvidence: boolean;
  status: string;
};

export type AgentMission = {
  missionId: number;
  projectId: number | null;
  testSuiteId: number | null;
  title: string;
  intentText: string | null;
  status: MissionStatus | string;
  agentRuntime: string | null;
  platform: string | null;
  model: string | null;
  mobileConfig: unknown;
  promptBasePaths: string[];
  attachmentMediaIds: number[];
  runId: number | null;
  agentJobId: string | null;
  triggeredBy: number | null;
  meta: unknown;
  items: MissionItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateMissionInput = {
  title?: string;
  intentText?: string | null;
  projectId?: number | null;
  testSuiteId?: number | null;
  agentRuntime?: string | null;
  platform?: string | null;
  model?: string | null;
  mobileConfig?: unknown;
  promptBasePaths?: string[];
  attachmentMediaIds?: number[];
  meta?: unknown;
};

export type PatchMissionInput = CreateMissionInput;

export type MissionItemInput = {
  kind?: MissionItemKind;
  title: string;
  body?: string | null;
  testCaseId?: number | null;
  requiresEvidence?: boolean;
};

export type ApproveMissionResult = {
  mission: AgentMission;
  runId: number;
  agentJobId: string;
};

export async function createMission(
  token: string,
  input: CreateMissionInput
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>("/agent/missions", {
    method: "POST",
    token,
    body: input,
  });
}

export async function getMission(
  token: string,
  missionId: number
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(`/agent/missions/${missionId}`, {
    method: "GET",
    token,
  });
}

export async function listMissions(
  token: string,
  params: { limit?: number; offset?: number; status?: string; projectId?: number } = {}
): Promise<{ items: AgentMission[]; total: number; limit: number; offset: number }> {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.status) q.set("status", params.status);
  if (params.projectId != null) q.set("projectId", String(params.projectId));
  const qs = q.toString();
  return apiDataRequest(`/agent/missions${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token,
  });
}

export async function patchMission(
  token: string,
  missionId: number,
  input: PatchMissionInput
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(`/agent/missions/${missionId}`, {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function putMissionItems(
  token: string,
  missionId: number,
  items: MissionItemInput[]
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(`/agent/missions/${missionId}/items`, {
    method: "PUT",
    token,
    body: { items },
  });
}

export async function readyMission(
  token: string,
  missionId: number
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(`/agent/missions/${missionId}/ready`, {
    method: "POST",
    token,
    body: {},
  });
}

export async function approveMission(
  token: string,
  missionId: number,
  agentJobId: string
): Promise<ApproveMissionResult> {
  return apiDataRequest<ApproveMissionResult>(
    `/agent/missions/${missionId}/approve`,
    {
      method: "POST",
      token,
      body: { agentJobId },
    }
  );
}

export async function cancelMission(
  token: string,
  missionId: number
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(`/agent/missions/${missionId}/cancel`, {
    method: "POST",
    token,
    body: {},
  });
}

export async function seedMissionFromSuite(
  token: string,
  missionId: number,
  testSuiteId?: number | null
): Promise<AgentMission> {
  return apiDataRequest<AgentMission>(
    `/agent/missions/${missionId}/seed-from-suite`,
    {
      method: "POST",
      token,
      body: { testSuiteId: testSuiteId ?? null },
    }
  );
}

export type PlanMissionTodosInput = {
  bridgeId: string;
  model: string;
  intentText: string;
  platform?: "browser" | "mobile" | "hybrid";
  promptBaseLabels?: string[];
  attachmentNames?: string[];
};

export type PlannedMissionItem = {
  kind: "todo" | "checkpoint";
  title: string;
  body?: string | null;
  requiresEvidence?: boolean;
};

/** Worker LLM plan — uses selected provider/model; not API Data. */
export async function planMissionTodos(
  input: PlanMissionTodosInput
): Promise<{ items: PlannedMissionItem[] }> {
  return request<{ items: PlannedMissionItem[] }>("/api/missions/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Map mission items → hybrid TestCaseSpec-shaped payload for WS. */
export function missionItemsToTestCases(
  items: MissionItem[],
  platform: "browser" | "mobile" = "browser"
): Array<{
  id: string;
  platform: "browser" | "mobile";
  instruction: string;
  title?: string;
}> {
  return items.map((item, index) => ({
    // Must be tc-01… so evidence filenames parse to case_order (see evidence-upload).
    id: `tc-${String(index + 1).padStart(2, "0")}`,
    platform,
    title: item.title,
    instruction: [item.title, item.body].filter(Boolean).join("\n\n"),
  }));
}
