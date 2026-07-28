import { apiDataJsonAuthed } from "./api-data-client";

export type QaGenerationRun = {
  id: number;
  projectId: number | null;
  idempotencyKey: string;
  status:
    | "created"
    | "ingesting"
    | "discovered"
    | "planning"
    | "generating"
    | "review"
    | "done"
    | "failed"
    | "cancelled";
  stageState: unknown;
  triggeredBy: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export const listGenerationRuns = (projectId?: number) =>
  apiDataJsonAuthed<QaGenerationRun[]>(
    `/generation-runs${projectId ? `?projectId=${projectId}` : ""}`
  );

export const createGenerationRun = (body: { projectId?: number | null }) =>
  apiDataJsonAuthed<QaGenerationRun>(`/generation-runs`, { method: "POST", body });

export const getGenerationRun = (id: number) =>
  apiDataJsonAuthed<QaGenerationRun>(`/generation-runs/${id}`);
