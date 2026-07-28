import { defineTool, ToolError } from "../../../platforms/mcp-kit/core/index.js";
import { tapAt } from "../driver/interactions.js";
import { tapAtInputSchema, tapAtOutputShape } from "../schema.js";

export const mobile_tap_at = defineTool({
  name: "mobile_tap_at",
  description:
    "Tap at raw screen coordinates (x, y) in pixels. FALLBACK ONLY — use this when no element ref exists (e.g. custom canvas/game views). If the last mobile_get_screen_snapshot returned a ref for the element (especially editable input fields), use mobile_tap or mobile_input_text with that ref instead — guessing coordinates for a known element risks missing it and hitting nav/back-gesture areas, which can close or background the app.",
  inputSchema: tapAtInputSchema,
  outputSchema: tapAtOutputShape,
  handler: async (args) => {
    try {
      return await tapAt(args.x, args.y);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new ToolError(`Failed to tap at coordinates: ${msg}`);
    }
  },
});
