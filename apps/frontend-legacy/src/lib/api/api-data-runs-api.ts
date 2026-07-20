import {
  apiDataRequest,
  setStoredApiDataToken,
  setStoredApiDataUsername,
} from "./api-data-client";

export {
  apiDataUrl,
  getApiDataBaseUrl,
  getStoredApiDataToken,
  getStoredApiDataUsername,
  setStoredApiDataToken,
  setStoredApiDataUsername,
} from "./api-data-client";

export async function loginApiData(username: string, password: string): Promise<{
  token: string
  user: { id: number; username: string }
}> {
  const result = await apiDataRequest<{
    token: string
    user: { id: number; username: string }
  }>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  if (!result?.token) throw new Error("Login API Data gagal: token kosong");
  setStoredApiDataToken(result.token);
  setStoredApiDataUsername(username);
  return result;
}

export type CreateAgentRunInput = {
  agentJobId: string
  agentRuntime?: "cursor" | "openai"
  platform?: string
  testSuiteId?: number | null
  testCaseIds?: number[]
};

export type AgentRunSummary = {
  runId: number
  agentJobId: string
  status: string
  outcome?: string | null
  platform?: string | null
  summary?: string | null
  createdAt?: string
  finishedAt?: string | null
  startedAt?: string | null
  agentRuntime?: string | null
};

export type ListAgentRunsParams = {
  limit?: number
  offset?: number
  status?: string
  agentJobId?: string
  from?: string
  to?: string
};

export type ListAgentRunsResult = {
  items: AgentRunSummary[]
  total: number
  limit: number
  offset: number
};

export async function listAgentRuns(
  token: string,
  params: ListAgentRunsParams = {}
): Promise<ListAgentRunsResult> {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  if (params.status) q.set("status", params.status);
  if (params.agentJobId) q.set("agentJobId", params.agentJobId);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const qs = q.toString();
  return apiDataRequest<ListAgentRunsResult>(
    `/agent/runs${qs ? `?${qs}` : ""}`,
    { method: "GET", token }
  );
}

export type AgentRunResult = {
  runId: number
  agentJobId: string
  status: string
  outcome?: string | null
  platform?: string | null
  summary?: string | null
  createdAt?: string
  finishedAt?: string | null
};

export async function createAgentRun(
  token: string,
  input: CreateAgentRunInput
): Promise<AgentRunResult> {
  return apiDataRequest<AgentRunResult>("/agent/runs", {
    method: "POST",
    token,
    body: input,
  });
}

export function mapBridgeKindToAgentRuntime(
  kind: string | undefined
): "cursor" | "openai" {
  if (kind === "cursor") return "cursor";
  return "openai";
}

export type AgentRunMediaItem = {
  mediaId: number
  role: string
  url?: string | null
  name?: string | null
  kind?: string | null
  contentPath?: string
  urlPath?: string
  caseOrder?: number | null
};

export type AgentRunCaseItem = {
  id?: number
  caseOrder: number
  testCaseId?: number | null
  title?: string | null
  status?: string
  summary?: string | null
};

export type AgentRunResults = {
  run: AgentRunResult & { status?: string }
  cases?: AgentRunCaseItem[]
  logs?: unknown[]
  media?: AgentRunMediaItem[]
};

export async function getAgentRunResults(
  token: string,
  runId: number
): Promise<AgentRunResults> {
  return apiDataRequest<AgentRunResults>(`/agent/runs/${runId}/results`, {
    method: "GET",
    token,
  });
}

export async function getAgentRunByJob(
  token: string,
  agentJobId: string
): Promise<AgentRunResult | null> {
  try {
    return await apiDataRequest<AgentRunResult>(
      `/agent/runs/by-agent-job/${encodeURIComponent(agentJobId)}`,
      { method: "GET", token }
    );
  } catch {
    return null;
  }
}
