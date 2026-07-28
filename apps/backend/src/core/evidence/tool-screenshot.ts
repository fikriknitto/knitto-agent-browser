import { readFileSync } from "node:fs";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { saveAgentScreenshotBuffer } from "../../platforms/browser/driver/screenshot.js";
import { createLogger } from "../logging.js";
import { captureScreenshotFromStateFile } from "../../platforms/browser/driver/session.js";

const logger = createLogger("bridge-screenshot");

export const AUTOMATION_TAKE_SCREENSHOT_TOOL = "browser_take_screenshot";

/** Extract PNG base64 from take_screenshot tool output (MCP / agent shapes). */
export function extractScreenshotBase64(toolName: string, output: unknown): string | undefined {
  if (!toolName.includes("take_screenshot")) return undefined;

  const inline = readBase64Field(output);
  if (inline) return inline;

  const path = readScreenshotPath(output);
  if (!path) return undefined;

  try {
    return readFileSync(path).toString("base64");
  } catch (error) {
    logger.warn(
      `Failed to read screenshot from path ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
}

/** Capture a final screenshot when the agent skipped browser_take_screenshot. */
export async function ensureJobScreenshot(
  client: Client | null | undefined,
  existing?: string
): Promise<string | undefined> {
  if (existing) return existing;

  if (client) {
    try {
      const result = await client.callTool({
        name: AUTOMATION_TAKE_SCREENSHOT_TOOL,
        arguments: { fullPage: false },
      });
      const base64 = extractScreenshotBase64(AUTOMATION_TAKE_SCREENSHOT_TOOL, result);
      if (base64) return base64;
    } catch (error) {
      logger.warn(
        `MCP screenshot fallback failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const fromBrowser = await captureScreenshotFromStateFile();
  if (fromBrowser) {
    try {
      saveAgentScreenshotBuffer(Buffer.from(fromBrowser, "base64"), "fallback.png");
    } catch {
      // still return base64 for UI even if disk write fails
    }
    return fromBrowser;
  }

  logger.warn("No screenshot captured — browser state unavailable or page closed");
  return undefined;
}

function readScreenshotPath(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    try {
      return readScreenshotPath(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;

  if (record.status === "success" && record.value) {
    const nested = readScreenshotPath(record.value);
    if (nested) return nested;
  }

  if (typeof record.path === "string" && record.path.length > 0) {
    return record.path;
  }

  if (record.text && typeof record.text === "object" && !Array.isArray(record.text)) {
    const wrapped = record.text as { text?: string };
    if (typeof wrapped.text === "string") {
      const nested = readScreenshotPath(wrapped.text);
      if (nested) return nested;
    }
  }

  if (typeof record.text === "string") {
    const nested = readScreenshotPath(record.text);
    if (nested) return nested;
  }

  if (record.response) {
    const nested = readScreenshotPath(record.response);
    if (nested) return nested;
  }

  if (record.structuredContent) {
    const nested = readScreenshotPath(record.structuredContent);
    if (nested) return nested;
  }

  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      const nested = readScreenshotPath(part);
      if (nested) return nested;
    }
  }

  return undefined;
}

function readBase64Field(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    if (value.length > 500 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 200))) {
      return value;
    }
    try {
      return readBase64Field(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;

  // Cursor SDK: { status: "success", value: { content: [...] } }
  if (record.status === "success" && record.value) {
    const nested = readBase64Field(record.value);
    if (nested) return nested;
  }

  if (typeof record.base64 === "string" && record.base64.length > 100) {
    return record.base64;
  }

  // Cursor SDK content part: { image: { data: "..." } }
  if (record.image && typeof record.image === "object") {
    const image = record.image as { data?: string };
    if (typeof image.data === "string" && image.data.length > 100) {
      return image.data;
    }
  }

  // Cursor SDK text part: { text: { text: "..." } }
  if (record.text && typeof record.text === "object" && !Array.isArray(record.text)) {
    const wrapped = record.text as { text?: string };
    if (typeof wrapped.text === "string") {
      const nested = readBase64Field(wrapped.text);
      if (nested) return nested;
    }
  }

  if (typeof record.text === "string") {
    const nested = readBase64Field(record.text);
    if (nested) return nested;
  }

  if (record.response) {
    const nested = readBase64Field(record.response);
    if (nested) return nested;
  }

  if (record.structuredContent) {
    const nested = readBase64Field(record.structuredContent);
    if (nested) return nested;
  }

  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      const nested = readBase64Field(part);
      if (nested) return nested;
    }
  }

  return undefined;
}
