import { resolveApiUrl } from "@/lib/api/config";
import { useEffect, useRef, useState } from "react";
import type { VideoRecordingMeta } from "@knitto/shared";

type AgentVideosProps = {
  url: string;
};

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 1000;

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

  const filename = url.split("/").pop() || "";

  const handleError = () => {
    if (retriesRef.current >= MAX_RETRIES) return;
    retriesRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      const separator = resolvedUrl.includes("?") ? "&" : "?";
      setPlaybackUrl(`${resolvedUrl}${separator}retry=${Date.now()}`);
    }, RETRY_DELAY_MS);
  };

  return (
    <div className="relative pb-4">
      <video
        key={playbackUrl}
        controls
        className="mt-3 max-h-[360px] rounded-lg border mx-auto border-white/10 bg-black w-full"
        src={playbackUrl}
        preload="auto"
        onError={handleError}
      />
      <div className="text-center w-full mt-2 text-gray-500 italic text-sm truncate">
        Video: {filename}
      </div>
    </div>
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
      <div className="text-sm font-semibold text-slate-400">Recordings</div>
      {videoUrls.map((url, index) => {
        const meta = videoRecordingMeta?.find((m) => m.url === url) ?? videoRecordingMeta?.[index];
        const label = meta?.label ?? `TC${index + 1}`;
        return (
          <div key={url} className="space-y-1">
            <div className="text-xs text-slate-500">{label}</div>
            <AgentVideos url={url} />
          </div>
        );
      })}
    </div>
  );
}
