import { apiDataJsonAuthed } from "./api-data-client";

export type QaTestSuite = {
  id: number;
  generationRunId: number;
  projectId: number | null;
  name: string;
  status: "draft" | "approved" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type QaTestStep = {
  id: number;
  testCaseId: number;
  stepOrder: number;
  action: string;
  mdServiceId: number | null;
  input: unknown;
  expected: string | null;
  createdAt: string;
};

export type QaTestCaseDetail = {
  id: number;
  suiteId: number;
  title: string;
  objective: string | null;
  preconditions: string | null;
  testData: unknown;
  expectedResult: string | null;
  priority: "low" | "medium" | "high" | "critical";
  type: "functional" | "integration" | "regression" | "negative" | "e2e";
  platform: "api" | "web" | "mobile";
  isNew: boolean;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  steps: QaTestStep[];
  requirementIds: number[];
  serviceIds: number[];
};

export const generateSuite = (runId: number) =>
  apiDataJsonAuthed<QaTestSuite>(`/generation-runs/${runId}/generate`, {
    method: "POST",
    body: {},
  });

export const listSuitesByRun = (runId: number) =>
  apiDataJsonAuthed<QaTestSuite[]>(`/generation-runs/${runId}/test-suites`);

export const listCasesBySuite = (suiteId: number) =>
  apiDataJsonAuthed<QaTestCaseDetail[]>(`/test-suites/${suiteId}/cases`);

export const approveSuite = (id: number) =>
  apiDataJsonAuthed<QaTestSuite>(`/test-suites/${id}/approve`, { method: "POST", body: {} });

export const approveCase = (id: number) =>
  apiDataJsonAuthed<QaTestCaseDetail>(`/test-cases/${id}/approve`, { method: "POST", body: {} });

export const rejectCase = (id: number) =>
  apiDataJsonAuthed<QaTestCaseDetail>(`/test-cases/${id}/reject`, { method: "POST", body: {} });

export const deleteCase = (id: number) =>
  apiDataJsonAuthed<{ id: number; deleted: true }>(`/test-cases/${id}`, { method: "DELETE" });
