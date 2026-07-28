import { apiDataJsonAuthed } from "./api-data-client";
import type { MdSuggestion } from "./master-data-api";

export const generateSuggestionsFromDiscovery = (runId: number) =>
  apiDataJsonAuthed<MdSuggestion[]>(`/generation-runs/${runId}/feedback/from-discovery`, {
    method: "POST",
    body: {},
  });

export const generateSuggestionsFromRun = (agentRunId: number) =>
  apiDataJsonAuthed<MdSuggestion[]>(`/agent-runs/${agentRunId}/feedback/from-run`, {
    method: "POST",
    body: {},
  });
