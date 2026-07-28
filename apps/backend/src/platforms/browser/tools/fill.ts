import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import { resolveLocator } from "../driver/locators.js";
import { getPage } from "../driver/session.js";
import { fillInputSchema, interactionOutputShape } from "../schema.js";

export const automation_fill = defineTool({
  name: "browser_fill",
  description:
    "Fill an input using a semantic locator. Clears the field first unless clear=false.",
  inputSchema: fillInputSchema,
  outputSchema: interactionOutputShape,
  handler: async (args) => {
    try {
      const page = await getPage();
      const handle = await resolveLocator(page, args.locator);
      if (args.clear === false) {
        await handle.focus();
        await page.keyboard.type(args.value);
      } else {
        await handle.fill(args.value);
      }
      return { success: true, locator: args.locator };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to fill: ${msg}`);
    }
  },
});
