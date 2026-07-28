import { defineTool } from "../../mcp-kit/core/index.js";
import { evaluateExpression } from "../driver/page-state.js";
import { evaluateInputSchema, evaluateOutputShape } from "../schema.js";

export const automation_evaluate = defineTool({
  name: "browser_evaluate",
  description:
    "Run a JS expression in the current page and return its JSON-serialisable result. Use to read DOM/JS state not visible in the snapshot (hidden inputs, computed values, localStorage). Not for clicking/typing — use browser_click/browser_fill for that.",
  inputSchema: evaluateInputSchema,
  outputSchema: evaluateOutputShape,
  handler: async (args) => {
    const result = await evaluateExpression(args.expression);
    return { result };
  },
});
