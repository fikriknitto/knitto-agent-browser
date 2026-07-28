import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import config from "../config.js";
import { capturePageSnapshot } from "../driver/snapshot.js";
import { getPageSnapshotInputSchema, getPageSnapshotOutputShape } from "../schema.js";

export const automation_get_page_snapshot = defineTool({
  name: "browser_get_page_snapshot",
  description:
    "Discover the current page UI as semantic elements with refs (e1, e2, …). Detects hamburger/menu toggles (div>svg, aria-expanded, aria-haspopup, menuitem). Use refs or role/name/label/placeholder/text for interactions — not data-testid.",
  inputSchema: getPageSnapshotInputSchema,
  outputSchema: getPageSnapshotOutputShape,
  handler: async (args) => {
    try {
      return await capturePageSnapshot({
        maxDepth: args.maxDepth ?? 6,
        interactiveOnly: args.interactiveOnly ?? true,
        maxElements: args.maxElements ?? config.snapshotMaxElements,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to capture page snapshot: ${msg}`);
    }
  },
});
