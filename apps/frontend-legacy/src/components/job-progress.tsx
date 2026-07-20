import type { AutomationPlatform } from "@knitto/shared";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import type { ChatPromptBase } from "../lib/prompt-compose";
import type { ChatLine } from "../lib/types";
import { MarkdownPreview } from "./markdown-preview";
import { ChatAttachments } from "./prompt-attachment-chip";
import { PromptShortcutPreviewModal } from "./prompt-shortcut-preview-modal";
import { TestCaseResultStack } from "./test-case-result-stack";
import { Badge } from "./ui";

const promptBaseVariantClasses: Record<ChatPromptBase["variant"], string> = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-yellow-300",
  neutral: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

function ChatPromptBases({
  bases,
  onPreview,
}: {
  bases: ChatPromptBase[];
  onPreview: (base: ChatPromptBase) => void;
}) {
  if (!bases.length) return null;

  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <div className="text-xs font-semibold text-slate-500">System Prompt</div>
      <div className="flex flex-wrap gap-1.5" aria-label="System Prompt">
        {bases.map((base) => (
          <button
            key={base.id}
            type="button"
            className={cn(
              "inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition hover:opacity-80",
              promptBaseVariantClasses[base.variant]
            )}
            title={`${base.path} — klik untuk preview`}
            onClick={() => onPreview(base)}
          >
            {base.icon ? `${base.icon} ` : ""}
            <span className="truncate">{base.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function isAgentResult(status: string | undefined): boolean {
  return status === "completed" || status === "error" || status === "cancelled";
}

function AgentJobInlineProgress({
  line,
  onOpenHistory,
}: {
  line: ChatLine;
  onOpenHistory?: (runId: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3">
      {line.testCases?.length ? <TestCaseProgress line={line} /> : null}
      <p className="text-sm text-slate-200">{line.text || "Memproses…"}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {line.status && (
          <Badge variant={line.status === "queued" ? "default" : "warning"}>{line.status}</Badge>
        )}
        {line.runId != null ? (
          <Badge
            variant="info"
            role={onOpenHistory ? "button" : undefined}
            className={onOpenHistory ? "cursor-pointer hover:opacity-80" : undefined}
            onClick={
              onOpenHistory ? () => onOpenHistory(line.runId!) : undefined
            }
          >
            runId {line.runId}
          </Badge>
        ) : null}
        {line.testCaseTotal ? (
          <span className="text-xs text-slate-500">
            TC {(line.testCaseIndex ?? 0) + 1} dari {line.testCaseTotal}
          </span>
        ) : null}
        {line.toolName && (
          <span className="text-xs text-slate-500">{line.toolName}</span>
        )}
      </div>
    </div>
  );
}

function platformBadgeLabel(platform?: AutomationPlatform): string {
  if (platform === "hybrid") return "Hybrid";
  if (platform === "mobile") return "Mobile";
  return "Browser";
}

function UserPromptBadges({
  platform,
  testCaseCount,
}: {
  platform?: AutomationPlatform;
  testCaseCount?: number;
}) {
  if (!platform) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      <Badge variant="default">{platformBadgeLabel(platform)}</Badge>
      {platform === "hybrid" && testCaseCount ? (
        <Badge variant="info">{testCaseCount} test cases</Badge>
      ) : null}
    </div>
  );
}

function TestCaseProgress({ line }: { line: ChatLine }) {
  const cases = line.testCases ?? [];
  if (!cases.length) return null;

  const activeIndex = line.testCaseIndex ?? 0;

  return (
    <div className="mb-3 space-y-1">
      <div className="text-xs font-semibold text-slate-500">Test cases</div>
      {cases.map((tc, index) => {
        let statusIcon = "○";
        let statusClass = "text-slate-500";
        if (index < activeIndex || (index === activeIndex && line.testCaseStatus === "completed")) {
          statusIcon = "✓";
          statusClass = "text-emerald-400";
        } else if (index === activeIndex && line.testCaseStatus === "running") {
          statusIcon = "●";
          statusClass = "text-amber-300";
        } else if (line.testCaseStatus === "error" && index === activeIndex) {
          statusIcon = "✗";
          statusClass = "text-red-400";
        } else if (index > activeIndex && line.testCaseStatus === "error") {
          statusIcon = "○";
          statusClass = "text-slate-600";
        }

        const suffix =
          index === activeIndex && line.testCaseStatus === "running" && line.toolName
            ? ` — ${line.toolName}`
            : index === activeIndex && line.testCaseStatus === "completed"
              ? " · Selesai"
              : index === activeIndex && line.testCaseStatus === "error"
                ? " · Gagal"
                : index > activeIndex && line.testCaseStatus === "error"
                  ? " · Dilewati"
                  : "";

        return (
          <div key={tc.id} className={cn("text-xs", statusClass)}>
            {statusIcon} {tc.title ?? tc.id} · {tc.platform}
            {tc.appPackage ? ` · ${tc.appPackage}` : ""}
            {suffix}
          </div>
        );
      })}
    </div>
  );
}

export function ChatHistory({
  lines,
  onOpenHistory,
}: {
  lines: ChatLine[];
  onOpenHistory?: (runId: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewBaseId, setPreviewBaseId] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <>
      <div ref={scrollRef} className="flex flex-col gap-4 pt-4 pb-[200px]">
        {lines.map((line) =>
          line.role === "user" ? (
            <div key={`${line.role}-${line.id}`} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-[#2f2f2f] px-4 py-3 text-sm leading-relaxed text-slate-100">
                <UserPromptBadges
                  platform={line.jobPlatform}
                  testCaseCount={line.testCaseCount}
                />
                {line.promptBases?.length ? (
                  <ChatPromptBases
                    bases={line.promptBases}
                    onPreview={(base) => setPreviewBaseId(base.id)}
                  />
                ) : null}
                {line.attachments?.length && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-slate-500">Attachments</div>
                    <div
                      className={line.text.trim() || line.promptBases?.length ? "mt-2" : undefined}
                    >
                      <ChatAttachments attachments={line.attachments} />
                    </div>
                  </div>
                )}

                {line.text.trim() && (
                  <div>
                    {((line?.promptBases?.length && line?.promptBases?.length > 0) ||
                      (line?.attachments?.length && line?.attachments?.length > 0)) && (
                      <div className="text-xs font-semibold text-slate-500">Prompt</div>
                    )}
                    <div className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 prompt-user">
                      <MarkdownPreview text={line.text} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={`${line.role}-${line.id}`} className="flex w-full justify-start">
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-200">
                {isAgentResult(line.status) ? (
                  <div className="rounded-xl px-4 pt-3 pb-28">
                    {line.runId != null ? (
                      <div className="mb-2">
                        <Badge
                          variant="info"
                          role={onOpenHistory ? "button" : undefined}
                          className={onOpenHistory ? "cursor-pointer hover:opacity-80" : undefined}
                          onClick={
                            onOpenHistory
                              ? () => onOpenHistory(line.runId!)
                              : undefined
                          }
                        >
                          runId {line.runId}
                        </Badge>
                      </div>
                    ) : null}
                    {line.testCaseResults?.length ? (
                      <>
                        <TestCaseResultStack testCaseResults={line.testCaseResults} />
                      </>
                    ) : (
                      <MarkdownPreview
                        text={line.text}
                        screenshots={line.screenshots}
                        videoUrl={line.videoUrl}
                        videoUrls={line.videoUrls}
                        videoRecordingMeta={line.videoRecordingMeta}
                      />
                    )}
                  </div>
                ) : (
                  <AgentJobInlineProgress line={line} onOpenHistory={onOpenHistory} />
                )}
              </div>
            </div>
          )
        )}
      </div>

      <PromptShortcutPreviewModal
        open={previewBaseId !== null}
        shortcutId={previewBaseId}
        onClose={() => setPreviewBaseId(null)}
      />
    </>
  );
}
