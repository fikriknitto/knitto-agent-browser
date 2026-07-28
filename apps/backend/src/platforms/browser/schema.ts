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
  mode: z.enum(["replace", "upsert_section"]).default("upsert_section"),
  sectionKey: z.string().optional(),
} as const;

export const updateAppMemoryOutputShape = {
  appId: z.string(),
  path: z.string(),
  mode: z.enum(["replace", "upsert_section"]),
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
  maxElements: z.number().int().min(1).max(500).optional().default(100),
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
  ok: z.literal(true),
  path: z.string().describe("Absolute path to saved PNG evidence on disk"),
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

export const stopTestCaseSegmentInputSchema = {
  testCaseId: z.string().optional(),
} as const;

export const stopTestCaseSegmentOutputShape = {
  stopped: z.boolean(),
  path: z.string().optional(),
  warning: z.string().optional(),
} as const;

// --- Inspection / state power tools (native Playwright Page/context) ---

export const evaluateInputSchema = {
  expression: z
    .string()
    .min(1)
    .describe(
      "JS expression evaluated in the page, e.g. `document.title` or `[...document.querySelectorAll('.row')].length`. Return a JSON-serialisable value."
    ),
} as const;

export const evaluateOutputShape = {
  result: z.string().describe("JSON-serialised result (or raw string / \"undefined\")"),
} as const;

export const getConsoleLogsInputSchema = {
  level: z
    .array(z.enum(["log", "info", "warning", "error", "debug"]))
    .optional()
    .describe("Filter by console level(s). Omit for all."),
  limit: z.number().int().min(1).max(1000).optional().describe("Return only the last N entries"),
} as const;

export const consoleEntryShape = {
  type: z.string(),
  text: z.string(),
  at: z.number(),
} as const;

export const getConsoleLogsOutputShape = {
  logs: z.array(z.object(consoleEntryShape)),
  count: z.number(),
} as const;

export const waitForResponseInputSchema = {
  urlPattern: z.string().min(1).describe("Regex (case-insensitive) matched against the response URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
  includeBody: z.boolean().optional().default(false).describe("Include response body (truncated)"),
} as const;

export const waitForResponseOutputShape = {
  url: z.string(),
  status: z.number(),
  ok: z.boolean(),
  method: z.string(),
  body: z.string().optional(),
} as const;

export const getRequestsInputSchema = {
  urlPattern: z.string().optional().describe("Regex (case-insensitive) filter on URL"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
} as const;

export const networkEntryShape = {
  method: z.string(),
  url: z.string(),
  status: z.number(),
  at: z.number(),
} as const;

export const getRequestsOutputShape = {
  requests: z.array(z.object(networkEntryShape)),
  count: z.number(),
} as const;

export const getCookiesInputSchema = {
  urls: z.array(z.string().url()).optional().describe("Restrict to cookies for these URLs"),
} as const;

export const getCookiesOutputShape = {
  cookies: z.array(z.record(z.any())),
  count: z.number(),
} as const;

export const setCookiesInputSchema = {
  cookies: z
    .array(z.record(z.any()))
    .min(1)
    .describe("Playwright cookie objects: {name, value, url} or {name, value, domain, path}"),
} as const;

export const setCookiesOutputShape = {
  added: z.number(),
} as const;

export const saveStorageStateInputSchema = {
  path: z
    .string()
    .optional()
    .describe("Filename (under evidence dir) or absolute path. Omit to auto-generate."),
} as const;

export const saveStorageStateOutputShape = {
  path: z.string(),
} as const;

export const loadStorageStateInputSchema = {
  path: z.string().min(1).describe("Path to a storage-state JSON saved by browser_save_storage_state"),
} as const;

export const loadStorageStateOutputShape = {
  cookies: z.number(),
  origins: z.number(),
} as const;

export type SemanticLocator = {
  ref?: string;
  role?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  text?: string;
};
