import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeToolResultForLlm } from "./mcp-to-ai-tools.js";

describe("mcp-to-ai-tools", () => {
  it("strips base64 from screenshot tool results", () => {
    const sanitized = sanitizeToolResultForLlm("browser_take_screenshot", {
      ok: true,
      path: "/tmp/evidence.png",
      base64: "a".repeat(5000),
      mimeType: "image/png",
    }) as Record<string, unknown>;

    assert.equal(sanitized.path, "/tmp/evidence.png");
    assert.equal("base64" in sanitized, false);
  });

  it("leaves non-screenshot tool results unchanged", () => {
    const input = { url: "https://example.com", title: "Example" };
    const sanitized = sanitizeToolResultForLlm("browser_navigate", input);
    assert.deepEqual(sanitized, input);
  });

  it("strips nested image data from MCP content payloads", () => {
    const sanitized = sanitizeToolResultForLlm("mobile_take_screenshot", {
      content: [
        {
          type: "text",
          text: JSON.stringify({ path: "/tmp/m.png", base64: "b".repeat(200) }),
        },
        {
          image: { data: "c".repeat(200), mimeType: "image/png" },
        },
      ],
    }) as { content: Array<Record<string, unknown>> };

    const textPart = sanitized.content[0] as { text: string };
    const parsed = JSON.parse(textPart.text) as Record<string, unknown>;
    assert.equal("base64" in parsed, false);
    const imagePart = sanitized.content[1] as { image: { data: string } };
    assert.equal(imagePart.image.data, "[omitted]");
  });
});
