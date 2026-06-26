import { useEffect, useRef } from "react";
import type { ChatLine } from "../lib/types";
import { statusLine } from "../lib/ui";
import { MarkdownPreview } from "./markdown-preview";
import { ChatAttachments } from "./prompt-attachment-chip";
import { Badge, Card, CardTitle } from "./ui";

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
      {lines.length === 0 && (
        <p className="m-auto py-12 text-center text-sm text-slate-500">
          Kirim prompt untuk memulai automation
        </p>
      )}
      {lines.map((line) =>
        line.role === "user" ? (
          <div key={`${line.role}-${line.id}`} className="flex justify-end">
            <div className="max-w-[85%] rounded-lg bg-[#2f2f2f] px-4 py-3 text-sm leading-relaxed text-slate-100">
              {line.text.trim() && <span className="wrap-break-word">{line.text}</span>}
              {line.attachments?.length ? (
                <div className={line.text.trim() ? "mt-2" : undefined}>
                  <ChatAttachments attachments={line.attachments} />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div key={`${line.role}-${line.id}`} className="flex w-full justify-start pb-[200px]">
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
