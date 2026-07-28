import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeToolArgs } from "./run-event-log.js";

describe("summarizeToolArgs", () => {
  it("redacts value/apiKey/password but keeps structural args like locator/ref", () => {
    const summary = summarizeToolArgs({
      locator: { ref: "e3" },
      value: "s3cret-login-password",
      hideKeyboard: true,
    });
    assert.match(summary, /"ref":"e3"/);
    assert.match(summary, /"value":"\[redacted\]"/);
    assert.doesNotMatch(summary, /s3cret-login-password/);
  });

  it("redacts apiKey and password case-insensitively", () => {
    const summary = summarizeToolArgs({ apiKey: "sk-abc123", Password: "hunter2" });
    assert.doesNotMatch(summary, /sk-abc123/);
    assert.doesNotMatch(summary, /hunter2/);
  });

  it("returns empty string for missing/invalid args", () => {
    assert.equal(summarizeToolArgs(undefined), "");
    assert.equal(summarizeToolArgs(null), "");
  });
});
