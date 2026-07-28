import { apiDataJsonAuthed } from "./api-data-client";

export type QaDocument = {
  id: number;
  generationRunId: number;
  projectId: number | null;
  kind: "brd" | "prd" | "other" | "free_text";
  mediaId: number | null;
  filename: string | null;
  mime: string | null;
  rawText: string | null;
  origin: "upload" | "tester_note";
  createdAt: string;
  updatedAt: string;
};

export type QaRequirementItem = {
  id: number;
  generationRunId: number;
  requirementCode: string;
  text: string;
  sourceDocumentId: number | null;
  sourceLocator: string | null;
  category: string | null;
  createdAt: string;
};

export const listDocuments = (runId: number) =>
  apiDataJsonAuthed<QaDocument[]>(`/generation-runs/${runId}/documents`);

export const uploadDocument = (
  runId: number,
  file: File,
  kind?: QaDocument["kind"]
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (kind) formData.append("kind", kind);
  return apiDataJsonAuthed<QaDocument>(`/generation-runs/${runId}/documents/upload`, {
    method: "POST",
    formData,
  });
};

export const createTextDocument = (
  runId: number,
  body: { text: string; kind?: QaDocument["kind"]; filename?: string | null }
) =>
  apiDataJsonAuthed<QaDocument>(`/generation-runs/${runId}/documents/text`, {
    method: "POST",
    body,
  });

export const deleteDocument = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`/documents/${id}`, {
    method: "DELETE",
  });

export const ingestGenerationRun = (runId: number) =>
  apiDataJsonAuthed<QaRequirementItem[]>(`/generation-runs/${runId}/ingest`, {
    method: "POST",
    body: {},
  });
