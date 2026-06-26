import { useEffect, useRef, useState } from "react";

type AgentVideosProps = {
  url: string;
};

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 1000;

/** Session recording served from /api/agent-videos/{jobId}/{filename}.mp4 */
export function AgentVideos({ url }: AgentVideosProps) {
  const [playbackUrl, setPlaybackUrl] = useState(url);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    retriesRef.current = 0;
    setPlaybackUrl(url);
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
      const separator = url.includes("?") ? "&" : "?";
      setPlaybackUrl(`${url}${separator}retry=${Date.now()}`);
    }, RETRY_DELAY_MS);
  };

  return (
    <div className="relative">
      <video
        key={playbackUrl}
        controls
        className="mt-3 max-h-[360px] rounded-lg border mx-auto border-white/10 bg-black"
        src={playbackUrl}
        preload="metadata"
        onError={handleError}
      />
      <div className="text-center w-full mt-2 text-gray-500 italic text-sm truncate">Video : {filename}</div>

    </div>
  );
}
