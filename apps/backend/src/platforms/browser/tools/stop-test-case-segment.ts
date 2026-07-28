import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import { getAutomationJobId } from "../../../core/job-context.js";
import { getActiveTestCaseId } from "../../../core/evidence/segment-context.js";
import {
  clearActiveSegment,
  clearSegmentStopRequest,
  readSegmentStateFile,
} from "../../../core/evidence/segment-state-file.js";
import {
  stopTestCaseSegmentInputSchema,
  stopTestCaseSegmentOutputShape,
} from "../schema.js";

export const automation_stop_test_case_segment = defineTool({
  name: "browser_stop_test_case_segment",
  description:
    "Mark end of a browser test-case step. Does not cut video — mission uses one continuous recording finalized at job end.",
  inputSchema: stopTestCaseSegmentInputSchema,
  outputSchema: stopTestCaseSegmentOutputShape,
  handler: async (args) => {
    const jobId = getAutomationJobId();
    if (!jobId) throw new ToolError("Job ID belum diset.");

    const state = readSegmentStateFile(jobId);
    const testCaseId =
      args.testCaseId?.trim() ||
      getActiveTestCaseId() ||
      state?.active?.testCaseId ||
      state?.stopRequested?.testCaseId;

    clearActiveSegment(jobId);
    clearSegmentStopRequest(jobId);

    if (!testCaseId) {
      return { stopped: false, warning: "No active test case bookkeeping to clear." };
    }

    return {
      stopped: true,
      warning: "Browser video is continuous for the mission; segment stop is bookkeeping only.",
    };
  },
});
