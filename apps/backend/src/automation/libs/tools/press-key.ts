import { defineTool, ToolError } from "../../core/index.js";
import { pressKey } from "../browser/interactions.js";
import { pressKeyInputSchema, pressKeyOutputShape } from "../schema.js";

export const automation_press_key = defineTool({
  name: "automation_press_key",
  description:
    "Press a keyboard key (Enter, Tab, Arrow keys, shortcuts). Escape is not allowed — use automation_click or automation_click_at to dismiss modals. Optionally focus an element first.",
  inputSchema: pressKeyInputSchema,
  outputSchema: pressKeyOutputShape,
  handler: async (args) => {
    try {
      return await pressKey(args.key, args.locator);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to press key: ${msg}`);
    }
  },
});
