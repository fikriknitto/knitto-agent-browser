import { jsonSchema, tool, type ToolSet } from "ai";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type JsonObject = Record<string, unknown>;

const SCREENSHOT_TOOL_NAMES = new Set(["browser_take_screenshot", "mobile_take_screenshot"]);

/** Strip heavy image payloads before tool results enter LLM history. */
export function sanitizeToolResultForLlm(toolName: string, result: unknown): unknown {
  if (!SCREENSHOT_TOOL_NAMES.has(toolName)) return result;
  return stripScreenshotPayloadDeep(result);
}

function stripScreenshotPayloadDeep(value: unknown): unknown {
  if (!value) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed) {
        return JSON.stringify(stripScreenshotPayloadDeep(parsed));
      }
    } catch {
      // keep raw string
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((part) => stripScreenshotPayloadDeep(part));
  }

  if (typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    if (key === "base64") continue;
    if (key === "image" && child && typeof child === "object") {
      const image = child as Record<string, unknown>;
      if ("data" in image) {
        next[key] = { ...image, data: "[omitted]" };
        continue;
      }
    }
    next[key] = stripScreenshotPayloadDeep(child);
  }

  return next;
}

function formatMcpToolResult(
  toolName: string,
  result: CallToolResult | Record<string, unknown>
): string {
  const sanitized = sanitizeToolResultForLlm(toolName, result);

  if (
    sanitized &&
    typeof sanitized === "object" &&
    "content" in sanitized &&
    Array.isArray((sanitized as CallToolResult).content)
  ) {
    const callResult = sanitized as CallToolResult;
    return callResult.content
      .map((part) => {
        if (
          typeof part === "object" &&
          part &&
          "type" in part &&
          part.type === "text" &&
          "text" in part
        ) {
          return String(part.text);
        }
        return JSON.stringify(part);
      })
      .join("\n");
  }
  return JSON.stringify(sanitized);
}

function normalizeJsonSchema(schema: JsonObject | undefined): JsonObject {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }
  if (schema.type === "object" || schema.properties) return schema;
  return { type: "object", properties: schema };
}

/**
 * Map in-process MCP Client tools → AI SDK ToolSet for knitto-agent.
 * Prefers `browser_*` / `mobile_*` names (W6 cutover).
 */
export async function mcpClientToAiToolSet(
  mcpClient: Client,
  opts?: {
    onToolStart?: (toolName: string, args?: Record<string, unknown>) => void;
    onToolDone?: (toolName: string, result: unknown, args?: Record<string, unknown>) => void;
  }
): Promise<ToolSet> {
  const listed = await mcpClient.listTools();
  const tools: ToolSet = {};

  for (const mcpTool of listed.tools) {
    const name = mcpTool.name;
    const description = mcpTool.description ?? name;
    const parameters = normalizeJsonSchema(mcpTool.inputSchema as JsonObject | undefined);

    tools[name] = tool({
      description,
      inputSchema: jsonSchema(parameters),
      execute: async (args) => {
        const toolArgs = (args ?? {}) as Record<string, unknown>;
        opts?.onToolStart?.(name, toolArgs);
        const result = await mcpClient.callTool({
          name,
          arguments: toolArgs,
        });
        opts?.onToolDone?.(name, result, toolArgs);
        return formatMcpToolResult(name, result as CallToolResult);
      },
    });
  }

  return tools;
}
