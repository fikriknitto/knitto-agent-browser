import type { TestCaseResult } from "@knitto/shared";
import { MarkdownPreview } from "./markdown-preview";
import { AgentScreenshots } from "./agent-screenshot";
import { AgentVideos } from "./agent-videos";
import { Badge } from "./ui";

type TestCaseResultStackProps = {
  testCaseResults: TestCaseResult[];
  /** Flat fallback when structured results are unavailable */
  screenshots?: string[];
  videoUrl?: string;
  videoUrls?: string[];
};

function statusBadgeVariant(
  status: TestCaseResult["status"]
): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "completed") return "success";
  if (status === "error") return "danger";
  if (status === "skipped") return "default";
  if (status === "running") return "warning";
  return "info";
}

function platformLabel(platform: TestCaseResult["platform"]): string {
  return platform === "mobile" ? "Mobile" : "Browser";
}

export function TestCaseResultStack({
  testCaseResults,
  screenshots = [],
  videoUrl,
  videoUrls = [],
}: TestCaseResultStackProps) {
  if (!testCaseResults.length) {
    return (
      <MarkdownPreview
        text=""
        screenshots={screenshots}
        videoUrl={videoUrl}
        videoUrls={videoUrls}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm font-semibold text-slate-300">RESULT</div>
      {testCaseResults.map((tc, index) => (
        <section
          key={tc.testCaseId}
          className="rounded-xl border border-white/10 bg-[#14151a] p-4"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Test Case {index + 1} — {tc.title}
            </h3>
            <Badge variant="default">{platformLabel(tc.platform)}</Badge>
            <Badge variant={statusBadgeVariant(tc.status)}>{tc.status}</Badge>
          </div>

          {tc.summary.trim() ? (
            <div className="mb-3">
              <div className="mb-1 text-xs font-semibold text-slate-500">Ringkasan</div>
              <MarkdownPreview text={tc.summary} />
            </div>
          ) : null}

          {tc.screenshots?.length ? (
            <div className="mb-3">
              <div className="mb-1 text-xs font-semibold text-slate-500">Screenshot</div>
              <AgentScreenshots urls={tc.screenshots} />
            </div>
          ) : null}

          {tc.videoUrl ? (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">
                {tc.label ?? "Video"}
              </div>
              <AgentVideos url={tc.videoUrl} />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
