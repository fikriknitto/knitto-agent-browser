import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import type { ChatPromptBase } from "../lib/prompt-compose";
import type { ChatLine } from "../lib/types";
import { statusLine } from "../lib/ui";
import { MarkdownPreview } from "./markdown-preview";
import { ChatAttachments } from "./prompt-attachment-chip";
import { Badge, Card, CardTitle } from "./ui";

const promptBaseVariantClasses: Record<ChatPromptBase["variant"], string> = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-500/30 bg-amber-500/10 text-yellow-300",
  neutral: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

function ChatPromptBases({ bases }: { bases: ChatPromptBase[] }) {
  if (!bases.length) return null;

  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <div className="text-xs font-semibold text-slate-500">System Prompt</div>
      <div className="flex flex-wrap gap-1.5" aria-label="System Prompt">
        {bases.map((base) => (
          <span
            key={base.id}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
              promptBaseVariantClasses[base.variant]
            )}
            title={base.path}
          >
            {base.icon ? `${base.icon} ` : ""}
            <span className="truncate">{base.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

type JobProgressProps = {
  workerState: "idle" | "busy";
  lastJobMessage: string;
  lastJobProgress: number;
};

export function JobProgress({ workerState, lastJobMessage, lastJobProgress }: JobProgressProps) {
  return (
    <Card>
      <CardTitle compact>Job progress</CardTitle>
      <p className={statusLine}>
        Worker:{" "}
        <Badge variant={workerState === "busy" ? "warning" : "default"}>
          {workerState === "busy" ? "Busy" : "Idle"}
        </Badge>
      </p>
      {lastJobMessage && (
        <>
          <p className="my-2 text-sm text-slate-300">{lastJobMessage}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-300 ease-out"
              style={{ width: `${lastJobProgress}%` }}
            />
          </div>
        </>
      )}
    </Card>
  );
}

function isAgentResult(status: string | undefined): boolean {
  return status === "completed" || status === "error" || status === "cancelled";
}

export function ChatHistory({ lines }: { lines: ChatLine[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-4  py-4"
    >


      {lines.map((line) =>
        line.role === "user" ? (
          <div key={`${line.role}-${line.id}`} className="flex justify-end">
            <div className="max-w-[85%] rounded-lg bg-[#2f2f2f] px-4 py-3 text-sm leading-relaxed text-slate-100">
              {line.promptBases?.length ? <ChatPromptBases bases={line.promptBases} /> : null}
              {line.attachments?.length && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-slate-500">Attachments</div>
                  <div className={line.text.trim() || line.promptBases?.length ? "mt-2" : undefined}>
                    <ChatAttachments attachments={line.attachments} />
                  </div>
                </div>
              )}

              {line.text.trim() && (
                <div>
                  {(line?.promptBases?.length && line?.promptBases?.length > 0) || (line?.attachments?.length && line?.attachments?.length > 0) && <div className="text-xs font-semibold text-slate-500">Prompt</div>}
                  <div className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
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
                <div className="rounded-xl px-4 py-3">
                  <MarkdownPreview
                    text={line.text}
                    screenshots={line.screenshots}
                    videoUrl={line.videoUrl}
                  />
                </div>
              ) : (
                <>
                  {line.text.trim() && (
                    <span className="wrap-break-word text-slate-300">{line.text}</span>
                  )}
                </>
              )}
              {line.status && line.status !== "completed" && (
                <span className="mt-1.5 block text-xs text-slate-500">{line.status}</span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}