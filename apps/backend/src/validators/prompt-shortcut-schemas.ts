import { z } from "zod";

export const promptShortcutIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ID must be kebab-case slug");

export const promptShortcutVariantSchema = z.enum(["blue", "green", "amber", "neutral"]);

export const createPromptShortcutBodySchema = z.object({
  label: z.string().min(1),
  variant: promptShortcutVariantSchema.default("neutral"),
  template: z.string().min(1),
  defaults: z.record(z.string()).default({}),
});

export const updatePromptShortcutBodySchema = createPromptShortcutBodySchema;

export const generatePromptShortcutBodySchema = z.object({
  bridgeId: z.string().min(1),
  model: z.string().min(1),
  brief: z.string().min(1),
  label: z.string().optional(),
});

export type CreatePromptShortcutBody = z.infer<typeof createPromptShortcutBodySchema>;
export type UpdatePromptShortcutBody = z.infer<typeof updatePromptShortcutBodySchema>;
export type GeneratePromptShortcutBody = z.infer<typeof generatePromptShortcutBodySchema>;
