import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeApiDataSync } from "./queue.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("serializeApiDataSync", () => {
  it("applies writes in emission order even when an earlier call resolves slower than a later one", async () => {
    // Reproduces the reported bug: syncAgentRunFromJobMessage was fired
    // fire-and-forget per WS message (queue.ts's old `void syncAgentRunFromJobMessage(...)`),
    // so a slow "running" progress write could land in the DB AFTER a
    // faster "completed" terminal write, leaving agent_run_cases.status
    // stuck at RUNNING even though the run finished PASSED (confirmed live
    // in the DB: agent_runs.status=FINISHED/outcome=PASSED but
    // agent_run_cases.status=RUNNING for the same run).
    const applied: string[] = [];
    const jobId = "job-order-test-1";

    // "running" emitted first but takes longer to resolve (simulates slower
    // network round-trip for the earlier HTTP write).
    serializeApiDataSync(jobId, async () => {
      await delay(30);
      applied.push("running");
    });

    // "completed" emitted second, would normally resolve first without
    // serialization.
    serializeApiDataSync(jobId, async () => {
      await delay(1);
      applied.push("completed");
    });

    await delay(100);
    assert.deepEqual(applied, ["running", "completed"]);
  });

  it("keeps two different jobs' writes independent of each other", async () => {
    const applied: string[] = [];

    serializeApiDataSync("job-a", async () => {
      await delay(20);
      applied.push("a");
    });
    serializeApiDataSync("job-b", async () => {
      applied.push("b");
    });

    await delay(50);
    assert.ok(applied.includes("a"));
    assert.ok(applied.includes("b"));
  });

  it("continues the chain even if an earlier task throws", async () => {
    const applied: string[] = [];
    const jobId = "job-order-test-error";

    serializeApiDataSync(jobId, async () => {
      throw new Error("simulated API Data failure");
    });
    serializeApiDataSync(jobId, async () => {
      applied.push("recovered");
    });

    await delay(20);
    assert.deepEqual(applied, ["recovered"]);
  });
});
