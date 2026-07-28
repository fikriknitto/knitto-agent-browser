import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentScreenshots } from "@/components/evidence/agent-screenshot";
import { AgentVideoStack, AgentVideos } from "@/components/evidence/agent-videos";
import type { VideoRecordingMeta } from "@knitto/shared";

function tableCellAlignClass(align?: "left" | "center" | "right" | "justify" | "char" | null) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

type MarkdownPreviewProps = {
  text: string;
  screenshots?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  videoRecordingMeta?: VideoRecordingMeta[];
};

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="my-2">{children}</p>,
  h1: ({ children }) => (
    <h1 className="my-4 mb-2 text-[1.1em] font-bold text-black-100 dark:text-slate-50">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="my-4 mb-2 text-[1.1em] font-bold text-black-100 dark:text-slate-50">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="my-4 mb-2 text-[1.1em] font-bold text-black-100 dark:text-slate-50">{children}</h3>
  ),
  ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em] text-rose-700 dark:bg-white/8 dark:text-rose-400">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-black/10 bg-black/[0.04] px-4 py-3.5 dark:border-white/6 dark:bg-[#090a0f]">
      {children}
    </pre>
  ),
  em: ({ children }) => (
    <em className="text-black-80 italic dark:text-slate-200">{children}</em>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-black/10 dark:border-white/15">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-black/5 even:bg-black/[0.02] dark:border-white/6 dark:even:bg-white/3">
      {children}
    </tr>
  ),
  th: ({ children, align }) => (
    <th
      className={`border border-black/10 px-3 py-2 font-semibold text-black-100 dark:border-white/10 dark:text-slate-100 ${tableCellAlignClass(align)}`}
    >
      {children}
    </th>
  ),
  td: ({ children, align }) => (
    <td
      className={`border border-black/10 px-3 py-2 text-black-80 dark:border-white/10 dark:text-slate-200 ${tableCellAlignClass(align)}`}
    >
      {children}
    </td>
  ),
};

export function MarkdownPreview({
  text,
  screenshots = [],
  videoUrl,
  videoUrls = [],
  videoRecordingMeta,
}: MarkdownPreviewProps) {
  const hasText = Boolean(text.trim());
  const hasScreenshots = screenshots.length > 0;
  const hasVideoStack = videoUrls.length > 0;
  const hasVideo = Boolean(videoUrl) || hasVideoStack;

  if (!hasText && !hasScreenshots && !hasVideo) return null;

  return (
    <div className="wrap-break-word text-[0.95rem] leading-relaxed text-black-100 dark:text-slate-200 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-black-80 dark:[&_pre_code]:text-slate-300">
      {hasText && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {text}
        </ReactMarkdown>
      )}
      {hasScreenshots && <AgentScreenshots urls={screenshots} />}
      {hasVideoStack ? (
        <AgentVideoStack videoUrls={videoUrls} videoRecordingMeta={videoRecordingMeta} />
      ) : (
        hasVideo && videoUrl && <AgentVideos url={videoUrl} />
      )}
    </div>
  );
}
