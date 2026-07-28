import type { TestCaseResult } from "@knitto/shared";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import { MarkdownPreview } from "./markdown-preview";
import { AgentScreenshots } from "@/components/evidence/agent-screenshot";
import {
  MissionItemStatusIcon,
  missionItemStatusClass,
  missionItemStatusLabel,
} from "./mission-item-status-icon";
import type { MissionItemRunStatus } from "@/lib/utils/mission-run-progress";

type TestCaseResultReportProps = {
  testCaseResults: TestCaseResult[];
};

function tcToRunStatus(status: TestCaseResult["status"]): MissionItemRunStatus {
  if (status === "completed") return "completed";
  if (status === "error") return "error";
  if (status === "skipped") return "skipped";
  if (status === "running") return "running";
  return "pending";
}

function platformLabel(platform: TestCaseResult["platform"]): string {
  return platform === "mobile" ? "Mobile" : "Browser";
}

function summarizeResults(results: TestCaseResult[]) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const tc of results) {
    if (tc.status === "completed") passed += 1;
    else if (tc.status === "error") failed += 1;
    else if (tc.status === "skipped") skipped += 1;
  }
  return { passed, failed, skipped, total: results.length };
}

export function TestCaseResultReport({ testCaseResults }: TestCaseResultReportProps) {
  const summary = useMemo(() => summarizeResults(testCaseResults), [testCaseResults]);

  const defaultExpanded = useMemo(() => {
    const failed = testCaseResults.find((tc) => tc.status === "error");
    return failed?.testCaseId ?? null;
  }, [testCaseResults]);

  const [expandedId, setExpandedId] = useState<string | null>(defaultExpanded);

  if (!testCaseResults.length) return null;

  return (
    <div className="test-result-report">
      <div className="test-result-report__header">
        <h3 className="test-result-report__title">RESULT</h3>
        <div className="test-result-summary">
          {summary.passed > 0 ? (
            <span className="test-result-summary__passed">{summary.passed} Passed</span>
          ) : null}
          {summary.failed > 0 ? (
            <span className="test-result-summary__failed">{summary.failed} Failed</span>
          ) : null}
          {summary.skipped > 0 ? (
            <span className="test-result-summary__skipped">{summary.skipped} Skipped</span>
          ) : null}
          {summary.passed === 0 && summary.failed === 0 && summary.skipped === 0 ? (
            <span className="text-black-40 dark:text-slate-500">{summary.total} tests</span>
          ) : null}
        </div>
      </div>

      <div className="test-result-table" role="table">
        <div className="test-result-table__head" role="row">
          <span role="columnheader" aria-hidden />
          <span role="columnheader">#</span>
          <span role="columnheader">Test</span>
          <span role="columnheader">Platform</span>
          <span role="columnheader">Result</span>
          <span role="columnheader" aria-hidden />
        </div>

        {testCaseResults.map((tc, index) => {
          const runStatus = tcToRunStatus(tc.status);
          const isExpanded = expandedId === tc.testCaseId;
          const hasDetail =
            Boolean(tc.summary.trim()) || Boolean(tc.screenshots?.length);

          return (
            <div key={tc.testCaseId} className="test-result-table__group">
              <button
                type="button"
                className={cn(
                  "test-result-table__row",
                  runStatus === "error" && "test-result-table__row--failed",
                  isExpanded && "test-result-table__row--expanded"
                )}
                disabled={!hasDetail}
                aria-expanded={hasDetail ? isExpanded : undefined}
                onClick={() => {
                  if (!hasDetail) return;
                  setExpandedId((prev) => (prev === tc.testCaseId ? null : tc.testCaseId));
                }}
              >
                <span className="test-result-table__icon">
                  <MissionItemStatusIcon status={runStatus} />
                </span>
                <span className="test-result-table__index">{index + 1}</span>
                <span className="test-result-table__name" title={tc.title}>
                  {tc.title}
                </span>
                <span className="test-result-table__platform">{platformLabel(tc.platform)}</span>
                <span
                  className={cn(
                    "test-result-table__status text-xs font-semibold uppercase tracking-wide",
                    missionItemStatusClass(runStatus)
                  )}
                >
                  {missionItemStatusLabel(runStatus)}
                </span>
                <span className="test-result-table__chevron">
                  {hasDetail ? (
                    <ChevronDown
                      className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                      aria-hidden
                    />
                  ) : null}
                </span>
              </button>

              {isExpanded && hasDetail ? (
                <div className="test-result-table__detail">
                  {tc.summary.trim() ? (
                    <div className="mb-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
                        Ringkasan
                      </div>
                      <MarkdownPreview text={tc.summary} />
                    </div>
                  ) : null}
                  {tc.screenshots?.length ? (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
                        Screenshot
                      </div>
                      <AgentScreenshots urls={tc.screenshots} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
