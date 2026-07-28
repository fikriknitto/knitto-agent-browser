import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { RecordedToolCall } from "./record-playbook.js";

export function createRecordingMcpClient(
  base: Client,
  collector: RecordedToolCall[]
): Client {
  const originalCallTool = base.callTool.bind(base);
  return {
    ...base,
    callTool: async (params, ...rest) => {
      collector.push({
        tool: params.name,
        args: (params.arguments ?? {}) as Record<string, unknown>,
      });
      return originalCallTool(params, ...rest);
    },
  } as Client;
}
