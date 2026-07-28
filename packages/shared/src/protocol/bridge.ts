import { z } from "zod";
import {
  testCaseSpecSchema,
  testCaseStatusSchema,
  videoRecordingMetaSchema,
  type TestCaseSpec,
} from "./test-case.js";

/** Product kinds for agent runtimes — Cursor | OpenAI-compatible only. */
export const bridgeKindSchema = z.enum(["cursor", "openai"]);
export type BridgeKind = z.infer<typeof bridgeKindSchema>;

export const agentRuntimeSchema = z.enum(["cursor", "openai"]);
export type AgentRuntime = z.infer<typeof agentRuntimeSchema>;

export const agentJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "error",
  "cancelled",
]);
export type AgentJobStatus = z.infer<typeof agentJobStatusSchema>;

export const bridgeModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  vision: z.boolean().optional(),
});

export const promptAttachmentSchema = z
  .object({
    /** @deprecated Prefer mediaId (API Data library). Kept for old clients. */
    storagePath: z.string().optional().default(""),
    /** API Data agent_media.id */
    mediaId: z.number().int().positive().optional(),
    mimeType: z.string(),
    name: z.string(),
    kind: z.enum(["image", "file"]),
  })
  .refine(
    (a) => a.mediaId != null || (a.storagePath != null && a.storagePath.length > 0),
    { message: "mediaId or storagePath required" }
  );

export type PromptAttachment = z.infer<typeof promptAttachmentSchema>;

export const automationPlatformSchema = z.enum(["browser", "mobile", "hybrid"]);
export type AutomationPlatform = z.infer<typeof automationPlatformSchema>;

export const mobileConfigSchema = z.object({
  appPackage: z.string().min(1),
  appActivity: z.string().optional(),
  udid: z.string().optional(),
  deepLink: z.string().optional(),
});
export type MobileConfig = z.infer<typeof mobileConfigSchema>;

export const userPromptMessageSchema = z.object({
  type: z.literal("user_prompt"),
  id: z.string(),
  channel: z.string(),
  connectionId: z.string().optional(),
  bridgeId: z.string(),
  /** Product runtime id (W6). Prefer over inferring from bridgeKind. */
  agentRuntime: agentRuntimeSchema.optional(),
  text: z.string(),
  strategy: z.string().optional(),
  model: z.string().optional(),
  attachments: z.array(promptAttachmentSchema).optional(),
  promptBasePaths: z.array(z.string().min(1)).optional(),
  mainPrompt: z.string().optional(),
  platform: automationPlatformSchema.optional(),
  mobileConfig: mobileConfigSchema.optional(),
  testCases: z.array(testCaseSpecSchema).optional(),
  /** API Data agent_runs.id — set after FE POST /agent/runs (W2) */
  runId: z.number().int().positive().optional(),
  /** API Data agent_missions.id — required on Mission path (Scope B) */
  missionId: z.number().int().positive().optional(),
  /** JWT user forwarded to Worker for API Data writes (AUTH MVP) */
  apiDataToken: z.string().min(1).optional(),
});

export const agentJobCancelMessageSchema = z.object({
  type: z.literal("agent_job_cancel"),
  id: z.string(),
  channel: z.string(),
  connectionId: z.string().optional(),
  bridgeId: z.string(),
});

export { videoRecordingMetaSchema, type VideoRecordingMeta } from "./test-case.js";

export const testCaseResultSchema = z.object({
  testCaseId: z.string(),
  title: z.string(),
  platform: z.enum(["browser", "mobile"]),
  status: testCaseStatusSchema,
  summary: z.string(),
  screenshots: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  label: z.string().optional(),
  /** Skenario yang diuji — untuk laporan user-friendly */
  scenario: z.string().optional(),
  /** Langkah utama yang dijalankan agent */
  stepsPerformed: z.string().optional(),
  /** Hasil yang diharapkan */
  expectedResult: z.string().optional(),
  /** Hasil aktual yang ditemukan */
  actualResult: z.string().optional(),
  /** Penjelasan kesimpulan dalam bahasa sederhana */
  conclusion: z.string().optional(),
  /** Penjelasan penyebab kegagalan dalam bahasa sederhana (diisi jika gagal) */
  failureReason: z.string().optional(),
  /** Saran langkah berikutnya (diisi jika gagal) */
  suggestion: z.string().optional(),
  /** Catatan jika screenshot gagal dibuat */
  screenshotNote: z.string().optional(),
  /** Detail teknis mentah (error message, stack trace, dsb) — untuk developer */
  technicalDetail: z.string().optional(),
});
export type TestCaseResult = z.infer<typeof testCaseResultSchema>;

export const agentJobMessageSchema = z.object({
  type: z.literal("agent_job"),
  id: z.string(),
  channel: z.string(),
  connectionId: z.string().optional(),
  bridgeId: z.string().optional(),
  status: agentJobStatusSchema,
  message: z.string(),
  progress: z.number().optional(),
  result: z.string().optional(),
  screenshotBase64: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  videoUrl: z.string().optional(),
  videoUrls: z.array(z.string()).optional(),
  videoRecordingMeta: z.array(videoRecordingMetaSchema).optional(),
  testCaseResults: z.array(testCaseResultSchema).optional(),
  testCaseIndex: z.number().optional(),
  testCaseTotal: z.number().optional(),
  testCaseId: z.string().optional(),
  testCasePlatform: z.enum(["browser", "mobile"]).optional(),
  testCaseStatus: z
    .enum(["pending", "running", "completed", "error", "skipped"])
    .optional(),
  testCases: z.array(testCaseSpecSchema).optional(),
  toolName: z.string().optional(),
  deviceUdid: z.string().optional(),
  runId: z.number().int().positive().optional(),
});

export type BridgeModelOption = z.infer<typeof bridgeModelOptionSchema>;
export type UserPromptMessage = z.infer<typeof userPromptMessageSchema>;
export type AgentJobCancelMessage = z.infer<typeof agentJobCancelMessageSchema>;
export type AgentJobMessage = z.infer<typeof agentJobMessageSchema>;

export interface BridgeJob {
  id: string;
  channel: string;
  connectionId?: string;
  text: string;
  strategy?: string;
  model?: string;
  attachments?: PromptAttachment[];
  promptBasePaths?: string[];
  mainPrompt?: string;
  platform?: AutomationPlatform;
  mobileConfig?: MobileConfig;
  testCases?: TestCaseSpec[];
  /** API Data run id (W2) */
  runId?: number;
  /** API Data mission id (Scope B) */
  missionId?: number;
  /** JWT for Worker → API Data writes */
  apiDataToken?: string;
}

/**
 * Wire/API snapshot of an agent runtime.
 * Field names keep `bridge*` for WS compatibility; UI should say "Agent".
 * Display labels: "Cursor" | "OpenAI-compatible".
 */
export interface BridgeInfo {
  bridgeId: string;
  bridgeKind: BridgeKind;
  bridgeLabel: string;
  defaultModel: string;
  models: BridgeModelOption[];
  browserHeaded?: boolean;
}
