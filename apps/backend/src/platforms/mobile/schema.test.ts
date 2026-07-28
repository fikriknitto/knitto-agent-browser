import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { getScreenSnapshotInputSchema, mobileLocatorObjectSchema } from "./schema.js";

describe("getScreenSnapshotInputSchema", () => {
  it("leaves maxElements undefined when omitted (no schema-level default)", () => {
    // Regression guard: a `.default(100)` here used to fill in
    // args.maxElements BEFORE the handler ran, permanently shadowing
    // mobileConfig.snapshotMaxElements's `??` fallback in
    // captureScreenSnapshot() — every snapshot was silently capped at 100
    // no matter what the config said.
    const schema = z.object(getScreenSnapshotInputSchema);
    const parsed = schema.parse({});
    assert.equal(parsed.maxElements, undefined);
    assert.equal(parsed.interactiveOnly, true);
  });

  it("still accepts an explicit maxElements when the model provides one", () => {
    const schema = z.object(getScreenSnapshotInputSchema);
    const parsed = schema.parse({ maxElements: 50 });
    assert.equal(parsed.maxElements, 50);
  });
});

describe("mobileLocatorObjectSchema", () => {
  it("accepts a ref-based locator", () => {
    const parsed = mobileLocatorObjectSchema.parse({ ref: "e3" });
    assert.equal(parsed.ref, "e3");
  });

  it("rejects attribute-style locators instead of silently stripping them", () => {
    // Regression guard: the model called mobile_input_text with
    // locator: {"editable": true} — not a real locator field. Without
    // .strict(), Zod silently dropped it, leaving an empty locator that
    // failed later with a vaguer error. It must now fail loudly here.
    assert.throws(() => mobileLocatorObjectSchema.parse({ editable: true }));
  });

  it("still allows an empty object at the schema level (resolveLocator, not Zod, enforces at-least-one-field)", () => {
    // All locator fields are optional, so .strict() alone doesn't require
    // one to be present — driver/locators.ts's resolveLocator() is what
    // throws "Locator must include ref, accessibilityId, text, or name."
    // for a genuinely empty locator. This test just documents that split.
    assert.doesNotThrow(() => mobileLocatorObjectSchema.parse({}));
  });
});
