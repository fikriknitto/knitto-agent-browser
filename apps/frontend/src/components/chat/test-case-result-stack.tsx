import type { TestCaseResult } from "@knitto/shared";
import { MarkdownPreview } from "./markdown-preview";
import { AgentVideos } from "@/components/evidence/agent-videos";
import { TestCaseResultReport } from "./test-case-result-report";

type TestCaseResultStackProps = {
  testCaseResults: TestCaseResult[];
  /** Flat fallback when structured results are unavailable */
  screenshots?: string[];
  videoUrl?: string;
  videoUrls?: string[];
};

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

  const videos = videoUrls.length ? videoUrls : videoUrl ? [videoUrl] : [];

  return (
    <div className="space-y-6">
      <TestCaseResultReport testCaseResults={testCaseResults} />
      {videos.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold uppercase tracking-wide text-black-80 dark:text-slate-300">
            Videos
          </div>
          {videos.map((v) => (
            <AgentVideos key={v} url={v} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
