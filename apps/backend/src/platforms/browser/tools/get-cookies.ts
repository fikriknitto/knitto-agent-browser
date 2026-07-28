import { defineTool } from "../../mcp-kit/core/index.js";
import { getCookies } from "../driver/page-state.js";
import { getCookiesInputSchema, getCookiesOutputShape } from "../schema.js";

export const automation_get_cookies = defineTool({
  name: "browser_get_cookies",
  description:
    "Read cookies from the current browser context (optionally filtered by URL). Use to inspect session/auth state.",
  inputSchema: getCookiesInputSchema,
  outputSchema: getCookiesOutputShape,
  handler: async (args) => {
    const cookies = await getCookies(args.urls);
    // Playwright cookies are plain JSON (string/number/boolean fields).
    return {
      cookies: cookies as unknown as Record<string, string | number | boolean>[],
      count: cookies.length,
    };
  },

});
