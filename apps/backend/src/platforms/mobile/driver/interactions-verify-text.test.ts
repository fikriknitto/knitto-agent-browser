import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideInputTextRetry } from "./interactions.js";

describe("decideInputTextRetry", () => {
  it("returns ok when the field's text matches what was set", () => {
    assert.equal(decideInputTextRetry("lintang_it", "lintang_it"), "ok");
  });

  it("tolerates surrounding whitespace differences", () => {
    assert.equal(decideInputTextRetry("  lintang_it  ", "lintang_it"), "ok");
  });

  it("returns retype when the field is still empty (setValue() didn't land — React Native case)", () => {
    assert.equal(decideInputTextRetry("", "lintang_it"), "retype");
  });

  it("returns ok for a masked password of the RIGHT length (the double-password regression)", () => {
    // Regression guard: password fields return masked text ("•••••"), never
    // the raw value. The old exact-match verify treated that as failure and
    // the fallback typed the password AGAIN at the cursor — "dmain" became
    // "dmaindmain" (10 mask dots visible in the run-9 evidence screenshot),
    // and the server rejected the login. A right-length mask means the
    // value landed — no retype.
    assert.equal(decideInputTextRetry("•••••", "dmain"), "ok");
    assert.equal(decideInputTextRetry("*****", "dmain"), "ok");
    assert.equal(decideInputTextRetry("·····", "dmain"), "ok");
  });

  it("returns retype for a masked password of the WRONG length (content is genuinely wrong)", () => {
    // e.g. leftover doubled content from a previous buggy attempt — must be
    // cleared and retyped, not left as-is.
    assert.equal(decideInputTextRetry("••••••••••", "dmain"), "retype");
    assert.equal(decideInputTextRetry("••", "dmain"), "retype");
  });

  it("returns retype when the field shows unrelated text (e.g. a hint or stale value)", () => {
    assert.equal(decideInputTextRetry("Username", "lintang_it"), "retype");
    assert.equal(decideInputTextRetry("old_user", "lintang_it"), "retype");
  });

  it("does not mistake same-length real text for a mask", () => {
    // "admin" has the same length as "dmain" but is real (non-mask) text —
    // the mask heuristic must not accept it.
    assert.equal(decideInputTextRetry("admin", "dmain"), "retype");
  });
});
