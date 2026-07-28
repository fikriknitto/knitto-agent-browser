import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import config, { type OpenaiCredentials } from "../../agents/openai/config.js";
import { buildOpenAIUserContent } from "../prompts/prompt-builder.js";
import type { TestCaseAgentRunner } from "./test-case-orchestrator.js";
import { runOpenAIAgentLoop, type ChatMessage } from "../../agents/openai/openai-agent.js";
import { extractScreenshotBase64 } from "../evidence/tool-screenshot.js";

/** Multi-TC runner for OpenAI-compatible runtime (knitto-agent). */
export function createOpenaiTestCaseRunner(
  mcpClient: Client,
  modelId: string,
  abortSignal: AbortSignal,
  getCredentials: () => OpenaiCredentials
): TestCaseAgentRunner {
  return async ({ prompt, isCancelled, onToolProgress }) => {
    if (isCancelled()) {
      return { summary: "", error: "cancelled" };
    }

    const messages: ChatMessage[] = [
      { role: "user", content: buildOpenAIUserContent(prompt) },
    ];

    let lastScreenshot: string | undefined;

    const observedClient = {
      listTools: (...args: Parameters<Client["listTools"]>) => mcpClient.listTools(...args),
      callTool: async (...args: Parameters<Client["callTool"]>) => {
        const params = args[0];
        onToolProgress(params.name, params.arguments as Record<string, unknown> | undefined);
        const result = await mcpClient.callTool(...args);
        const screenshot = extractScreenshotBase64(params.name, result);
        if (screenshot) lastScreenshot = screenshot;
        return result;
      },
      close: (...args: Parameters<Client["close"]>) => mcpClient.close(...args),
    } as Client;

    const creds = getCredentials();
    const summary = await runOpenAIAgentLoop({
      creds,
      model: modelId,
      messages,
      mcpClient: observedClient,
      maxToolCalls: config.maxToolCalls,
      signal: abortSignal,
      // observedClient.callTool above already reports every tool call (with
      // args) via onToolProgress — no need to also forward openai-agent's
      // own start/complete phases, which would double-report each call.
      onTool: () => {},
    });

    return { summary: summary.trim() || "Selesai.", lastScreenshot };
  };
}
