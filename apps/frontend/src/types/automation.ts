import type { AgentJobMessage, BridgeInfo, PromptAttachment, AutomationPlatform, TestCaseResult } from "@knitto/shared";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type BridgeSummary = BridgeInfo;

export type { AgentJobMessage };

export type ChatLine = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  attachments?: PromptAttachment[];
  status?: AgentJobMessage["status"];
  progress?: number;
  result?: string;
  screenshots?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  testCaseResults?: TestCaseResult[];
  jobPlatform?: AutomationPlatform;
  runId?: number;
};
