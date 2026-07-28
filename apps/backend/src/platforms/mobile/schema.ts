import { z } from "zod";
import {
  appIdSchema,
  getAppMemoryInputSchema,
  getAppMemoryOutputShape,
  updateAppMemoryInputSchema,
  updateAppMemoryOutputShape,
} from "../../platforms/browser/schema.js";

export {
  appIdSchema,
  getAppMemoryInputSchema,
  getAppMemoryOutputShape,
  updateAppMemoryInputSchema,
  updateAppMemoryOutputShape,
};

export const mobileLocatorSchema = {
  ref: z
    .string()
    .optional()
    .describe(
      'REQUIRED for reliability: the element\'s ref from the last mobile_get_screen_snapshot call, e.g. "e12". Do not invent a locator from element attributes (e.g. {"editable":true}) — snapshot attributes like editable/clickable describe the element, they are not valid locator fields.'
    ),
  accessibilityId: z.string().optional().describe("content-desc / accessibility id"),
  text: z.string().optional().describe("Visible text (partial match)"),
  name: z.string().optional().describe("Resource id or name"),
} as const;

// .strict() so an unrecognized field (e.g. {"editable": true}, copied from a
// snapshot element instead of using its `ref`) is rejected with a clear
// validation error the model can see and correct, instead of being silently
// dropped by Zod and failing later with a vaguer "locator must include ref…"
// error once every field has been stripped away.
export const mobileLocatorObjectSchema = z.object(mobileLocatorSchema).strict();

export const launchAppInputSchema = {} as const;

export const launchAppOutputShape = {
  package: z.string(),
  activity: z.string().optional(),
  udid: z.string(),
} as const;

export const closeAppInputSchema = {} as const;

export const closeAppOutputShape = {
  package: z.string(),
  closed: z.boolean(),
  udid: z.string(),
} as const;

export const getScreenSnapshotInputSchema = {
  interactiveOnly: z.boolean().optional().default(true),
  // No .default() here on purpose — a schema-level default would fill in
  // args.maxElements before the handler runs, permanently shadowing
  // mobileConfig.snapshotMaxElements's `??` fallback in captureScreenSnapshot()
  // (this exact bug silently capped every snapshot at 100 regardless of the
  // config value). Leave undefined when the model doesn't specify it, so the
  // config default is the single source of truth.
  maxElements: z.number().int().min(1).max(500).optional(),
} as const;

export const mobileSnapshotElementShape = {
  ref: z.string(),
  className: z.string().nullable(),
  text: z.string().nullable(),
  contentDesc: z.string().nullable(),
  resourceId: z.string().nullable(),
  clickable: z.boolean(),
  editable: z.boolean(),
  enabled: z.boolean(),
  bbox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
} as const;

export const getScreenSnapshotOutputShape = {
  package: z.string().nullable(),
  activity: z.string().nullable(),
  udid: z.string().nullable(),
  elements: z.array(z.object(mobileSnapshotElementShape)),
} as const;

export const tapInputSchema = {
  locator: mobileLocatorObjectSchema,
  clickCenter: z.boolean().optional().default(true),
} as const;

export const tapAtInputSchema = {
  x: z.number(),
  y: z.number(),
} as const;

export const tapAtOutputShape = {
  success: z.boolean(),
  x: z.number(),
  y: z.number(),
  warning: z.string().optional(),
} as const;

export const inputTextInputSchema = {
  locator: mobileLocatorObjectSchema,
  value: z.string(),
  clear: z.boolean().optional().default(true),
  hideKeyboard: z.boolean().optional().default(true),
} as const;

export const interactionOutputShape = {
  success: z.boolean(),
  locator: z.object(mobileLocatorSchema),
  warning: z.string().optional(),
} as const;

export const scrollInputSchema = {
  direction: z.enum(["up", "down", "top", "bottom"]),
  amount: z
    .number()
    .int()
    .min(50)
    .max(1200)
    .optional()
    .describe(
      "Approx scroll distance in px (default 200). Kept small — each up/down step is capped ~30% of the scroll area so list search does not skip rows."
    ),
  locator: mobileLocatorObjectSchema.optional(),
} as const;

export const scrollOutputShape = {
  success: z.boolean(),
} as const;

export const takeScreenshotInputSchema = {
  path: z.string().optional().describe("Optional PNG filename under screenshoot/agents/{jobId}/"),
} as const;

export const takeScreenshotOutputShape = {
  ok: z.literal(true),
  path: z.string().describe("Absolute path to saved PNG evidence on disk"),
  mimeType: z.literal("image/png"),
} as const;

export const uploadFileInputSchema = {
  locator: mobileLocatorObjectSchema,
  filePath: z.string().min(1).describe("Absolute path to file on disk"),
} as const;

export const uploadFileOutputShape = {
  success: z.boolean(),
  locator: z.object(mobileLocatorSchema),
  filePath: z.string(),
  fileName: z.string(),
  remotePath: z.string(),
} as const;

export const pressKeyInputSchema = {
  key: z.enum(["BACK", "HOME", "ENTER", "TAB", "DEL", "MENU"]),
} as const;

export const pressKeyOutputShape = {
  success: z.boolean(),
  key: z.string(),
} as const;

export const assertVisibleInputSchema = {
  locator: mobileLocatorObjectSchema,
} as const;

export const assertVisibleOutputShape = {
  success: z.boolean(),
  locator: z.object(mobileLocatorSchema),
  visible: z.boolean(),
} as const;

export const waitForInputSchema = {
  type: z.enum(["locator", "text", "timeout"]),
  text: z.string().optional(),
  locator: mobileLocatorObjectSchema.optional(),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
} as const;

export const waitForOutputShape = {
  success: z.boolean(),
  type: z.enum(["locator", "text", "timeout"]),
} as const;

export const closeSessionOutputShape = {
  closed: z.boolean(),
} as const;

export type MobileLocator = {
  ref?: string;
  accessibilityId?: string;
  text?: string;
  name?: string;
};
