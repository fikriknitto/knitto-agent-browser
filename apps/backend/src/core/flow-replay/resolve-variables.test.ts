import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDeep, resolveTemplateString } from "./resolve-variables.js";

describe("resolve-variables", () => {
  it("resolves template placeholders", () => {
    assert.equal(
      resolveTemplateString("hello {{name}}", { name: "world" }),
      "hello world"
    );
  });

  it("resolves nested args", () => {
    const resolved = resolveDeep(
      { locator: { name: "{{label}}" }, value: "{{email}}" },
      { label: "Email", email: "a@b.com" }
    );
    assert.deepEqual(resolved, {
      locator: { name: "Email" },
      value: "a@b.com",
    });
  });
});
