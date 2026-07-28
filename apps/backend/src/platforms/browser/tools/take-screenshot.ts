import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import { takePageScreenshot } from "../driver/screenshot.js";
import { takeScreenshotInputSchema, takeScreenshotOutputShape } from "../schema.js";

export const automation_take_screenshot = defineTool({
  name: "browser_take_screenshot",
  description:
    "Capture a PNG screenshot as evidence. Optional path is a filename only — file is written to screenshoot/agents/{jobId}/. Returns saved file path only; use browser_get_page_snapshot to observe the UI.",
  inputSchema: takeScreenshotInputSchema,
  outputSchema: takeScreenshotOutputShape,
  handler: async (args) => {
    try {
      const result = await takePageScreenshot({
        fullPage: args.fullPage ?? false,
        path: args.path,
      });
      return { ok: true as const, path: result.path, mimeType: result.mimeType };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to take screenshot: ${msg}`);
    }
  },
});
