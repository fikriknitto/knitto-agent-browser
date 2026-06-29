import { z } from "zod";

export const locatorSchema = {
  ref: z.string().optional().describe('Snapshot ref, e.g. "e12"'),
  role: z
    .string()
    .optional()
    .describe("ARIA role: button, textbox, link, combobox, checkbox, ..."),
  name: z.string().optional().describe("Accessible name"),
  label: z.string().optional().describe("Associated label text"),
  placeholder: z.string().optional().describe("Input placeholder"),
  text: z.string().optional().describe("Visible text (partial match)"),
} as const;

export const appIdSchema = {
  appId: z.string().min(1).describe("App identifier for memory files, e.g. knitto-web"),
} as const;

export const getAppMemoryInputSchema = { ...appIdSchema } as const;

export const getAppMemoryOutputShape = {
  appId: z.string(),
  content: z.string(),
  exists: z.boolean(),
  path: z.string(),
} as const;

export const updateAppMemoryInputSchema = {
  ...appIdSchema,
  content: z.string().min(1),
  mode: z.enum(["append", "replace"]).default("append"),
} as const;

export const updateAppMemoryOutputShape = {
  appId: z.string(),
  path: z.string(),
  mode: z.enum(["append", "replace"]),
  bytesWritten: z.number(),
} as const;

export const navigateInputSchema = {
  url: z.string().url(),
  waitUntil: z
    .enum(["load", "domcontentloaded", "networkidle0", "networkidle2"])
    .optional()
    .default("domcontentloaded"),
} as const;

export const navigateOutputShape = {
  url: z.string(),
  title: z.string(),
} as const;

export const getPageSnapshotInputSchema = {
  maxDepth: z.number().int().min(1).max(10).optional().default(6),
  interactiveOnly: z.boolean().optional().default(true),
  maxElements: z.number().int().min(1).max(500).optional().default(200),
} as const;

export const snapshotElementShape = {
  ref: z.string(),
  role: z.string().nullable(),
  name: z.string().nullable(),
  tag: z.string(),
  text: z.string().nullable(),
  placeholder: z.string().nullable(),
  inputType: z.string().nullable(),
  visible: z.boolean(),
  disabled: z.boolean(),
  inViewport: z.boolean(),
  bbox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
} as const;

export const getPageSnapshotOutputShape = {
  url: z.string(),
  title: z.string(),
  elements: z.array(z.object(snapshotElementShape)),
} as const;

export const locatorObjectSchema = z.object(locatorSchema);

export const clickInputSchema = {
  locator: locatorObjectSchema,
  clickCenter: z
    .boolean()
    .optional()
    .default(false)
    .describe("Click the center of the element bbox — useful for small SVG/hamburger icons"),
} as const;

export const clickAtInputSchema = {
  x: z.number().describe("Viewport X coordinate in CSS pixels"),
  y: z.number().describe("Viewport Y coordinate in CSS pixels"),
} as const;

export const clickAtOutputShape = {
  success: z.boolean(),
  x: z.number(),
  y: z.number(),
} as const;

export const fillInputSchema = {
  locator: locatorObjectSchema,
  value: z.string(),
  clear: z.boolean().optional().default(true),
} as const;

export const interactionOutputShape = {
  success: z.boolean(),
  locator: z.object(locatorSchema),
} as const;

export const assertTextInputSchema = {
  text: z.string().min(1),
  match: z.enum(["contains", "exact", "regex"]).default("contains"),
} as const;

export const assertTextOutputShape = {
  success: z.boolean(),
  match: z.enum(["contains", "exact", "regex"]),
  text: z.string(),
} as const;

export const assertVisibleInputSchema = {
  locator: locatorObjectSchema,
} as const;

export const assertVisibleOutputShape = {
  success: z.boolean(),
  locator: z.object(locatorSchema),
  visible: z.boolean(),
} as const;

export const takeScreenshotInputSchema = {
  fullPage: z.boolean().optional().default(false),
  path: z
    .string()
    .optional()
    .describe(
      "Optional PNG filename only (e.g. menu-open.png). Saved under screenshoot/agents/{jobId}/."
    ),
} as const;

export const takeScreenshotOutputShape = {
  path: z.string(),
  base64: z.string(),
  mimeType: z.literal("image/png"),
} as const;

export const scrollInputSchema = {
  direction: z.enum(["up", "down", "top", "bottom"]),
  amount: z.number().int().min(50).max(5000).optional(),
  locator: locatorObjectSchema.optional(),
  smooth: z.boolean().optional().default(true),
} as const;

export const scrollOutputShape = {
  success: z.boolean(),
} as const;

export const pressKeyInputSchema = {
  key: z
    .string()
    .min(1)
    .describe("Key name: Enter, Tab, ArrowDown, Control+A, etc. Escape is not allowed."),
  locator: locatorObjectSchema.optional(),
} as const;

export const pressKeyOutputShape = {
  success: z.boolean(),
  key: z.string(),
} as const;

export const hoverInputSchema = {
  locator: locatorObjectSchema,
} as const;

export const hoverOutputShape = {
  success: z.boolean(),
} as const;

export const selectOptionInputSchema = {
  locator: locatorObjectSchema,
  value: z.string().min(1).describe("Option value or visible label text"),
} as const;

export const selectOptionOutputShape = {
  success: z.boolean(),
  value: z.string(),
} as const;

export const waitForInputSchema = {
  type: z.enum(["text", "locator", "network_idle", "timeout"]),
  text: z.string().optional(),
  locator: locatorObjectSchema.optional(),
  match: z.enum(["contains", "exact"]).optional().default("contains"),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
} as const;

export const waitForOutputShape = {
  success: z.boolean(),
  type: z.enum(["text", "locator", "network_idle", "timeout"]),
} as const;

export const historyOutputShape = {
  url: z.string(),
  title: z.string(),
} as const;

export const uploadFileInputSchema = {
  locator: locatorObjectSchema,
  filePath: z
    .string()
    .min(1)
    .describe("Absolute path to the file on disk (from Attached files in the prompt)"),
} as const;

export const uploadFileOutputShape = {
  success: z.boolean(),
  locator: z.object(locatorSchema),
  filePath: z.string(),
  fileName: z.string(),
} as const;

export const closeBrowserOutputShape = {
  closed: z.boolean(),
} as const;

export type SemanticLocator = {
  ref?: string;
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  text?: string;
};
