import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { resolveApiUrl } from "@/lib/api/config";
import { modalBackdrop, modalRoot } from "../lib/ui";
import { Button } from "./ui";

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
      <div
        className="relative z-[1] flex h-[92vh] w-[min(96vw,1200px)] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(8,10,18,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
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
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <p className="m-0 truncate text-sm text-slate-400">
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
      <div className="mt-3 flex flex-col gap-3">
        {urls.map((src) => {
          const resolvedSrc = resolveApiUrl(src);
          return (
            <div key={src} className="rounded-lg relative overflow-hidden">
              <img
                onClick={() => setPreviewSrc(resolvedSrc)}
                className="block max-h-[360px] overflow-hidden w-full object-contain transition cursor-zoom-in hover:opacity-95"
                src={resolvedSrc}
                alt="Screenshot bukti"
                loading="lazy"
              />
              <div className="text-center w-full mt-2 text-gray-500 italic text-sm truncate">Gambar : {src.split("/").pop()}</div>
            </div>
          );
        })}
      </div>

      {previewSrc && <ScreenshotLightbox src={previewSrc} onClose={closePreview} />}
    </>
  );
}
