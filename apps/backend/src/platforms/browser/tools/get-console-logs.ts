import { defineTool } from "../../mcp-kit/core/index.js";
import { getConsoleLogs } from "../driver/observability.js";
import { getConsoleLogsInputSchema, getConsoleLogsOutputShape } from "../schema.js";

export const automation_get_console_logs = defineTool({
  name: "browser_get_console_logs",
  description:
    "Read buffered browser console messages (and uncaught page errors) for the current job. Use to catch silent JS errors during a flow. Filter by level; buffer resets each job.",
  inputSchema: getConsoleLogsInputSchema,
  outputSchema: getConsoleLogsOutputShape,
  handler: async (args) => {
    const logs = getConsoleLogs({ level: args.level, limit: args.limit });
    return { logs, count: logs.length };
  },
});
