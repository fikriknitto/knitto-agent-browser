import { defineTool } from "../../mcp-kit/core/index.js";
import { waitForResponse } from "../driver/observability.js";
import { waitForResponseInputSchema, waitForResponseOutputShape } from "../schema.js";

export const automation_wait_for_response = defineTool({
  name: "browser_wait_for_response",
  description:
    "Block until an HTTP response whose URL matches urlPattern (regex) arrives, then return its status/ok/method (+body if includeBody). Use to verify a backend call succeeded after a UI action — e.g. order-create returns 200 — instead of trusting the UI alone.",
  inputSchema: waitForResponseInputSchema,
  outputSchema: waitForResponseOutputShape,
  handler: async (args) => {
    return waitForResponse({
      urlPattern: args.urlPattern,
      method: args.method,
      timeoutMs: args.timeoutMs,
      includeBody: args.includeBody ?? false,
    });
  },
});
