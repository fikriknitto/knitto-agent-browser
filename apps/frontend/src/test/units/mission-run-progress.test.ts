import { describe, expect, it } from "vitest";
import type { ChatLine } from "@/types/automation";
import {
  deriveMissionItemStatuses,
  findActiveMissionJobLine,
  summarizeMissionRun,
} from "@/lib/utils/mission-run-progress";

function agentLine(partial: Partial<ChatLine> & Pick<ChatLine, "id">): ChatLine {
  return {
    role: "agent",
    text: "",
    ...partial,
  };
}

describe("mission-run-progress", () => {
  it("finds active job line by mission agentJobId", () => {
    const lines: ChatLine[] = [
      agentLine({ id: "job-1", status: "running", testCaseIndex: 0 }),
      agentLine({ id: "job-1", status: "running", testCaseIndex: 1 }),
    ];
    const mission = {
      missionId: 1,
      agentJobId: "job-1",
    } as never;

    const line = findActiveMissionJobLine(lines, mission);
    expect(line?.testCaseIndex).toBe(1);
  });

  it("derives in-flight statuses from testCaseIndex", () => {
    const line = agentLine({
      id: "job-1",
      status: "running",
      testCaseIndex: 1,
      testCaseStatus: "running",
    });
    expect(deriveMissionItemStatuses(3, line)).toEqual([
      "pending",
      "running",
      "pending",
    ]);
  });

  it("overlays running TC from testCaseIndex when prior results exist", () => {
    const line = agentLine({
      id: "job-1",
      status: "running",
      testCaseIndex: 1,
      testCaseStatus: "running",
      testCaseResults: [
        {
          testCaseId: "tc-01",
          title: "A",
          platform: "browser",
          status: "completed",
          summary: "ok",
        },
      ],
    });
    expect(deriveMissionItemStatuses(3, line)).toEqual([
      "completed",
      "running",
      "pending",
    ]);
  });

  it("derives terminal statuses from testCaseResults", () => {
    const line = agentLine({
      id: "job-1",
      status: "completed",
      testCaseResults: [
        {
          testCaseId: "tc-01",
          title: "A",
          platform: "browser",
          status: "completed",
          summary: "ok",
        },
        {
          testCaseId: "tc-02",
          title: "B",
          platform: "browser",
          status: "error",
          summary: "fail",
        },
      ],
    });
    expect(deriveMissionItemStatuses(2, line)).toEqual(["completed", "error"]);
  });

  it("does not let a stale testCaseIndex/testCaseStatus stomp a terminal job's completed testCaseResults", () => {
    // Reproduces the reported bug: the job's terminal WS message correctly
    // carries a fully "completed" testCaseResults array, but a stray
    // earlier progress message left testCaseIndex/testCaseStatus stuck on
    // "running" for the last TC (merge-agent-chat-line.ts's `??` fallback
    // keeps whatever was last received for those two scalar fields). The
    // per-item status must trust testCaseResults once the job is terminal.
    const line = agentLine({
      id: "job-1",
      status: "completed",
      testCaseIndex: 1,
      testCaseStatus: "running",
      testCaseResults: [
        {
          testCaseId: "tc-01",
          title: "A",
          platform: "browser",
          status: "completed",
          summary: "ok",
        },
        {
          testCaseId: "tc-02",
          title: "B",
          platform: "browser",
          status: "completed",
          summary: "ok",
        },
      ],
    });
    expect(deriveMissionItemStatuses(2, line)).toEqual(["completed", "completed"]);
  });

  it("summarizes run counts", () => {
    const statuses = deriveMissionItemStatuses(
      3,
      agentLine({
        id: "job-1",
        status: "completed",
        testCaseResults: [
          {
            testCaseId: "tc-01",
            title: "A",
            platform: "browser",
            status: "completed",
            summary: "",
          },
          {
            testCaseId: "tc-02",
            title: "B",
            platform: "browser",
            status: "error",
            summary: "",
          },
          {
            testCaseId: "tc-03",
            title: "C",
            platform: "browser",
            status: "skipped",
            summary: "",
          },
        ],
      })
    );
    const summary = summarizeMissionRun(
      statuses,
      agentLine({ id: "job-1", status: "completed" })
    );
    expect(summary).toMatchObject({ passed: 1, failed: 1, skipped: 1, isTerminal: true });
  });
});
