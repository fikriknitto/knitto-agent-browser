import type {
  AgentJobMessage,
  BridgeInfo,
  PromptAttachment,
  AutomationPlatform,
  TestCaseResult,
} from "@knitto/shared";
import type { ChatPromptBase } from "@/lib/utils/prompt-compose";
import type { RunEvidenceItem } from "@/lib/utils/run-evidence";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type BridgeSummary = BridgeInfo;

export type { AgentJobMessage };

export type ChatLine = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  attachments?: PromptAttachment[];
  promptBases?: ChatPromptBase[];
  jobPlatform?: AutomationPlatform;
  testCaseCount?: number;
  status?: AgentJobMessage["status"];
  progress?: number;
  result?: string;
  /** Typed run evidence from API Data results. */
  evidence?: RunEvidenceItem[];
  screenshots?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  videoRecordingMeta?: AgentJobMessage["videoRecordingMeta"];
  testCaseResults?: TestCaseResult[];
  testCaseIndex?: number;
  testCaseTotal?: number;
  testCaseId?: string;
  testCasePlatform?: AgentJobMessage["testCasePlatform"];
  testCaseStatus?: AgentJobMessage["testCaseStatus"];
  testCases?: AgentJobMessage["testCases"];
  toolName?: string;
  /** API Data agent_runs.id (W2) */
  runId?: number;
};
