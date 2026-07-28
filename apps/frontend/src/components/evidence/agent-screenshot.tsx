import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { resolveApiUrl } from "@/lib/api/config";
import { modalBackdrop, modalRoot } from "@/lib/utils/ui";
import { Button } from "@/components/chat/ui";

/** URLs may be Worker `/api/agent-screenshots/...` or absolute API Data / MinIO presigned. */
type AgentScreenshotsProps = {
  urls: string[];
};

type ScreenshotLightboxProps = {
  src: string;
  onClose: () => void;
};

function ScreenshotLightbox({ src, onClose }: ScreenshotLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const filename = src?.split("/").pop();

  return createPortal(
    <div className={modalRoot} role="presentation">
      <div className={modalBackdrop} aria-label="Tutup preview" onClick={onClose} />
      <div className="relative z-[1] flex h-[92vh] w-[min(96vw,1200px)] flex-col overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[rgba(8,10,18,0.98)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
        aria-label="Preview screenshot"
        onClick={(event) => event.stopPropagation()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={6}
          wheel={{ step: 0.12 }}
          doubleClick={{ mode: "reset" }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/8">
                <p className="m-0 truncate text-sm text-black-40 dark:text-slate-400">
                  {filename ? `${filename}` : "Scroll untuk zoom · drag untuk geser · double-click reset"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom in"
                    title="Zoom in"
                    onClick={() => zoomIn()}
                  >
                    <ZoomIn className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Zoom out"
                    title="Zoom out"
                    onClick={() => zoomOut()}
                  >
                    <ZoomOut className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Reset zoom"
                    title="Reset zoom"
                    onClick={() => resetTransform()}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 min-w-0"
                    aria-label="Tutup preview"
                    title="Tutup"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </header>

              <TransformComponent
                wrapperClass="!flex !min-h-0 !flex-1 !w-full !cursor-grab active:!cursor-grabbing"
                contentClass="!flex !h-full !w-full !items-center !justify-center !p-4"
              >
                <img
                  src={src}
                  alt="Screenshot bukti"
                  className="max-h-[calc(92vh-4.5rem)] max-w-full select-none object-contain"
                  draggable={false}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>,
    document.body
  );
}

/** All job evidence screenshots served from /api/agent-screenshots/{jobId}/{file}.png */
export function AgentScreenshots({ urls }: AgentScreenshotsProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const closePreview = useCallback(() => setPreviewSrc(null), []);

  if (!urls.length) return null;

  return (
    <>
      <div className="mt-3 flex flex-col items-center gap-4">
        {urls.map((src) => {
          const resolvedSrc = resolveApiUrl(src);
          const filename = decodeURIComponent((src.split("/").pop() || "").split("?")[0] || "");
          return (
            <figure key={src} className="w-full max-w-xl">
              <button
                type="button"
                className="block w-full overflow-hidden rounded-xl border border-black/10 bg-black/5 p-1.5 shadow-sm transition hover:border-black/20 hover:opacity-95 dark:border-white/10 dark:bg-black/40 dark:hover:border-white/20"
                onClick={() => setPreviewSrc(resolvedSrc)}
                title="Klik untuk preview"
              >
                <span className="flex max-h-[320px] items-center justify-center overflow-hidden rounded-lg bg-black/80 dark:bg-black">
                  <img
                    className="max-h-[320px] w-auto max-w-full cursor-zoom-in object-contain"
                    src={resolvedSrc}
                    alt="Screenshot bukti"
                    loading="lazy"
                  />
                </span>
              </button>
              <figcaption
                className="mt-1.5 truncate px-1 text-center text-xs text-black-40 dark:text-slate-500"
                title={filename}
              >
                Gambar: {filename}
              </figcaption>
            </figure>
          );
        })}
      </div>

      {previewSrc && <ScreenshotLightbox src={previewSrc} onClose={closePreview} />}
    </>
  );
}
