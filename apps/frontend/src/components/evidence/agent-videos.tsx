import { resolveApiUrl } from "@/lib/api/config";
import { useEffect, useRef, useState } from "react";
import type { VideoRecordingMeta } from "@knitto/shared";

type AgentVideosProps = {
  url: string;
};

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 1000;

const evidenceFrameClass =
  "overflow-hidden rounded-xl border border-black/10 bg-black/90 shadow-sm dark:border-white/10 dark:bg-black";

/** Session recording served from /api/agent-videos/{jobId}/{filename}.mp4 */
export function AgentVideos({ url }: AgentVideosProps) {
  const resolvedUrl = resolveApiUrl(url);
  const [playbackUrl, setPlaybackUrl] = useState(resolvedUrl);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    retriesRef.current = 0;
    setPlaybackUrl(resolveApiUrl(url));
  }, [url]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  if (!url) return null;

  const filename = decodeURIComponent((url.split("/").pop() || "").split("?")[0] || "");

  const handleError = () => {
    if (retriesRef.current >= MAX_RETRIES) return;
    retriesRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      const separator = resolvedUrl.includes("?") ? "&" : "?";
      setPlaybackUrl(`${resolvedUrl}${separator}retry=${Date.now()}`);
    }, RETRY_DELAY_MS);
  };

  return (
    <figure className="mx-auto mt-3 w-full max-w-xl">
      <div className={evidenceFrameClass}>
        <video
          key={playbackUrl}
          controls
          className="mx-auto block max-h-[320px] w-full bg-black object-contain"
          src={playbackUrl}
          preload="auto"
          onError={handleError}
        />
      </div>
      <figcaption
        className="mt-1.5 truncate px-1 text-center text-xs text-black-40 dark:text-slate-500"
        title={filename}
      >
        Video: {filename}
      </figcaption>
    </figure>
  );
}

type AgentVideoStackProps = {
  videoUrls: string[];
  videoRecordingMeta?: VideoRecordingMeta[];
};

export function AgentVideoStack({ videoUrls, videoRecordingMeta }: AgentVideoStackProps) {
  if (!videoUrls.length) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="text-sm font-semibold text-black-60 dark:text-slate-400">Recordings</div>
      {videoUrls.map((url, index) => {
        const meta = videoRecordingMeta?.find((m) => m.url === url) ?? videoRecordingMeta?.[index];
        const label = meta?.label ?? `TC${index + 1}`;
        return (
          <div key={url} className="space-y-1">
            <div className="text-xs font-medium text-black-40 dark:text-slate-500">{label}</div>
            <AgentVideos url={url} />
          </div>
        );
      })}
    </div>
  );
}
