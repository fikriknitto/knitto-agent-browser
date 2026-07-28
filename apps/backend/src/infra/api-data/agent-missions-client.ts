/**
 * Fetch agent mission from API Data (Worker-side).
 */
import { getApiDataBaseUrl } from "./agent-runs-client.js";

type ApiDataEnvelope<T> = {
  message?: string
  result?: T
};

export type AgentMissionSummary = {
  missionId: number
  status: string
  runId: number | null
  agentJobId: string | null
  items?: Array<{
    itemId: number
    title: string
    body: string | null
    kind: string
    requiresEvidence: boolean
  }>
};

async function apiDataFetch<T>(
  path: string,
  opts: { method: string; token: string }
): Promise<T> {
  const url = `${getApiDataBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => ({}))) as ApiDataEnvelope<T> & {
    message?: string
  };
  if (!res.ok) {
    throw new Error(
      json.message || `API Data ${opts.method} ${path} failed: HTTP ${res.status}`
    );
  }
  return json.result as T;
}

export async function getAgentMission(
  token: string,
  missionId: number
): Promise<AgentMissionSummary | null> {
  try {
    return await apiDataFetch<AgentMissionSummary>(
      `/agent/missions/${missionId}`,
      { method: "GET", token }
    );
  } catch {
    return null;
  }
}

export async function assertMissionApprovedForJob(opts: {
  token: string
  missionId: number
  runId?: number
  agentJobId: string
}): Promise<AgentMissionSummary> {
  const mission = await getAgentMission(opts.token, opts.missionId);
  if (!mission) {
    throw new Error(`Mission ${opts.missionId} tidak ditemukan di API Data.`);
  }
  if (mission.status !== "APPROVED") {
    throw new Error(
      `Mission ${opts.missionId} status ${mission.status} — hanya APPROVED boleh dijalankan.`
    );
  }
  if (opts.runId != null && mission.runId != null && mission.runId !== opts.runId) {
    throw new Error(
      `Mission ${opts.missionId} runId mismatch (expected ${mission.runId}, got ${opts.runId}).`
    );
  }
  if (mission.agentJobId && mission.agentJobId !== opts.agentJobId) {
    throw new Error(
      `Mission ${opts.missionId} agentJobId mismatch (expected ${mission.agentJobId}).`
    );
  }
  return mission;
}
