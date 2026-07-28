import { defineTool } from "../../mcp-kit/core/index.js";
import { getNetworkEvents } from "../driver/observability.js";
import { getRequestsInputSchema, getRequestsOutputShape } from "../schema.js";

export const automation_get_requests = defineTool({
  name: "browser_get_requests",
  description:
    "List recent network responses (method, URL, status) captured during the job. Filter by urlPattern (regex) / method. Use to inspect what API calls the page made and their status codes.",
  inputSchema: getRequestsInputSchema,
  outputSchema: getRequestsOutputShape,
  handler: async (args) => {
    const requests = getNetworkEvents({
      urlPattern: args.urlPattern,
      method: args.method,
      limit: args.limit,
    });
    return { requests, count: requests.length };
  },
});
