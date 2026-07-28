import { apiDataJsonAuthed } from "./api-data-client";

export type QaDiscoveryResult = {
  id: number;
  generationRunId: number;
  serviceName: string;
  mdServiceId: number | null;
  matchStatus: "matched" | "new";
  evidenceRequirementIds: number[];
  gapNotes: string | null;
  createdAt: string;
};

export const runDiscovery = (runId: number) =>
  apiDataJsonAuthed<QaDiscoveryResult[]>(`/generation-runs/${runId}/discover`, {
    method: "POST",
    body: {},
  });

export const getDiscoveryReport = (runId: number) =>
  apiDataJsonAuthed<QaDiscoveryResult[]>(`/generation-runs/${runId}/discovery-results`);
