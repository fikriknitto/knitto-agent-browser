import { defineTool } from "../../mcp-kit/core/index.js";
import { setCookies } from "../driver/page-state.js";
import { setCookiesInputSchema, setCookiesOutputShape } from "../schema.js";

export const automation_set_cookies = defineTool({
  name: "browser_set_cookies",
  description:
    "Add cookies to the current browser context (Playwright format: {name, value, url} or {name, value, domain, path}). Use to seed a session. For full skip-login prefer browser_load_storage_state.",
  inputSchema: setCookiesInputSchema,
  outputSchema: setCookiesOutputShape,
  handler: async (args) => {
    const added = await setCookies(args.cookies);
    return { added };
  },
});
