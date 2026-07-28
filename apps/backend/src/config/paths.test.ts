import assert from "node:assert/strict";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { resolveAgentScreenshotDirForJob } from "../core/job-context.js";
import { resolveScreenshotDir } from "./paths.js";

describe("evidence path shape (no double 'agents' segment)", () => {
  const previous = process.env.AUTOMATION_SCREENSHOT_DIR;

  afterEach(() => {
    if (previous === undefined) delete process.env.AUTOMATION_SCREENSHOT_DIR;
    else process.env.AUTOMATION_SCREENSHOT_DIR = previous;
  });

  it("resolveScreenshotDir() returns the parent of agents/, not the agents dir itself", () => {
    delete process.env.AUTOMATION_SCREENSHOT_DIR;
    const dir = resolveScreenshotDir();
    assert.ok(!dir.endsWith(join("storage", "agents")), `expected storage root, got ${dir}`);
    assert.ok(dir.endsWith("storage"), `expected to end with storage, got ${dir}`);
  });

  it("resolveAgentScreenshotDirForJob() produces exactly one 'agents' segment", () => {
    // Regression guard: storage/agents/agents/{jobId} bug — resolveScreenshotDir()
    // used to already include "agents", and this function appended another
    // one on top, so job evidence landed two folders deeper than expected.
    delete process.env.AUTOMATION_SCREENSHOT_DIR;
    const dir = resolveAgentScreenshotDirForJob("job-path-shape-test");
    const expected = join(resolveScreenshotDir(), "agents", "job-path-shape-test");
    assert.equal(dir, expected);
    assert.equal((dir.match(/agents/g) ?? []).length, 1, `expected exactly one "agents" segment in ${dir}`);
  });
});
