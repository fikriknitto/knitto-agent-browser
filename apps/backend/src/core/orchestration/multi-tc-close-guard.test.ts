import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  markJobSegmentManaged,
  clearJobSegmentManaged,
  isJobSegmentManaged,
  isMultiTcCloseBlocked,
} from "../evidence/segment-context.js";

describe("multi-TC close guard timing", () => {
  it("segment managed flag clears before end-of-job cleanup window", () => {
    const jobId = "job-guard-1";
    markJobSegmentManaged(jobId);
    assert.equal(isJobSegmentManaged(jobId), true);
    clearJobSegmentManaged(jobId);
    assert.equal(isJobSegmentManaged(jobId), false);
  });
});

describe("isMultiTcCloseBlocked", () => {
  const prevAutomation = process.env.AUTOMATION_MULTI_TC;
  const prevMobile = process.env.MOBILE_MULTI_TC;

  afterEach(() => {
    if (prevAutomation === undefined) delete process.env.AUTOMATION_MULTI_TC;
    else process.env.AUTOMATION_MULTI_TC = prevAutomation;
    if (prevMobile === undefined) delete process.env.MOBILE_MULTI_TC;
    else process.env.MOBILE_MULTI_TC = prevMobile;
    delete process.env.AUTOMATION_FORCE_CLOSE;
    delete process.env.MOBILE_FORCE_CLOSE;
    clearJobSegmentManaged("job-env-guard");
  });

  it("allows close when MULTI_TC env is set but segment is not active for job", () => {
    delete process.env.MOBILE_MULTI_TC;
    process.env.AUTOMATION_MULTI_TC = "1";
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
  });

  it("blocks when MULTI_TC env is set without job context", () => {
    delete process.env.MOBILE_MULTI_TC;
    process.env.AUTOMATION_MULTI_TC = "1";
    assert.equal(isMultiTcCloseBlocked(undefined), true);
  });

  it("blocks when AUTOMATION_MULTI_TC env is set without in-memory flag", () => {
    delete process.env.MOBILE_MULTI_TC;
    process.env.AUTOMATION_MULTI_TC = "1";
    markJobSegmentManaged("job-env-guard");
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), true);
  });

  it("blocks when MOBILE_MULTI_TC env is set without job context", () => {
    delete process.env.AUTOMATION_MULTI_TC;
    process.env.MOBILE_MULTI_TC = "1";
    assert.equal(isMultiTcCloseBlocked(undefined), true);
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
  });

  it("allows close when env unset and job not segment managed", () => {
    delete process.env.AUTOMATION_MULTI_TC;
    delete process.env.MOBILE_MULTI_TC;
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
  });

  it("allows close when FORCE_CLOSE is set even if MULTI_TC env is set", () => {
    process.env.AUTOMATION_MULTI_TC = "1";
    process.env.AUTOMATION_FORCE_CLOSE = "1";
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
    delete process.env.AUTOMATION_FORCE_CLOSE;
  });

  it("allows close when MOBILE_FORCE_CLOSE is set with MOBILE_MULTI_TC (cleanup spawn)", () => {
    delete process.env.AUTOMATION_MULTI_TC;
    delete process.env.AUTOMATION_FORCE_CLOSE;
    process.env.MOBILE_MULTI_TC = "1";
    process.env.MOBILE_FORCE_CLOSE = "1";
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
  });

  it("blocks when in-memory segment managed flag is set", () => {
    delete process.env.AUTOMATION_MULTI_TC;
    delete process.env.MOBILE_MULTI_TC;
    markJobSegmentManaged("job-env-guard");
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), true);
    clearJobSegmentManaged("job-env-guard");
    assert.equal(isMultiTcCloseBlocked("job-env-guard"), false);
  });
});
