import { z } from "zod";

export const missionPlanItemSchema = z.object({
  kind: z.enum(["todo", "checkpoint"]).default("todo"),
  title: z.string().min(1).max(255),
  body: z.string().max(4000).optional().nullable(),
  requiresEvidence: z.boolean().optional().default(false),
});

export const missionPlanRequestSchema = z.object({
  bridgeId: z.string().min(1),
  model: z.string().min(1),
  intentText: z.string().min(1),
  platform: z.enum(["browser", "mobile", "hybrid"]).optional(),
  promptBaseLabels: z.array(z.string()).optional(),
  attachmentNames: z.array(z.string()).optional(),
});

export const missionPlanResponseSchema = z.object({
  items: z.array(missionPlanItemSchema).min(1).max(5),
});

export type MissionPlanRequest = z.infer<typeof missionPlanRequestSchema>;
export type MissionPlanItem = z.infer<typeof missionPlanItemSchema>;
export type MissionPlanResponse = z.infer<typeof missionPlanResponseSchema>;
