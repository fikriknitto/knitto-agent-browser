import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { extractScreenshotBase64 } from "./tool-screenshot.js";

describe("tool-screenshot", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    tempDirs.length = 0;
  });

  it("reads PNG base64 from saved file path in tool output", () => {
    const dir = mkdtempSync(join(tmpdir(), "knitto-shot-"));
    tempDirs.push(dir);
    const filePath = join(dir, "evidence.png");
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    writeFileSync(filePath, bytes);

    const base64 = extractScreenshotBase64("browser_take_screenshot", {
      ok: true,
      path: filePath,
      mimeType: "image/png",
    });

    assert.equal(base64, bytes.toString("base64"));
  });

  it("prefers inline base64 when present for legacy tool results", () => {
    const inline = "a".repeat(120);
    const base64 = extractScreenshotBase64("mobile_take_screenshot", {
      path: "/tmp/ignored.png",
      base64: inline,
      mimeType: "image/png",
    });

    assert.equal(base64, inline);
  });

  it("ignores non-screenshot tools", () => {
    assert.equal(
      extractScreenshotBase64("browser_get_page_snapshot", { path: "/tmp/x.png" }),
      undefined
    );
  });
});
