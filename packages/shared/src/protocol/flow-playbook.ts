import { z } from "zod";

import { testCasePlatformSchema } from "./test-case.js";

export const playbookLocatorSchema = z.object({
  ref: z.string().optional(),
  role: z.string().optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  text: z.string().optional(),
  contentDesc: z.string().optional(),
  resourceId: z.string().optional(),
});

export type PlaybookLocator = z.infer<typeof playbookLocatorSchema>;

export const playbookMustHaveSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  contentDesc: z.string().optional(),
  resourceId: z.string().optional(),
});

export type PlaybookMustHave = z.infer<typeof playbookMustHaveSchema>;

export const playbookPreconditionSchema = z.object({
  urlIncludes: z.string().optional(),
  package: z.string().optional(),
  activityIncludes: z.string().optional(),
  mustHave: z.array(playbookMustHaveSchema).optional().default([]),
});

export type PlaybookPrecondition = z.infer<typeof playbookPreconditionSchema>;

export const playbookStepSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.unknown()).optional().default({}),
});

export type PlaybookStep = z.infer<typeof playbookStepSchema>;

export const flowPlaybookSchema = z.object({
  version: z.literal(1),
  platform: testCasePlatformSchema,
  precondition: playbookPreconditionSchema,
  variables: z.array(z.string()).optional().default([]),
  steps: z.array(playbookStepSchema).min(1),
});

export type FlowPlaybook = z.infer<typeof flowPlaybookSchema>;

export const preconditionMatchStatusSchema = z.enum(["match", "mismatch", "ambiguous"]);

export type PreconditionMatchStatus = z.infer<typeof preconditionMatchStatusSchema>;

export function parseFlowPlaybookJson(raw: string): FlowPlaybook {
  const parsed = JSON.parse(raw) as unknown;
  return flowPlaybookSchema.parse(parsed);
}
