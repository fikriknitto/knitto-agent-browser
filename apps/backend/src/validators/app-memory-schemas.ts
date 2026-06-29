import { z } from "zod";

export const appIdParamSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, "appId contains invalid characters");

export const createAppMemoryBodySchema = z.object({
  appId: appIdParamSchema,
  content: z.string(),
});

export const updateAppMemoryBodySchema = z.object({
  content: z.string(),
});

export type CreateAppMemoryBody = z.infer<typeof createAppMemoryBodySchema>;
export type UpdateAppMemoryBody = z.infer<typeof updateAppMemoryBodySchema>;
