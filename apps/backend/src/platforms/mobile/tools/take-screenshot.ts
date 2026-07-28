import { defineTool, ToolError } from "../../../platforms/mcp-kit/core/index.js";
import { takeMobileScreenshot } from "../driver/screenshot.js";
import { takeScreenshotInputSchema, takeScreenshotOutputShape } from "../schema.js";

export const mobile_take_screenshot = defineTool({
  name: "mobile_take_screenshot",
  description:
    "Capture PNG screenshot of the current Android screen as evidence. Returns saved file path only; use mobile_get_screen_snapshot to observe the UI.",
  inputSchema: takeScreenshotInputSchema,
  outputSchema: takeScreenshotOutputShape,
  handler: async (args) => {
    try {
      const result = await takeMobileScreenshot(args.path);
      return { ok: true as const, path: result.path, mimeType: result.mimeType };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to take screenshot: ${msg}`);
    }
  },
});
