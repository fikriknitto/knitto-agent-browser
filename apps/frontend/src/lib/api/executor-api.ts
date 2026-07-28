import { apiDataJsonAuthed } from "./api-data-client";

export type ExecuteSuiteResult = {
  run: { runId: number; agentJobId: string; status: string; outcome: string | null };
  cases: unknown[];
};

export const executeSuite = (suiteId: number) =>
  apiDataJsonAuthed<ExecuteSuiteResult>(`/test-suites/${suiteId}/execute`, {
    method: "POST",
    body: {},
  });
