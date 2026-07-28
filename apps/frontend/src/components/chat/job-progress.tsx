import type { AutomationPlatform } from "@knitto/shared";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ChatPromptBase } from "@/lib/utils/prompt-compose";
import type { ChatLine } from "@/lib/types";
import { deriveMissionItemStatuses } from "@/lib/utils/mission-run-progress";
import { MarkdownPreview } from "./markdown-preview";
import { ChatAttachments } from "./prompt-attachment-chip";
import { PromptShortcutPreviewModal } from "./prompt-shortcut-preview-modal";
import { TestCaseResultStack } from "./test-case-result-stack";
import { AgentVideoStack } from "@/components/evidence/agent-videos";
import { MissionItemStatusIcon } from "./mission-item-status-icon";
import { Badge } from "@/components/chat/ui";

const promptBaseVariantClasses: Record<ChatPromptBase["variant"], string> = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-yellow-300",
  neutral: "border-black/15 bg-black/5 text-black-80 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
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
      <div className="text-xs font-semibold text-black-40 dark:text-slate-500">System Prompt</div>
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
    <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1a1a1a]">
      {line.testCases?.length ? <TestCaseProgress line={line} /> : null}
      <p className="text-sm text-black-100 dark:text-slate-200">{line.text || "Memproses…"}</p>

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
          <span className="text-xs text-black-40 dark:text-slate-500">
            TC {(line.testCaseIndex ?? 0) + 1} dari {line.testCaseTotal}
          </span>
        ) : null}
        {line.toolName && (
          <span className="text-xs text-black-40 dark:text-slate-500">{line.toolName}</span>
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

  const statuses = deriveMissionItemStatuses(cases.length, line);
  const activeIndex = line.testCaseIndex ?? 0;

  return (
    <div className="mb-3 space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
        Test cases
      </div>
      {cases.map((tc, index) => {
        const runStatus = statuses[index] ?? "pending";
        const isActive = index === activeIndex;

        const suffix =
          isActive && line.testCaseStatus === "running" && line.toolName
            ? ` — ${line.toolName}`
            : isActive && line.testCaseStatus === "completed"
              ? " · Selesai"
              : isActive && line.testCaseStatus === "error"
                ? " · Gagal"
                : index > activeIndex && line.testCaseStatus === "error"
                  ? " · Dilewati"
                  : "";

        return (
          <div
            key={tc.id}
            className={cn(
              "flex items-start gap-2 text-xs text-black-80 dark:text-slate-300",
              runStatus === "running" && "font-medium text-amber-800 dark:text-amber-200"
            )}
          >
            <MissionItemStatusIcon status={runStatus} size="sm" className="mt-0.5 shrink-0" />
            <span className="min-w-0">
              {tc.title ?? tc.id} · {tc.platform}
              {tc.appPackage ? ` · ${tc.appPackage}` : ""}
              {suffix}
            </span>
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
      <div ref={scrollRef} className="flex flex-col gap-4 py-4">
        {lines.map((line) =>
          line.role === "user" ? (
            <div key={`${line.role}-${line.id}`} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg bg-black/5 px-4 py-3 text-sm leading-relaxed text-black-100 dark:bg-[#2f2f2f] dark:text-slate-100">
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
                    <div className="text-xs font-semibold text-black-40 dark:text-slate-500">Attachments</div>
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
                      <div className="text-xs font-semibold text-black-40 dark:text-slate-500">Prompt</div>
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
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-black-100 dark:text-slate-200">
                {isAgentResult(line.status) ? (
                  <div className="rounded-xl px-4 py-3">
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
                        {(line.videoUrls?.length || line.videoUrl) && (
                          <AgentVideoStack
                            videoUrls={
                              line.videoUrls ??
                              (line.videoUrl ? [line.videoUrl] : [])
                            }
                            videoRecordingMeta={line.videoRecordingMeta}
                          />
                        )}
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
