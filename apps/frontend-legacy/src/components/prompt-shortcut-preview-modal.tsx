import { useUpdatePromptShortcut } from "@/hooks/prompt-shortcuts/use-prompt-shortcut-mutations";
import { usePromptShortcut } from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import { PencilIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { promptShortcutPath } from "../lib/prompt-compose";
import type { PromptShortcut } from "../lib/prompt-shortcuts";
import { modalBackdrop, modalHeader, modalTitle } from "../lib/ui";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownPreview } from "./markdown-preview";
import { Button } from "./ui";

type PromptShortcutPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  /** Full shortcut when already loaded (panel list). */
  shortcut?: PromptShortcut | null;
  /** Fetch by id when only reference is known (chat history). */
  shortcutId?: string | null;
  onApply?: (shortcut: PromptShortcut) => void;
  /** Enable preview ↔ edit toggle and save template. */
  editable?: boolean;
  onSaved?: (shortcut: PromptShortcut) => void;
};

export function PromptShortcutPreviewModal({
  open,
  onClose,
  shortcut: shortcutProp,
  shortcutId,
  onApply,
  editable = false,
  onSaved,
}: PromptShortcutPreviewModalProps) {
  const shouldFetch = open && !shortcutProp && Boolean(shortcutId);
  const { data: fetchedShortcut, isLoading, isError, error } = usePromptShortcut(
    shouldFetch ? shortcutId : null
  );
  const updateMutation = useUpdatePromptShortcut();

  const shortcut = shortcutProp ?? fetchedShortcut ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setDraftTemplate("");
      setSaveError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !shortcut) return;
    setDraftTemplate(shortcut.template);
    setIsEditing(false);
    setSaveError("");
  }, [open, shortcut?.id, shortcut?.template]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (isEditing) {
          setIsEditing(false);
          setDraftTemplate(shortcut?.template ?? "");
          setSaveError("");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, isEditing, shortcut?.template]);

  const handleSave = async () => {
    if (!shortcut) return;
    setSaveError("");

    try {
      const updated = await updateMutation.mutateAsync({
        id: shortcut.id,
        input: {
          label: shortcut.label,
          variant: shortcut.variant,
          platform: shortcut.platform ?? "browser",
          appPackage: shortcut.appPackage,
          url: shortcut.url,
          deepLink: shortcut.deepLink,
          template: draftTemplate,
          defaults: shortcut.defaults,
        },
      });
      onSaved?.(updated);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan template");
    }
  };

  if (!open) return null;

  const path = shortcut ? promptShortcutPath(shortcut.id) : shortcutId ? promptShortcutPath(shortcutId) : "";
  const canEdit = editable && Boolean(shortcut) && !isLoading && !isError;
  const saving = updateMutation.isPending;
  const showFooter = Boolean(onApply && shortcut) || canEdit;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="presentation">
      <div className={modalBackdrop} aria-label="Tutup" onClick={isEditing ? undefined : onClose} />
      <div
        className="relative z-[1] flex max-h-[min(88vh,720px)] w-[min(92vw,640px)] flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(12,14,22,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-shortcut-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={`${modalHeader} shrink-0 border-b border-white/8 pb-3`}>
          <div className="min-w-0">
            <h2 id="prompt-shortcut-preview-title" className={modalTitle}>
              {shortcut ? (
                <>
                  {shortcut.icon ? `${shortcut.icon} ` : ""}
                  {shortcut.label}
                  {isEditing ? (
                    <span className="ml-2 text-sm font-normal text-slate-500">— edit</span>
                  ) : null}
                </>
              ) : (
                "System Prompt"
              )}
            </h2>
            {path ? (
              <p className="m-0 mt-1 truncate text-xs text-slate-500" title={path}>
                {path}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && !isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="border-0 bg-transparent text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
                aria-label="Edit template"
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon size={16} />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="border-0 bg-transparent text-xl text-slate-300 hover:bg-slate-600/85 hover:text-slate-50"
              aria-label="Tutup"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setDraftTemplate(shortcut?.template ?? "");
                  setSaveError("");
                } else {
                  onClose();
                }
              }}
            >
              <XIcon size={16} />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading && !shortcut ? (
            <p className="m-0 text-sm text-slate-500">Memuat template…</p>
          ) : isError ? (
            <p className="m-0 text-sm text-red-400">
              {error instanceof Error ? error.message : "Gagal memuat template"}
            </p>
          ) : isEditing && shortcut ? (
            <MarkdownEditor
              value={draftTemplate}
              onChange={setDraftTemplate}
              minHeight={240}
              maxHeight={420}
              disabled={saving}
            />
          ) : shortcut?.template.trim() ? (
            <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 [&_p:first-child]:mt-0">
              <MarkdownPreview text={shortcut.template} />
            </div>
          ) : (
            <p className="m-0 text-sm text-slate-500">Template kosong.</p>
          )}

          {saveError ? <p className="mt-2 text-sm text-red-400">{saveError}</p> : null}
        </div>

        {showFooter ? (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-white/8 px-5 py-3">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setIsEditing(false);
                    setDraftTemplate(shortcut?.template ?? "");
                    setSaveError("");
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Tutup
                </Button>
                {onApply && shortcut ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onApply(shortcut);
                      onClose();
                    }}
                  >
                    Terapkan template
                  </Button>
                ) : null}
              </>
            )}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
