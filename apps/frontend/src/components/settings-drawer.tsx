import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ButtonIcon } from "./ui";

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function SettingsDrawer({ open, onClose, children }: SettingsDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close settings"
        onClick={onClose}
      />
      <aside
        className="relative z-[1] flex h-full w-full max-w-[400px] flex-col border-l border-white/8 bg-[#171717] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/8 px-4">
          <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
          <ButtonIcon
            type="button"
            variant="ghost"
            aria-label="Close settings"
            onClick={onClose}
            className="size-8 rounded-lg"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </ButtonIcon>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
