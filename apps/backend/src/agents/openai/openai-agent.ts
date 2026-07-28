import { Agent, type AgentEvent } from "@knittotextile/knitto-agent-core";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ModelMessage } from "ai";
import { mcpClientToAiToolSet } from "./mcp-to-ai-tools.js";
import type { OpenaiCredentials } from "./config.js";
import { openaiApiV1, normalizeOpenaiBaseUrl } from "./config.js";
import { resolveOpenaiChatModel } from "./resolve-chat-model.js";

export type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage =
  | { role: "user"; content: string | OpenAIContentPart[] }
  | { role: "assistant"; content?: string | null }
  | { role: "tool"; tool_call_id: string; content: string };

function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  const out: ModelMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        out.push({ role: "user", content: msg.content });
        continue;
      }
      const parts = msg.content.map((part) => {
        if (part.type === "text") return { type: "text" as const, text: part.text };
        return {
          type: "image" as const,
          image: part.image_url.url,
        };
      });
      out.push({ role: "user", content: parts });
    } else if (msg.role === "assistant" && typeof msg.content === "string") {
      out.push({ role: "assistant", content: msg.content });
    }
  }
  return out;
}

/**
 * OpenAI-compatible agent loop via knitto-agent (replaces hand-rolled fetch loop).
 */
export async function runOpenAIAgentLoop(opts: {
  creds: OpenaiCredentials;
  model: string;
  messages: ChatMessage[];
  mcpClient: Client;
  maxToolCalls: number;
  signal?: AbortSignal;
  onTool: (
    phase: "start" | "complete",
    toolName: string,
    result?: unknown,
    args?: Record<string, unknown>
  ) => void;
  onRetry?: (attempt: number, maxRetries: number, delayMs: number, error: unknown) => void;
}): Promise<string> {
  const baseURL = opts.creds.baseUrl.trim()
    ? openaiApiV1(normalizeOpenaiBaseUrl(opts.creds.baseUrl))
    : undefined;

  if (!baseURL) {
    throw new Error("OpenAI-compatible base URL is required");
  }

  const model = resolveOpenaiChatModel({
    model: opts.model,
    apiKey: opts.creds.apiKey || undefined,
    baseURL,
  });

  const tools = await mcpClientToAiToolSet(opts.mcpClient, {
    onToolStart: (toolName, args) => opts.onTool("start", toolName, undefined, args),
    onToolDone: (toolName, result, args) => opts.onTool("complete", toolName, result, args),
  });

  const agent = new Agent({
    name: "qa-automation",
    model,
    // Cast: knitto-agent and workspace may resolve different `ai` copies under pnpm
    tools: tools as ConstructorParameters<typeof Agent>[0]["tools"],
    maxSteps: opts.maxToolCalls,
    instructions: false,
    loopGuard: true,
  });

  const history = toModelMessages(opts.messages);
  // Last user message is the prompt input; prior history empty for single-turn QA jobs
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const input =
    typeof lastUser?.content === "string"
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser.content
            .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
            .filter(Boolean)
            .join("\n")
        : "";

  // Include image parts from multimodal user content when present
  let runInput: string | ModelMessage[] = input;
  if (lastUser && Array.isArray(lastUser.content)) {
    runInput = [lastUser];
  }

  let finalText = "";
  try {
    for await (const event of agent.run([], runInput, { signal: opts.signal })) {
      handleAgentEvent(event, (text) => {
        finalText = text;
      });
      if (opts.signal?.aborted) break;
    }
  } finally {
    await agent.close().catch(() => undefined);
  }

  return finalText.trim() || "Done";
}

function handleAgentEvent(event: AgentEvent, onDoneText: (text: string) => void): void {
  switch (event.type) {
    case "text.done":
      onDoneText(event.text);
      break;
    case "done":
      if (event.result === "error") {
        // error event may have been emitted separately
      }
      break;
    case "error":
      throw event.error;
    default:
      break;
  }
}
