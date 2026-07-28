import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearJobSegmentManaged,
  getPendingSegment,
  isSegmentStarted,
} from "./segment-context.js";
import { startSegmentRecording, stopSegmentRecording } from "./segment-recording.js";

describe("segment-recording deferred start", () => {
  afterEach(() => {
    clearJobSegmentManaged("job-defer-1");
  });

  it("startSegmentRecording sets pending without marking segment started", async () => {
    const jobId = "job-defer-1";
    await startSegmentRecording(jobId, "tc-01", "browser");
    const pending = getPendingSegment(jobId);
    assert.equal(pending?.testCaseId, "tc-01");
    assert.equal(pending?.filename, "tc-01.mp4");
    assert.equal(isSegmentStarted(jobId, "tc-01"), false);

    const stop = await stopSegmentRecording(jobId, "tc-01", "browser");
    // Browser mission video is continuous — stop is bookkeeping only (no "never started" warn).
    assert.equal(stop.warning, undefined);
    assert.equal(stop.path, undefined);
    assert.equal(getPendingSegment(jobId), undefined);
  });
});
