import type { StorageEntry } from "@knitto/shared";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { SendIcon, StopCircleIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";
import {
  ACCEPTED_FILE_INPUT,
  filesToPromptAttachments,
  isAcceptedAttachment,
  isPasteableImage,
  storageEntryToPromptAttachment,
  syncAttachmentsAfterDelete,
  syncAttachmentsAfterRename,
  type PromptAttachment,
} from "../lib/prompt-attachment";
import type { ConnectionState } from "../lib/types";
import { BridgeAndModel } from "./bridge-and-model";
import { PromptAttachments } from "./prompt-attachment-chip";
import { StorageMediaModal } from "./storage-media-modal";
import { Button, ButtonIcon } from "./ui";

const MIN_HEIGHT_PX = 96;
const MAX_HEIGHT_PX = 256;
const COMPOSER_MIN_HEIGHT_PX = 44;
const COMPOSER_MAX_HEIGHT_PX = 160;
const MAX_ATTACHMENTS = 4;

type PromptEditorProps = {
  variant?: "default" | "composer";
  value: string;
  attachments: PromptAttachment[];
  placeholder?: string;
  connectionState: ConnectionState;
  selectedBridgeId: string;
  workerState: "idle" | "busy";
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: PromptAttachment[]) => void;
  onSend: () => void;
  onCancel: () => void;
};

function resolveValidationMessage(
  connectionState: ConnectionState,
  selectedBridgeId: string,
  hasContent: boolean
): string | null {
  if (connectionState !== "connected") {
    if (connectionState === "connecting") {
      return "Menghubungkan ke WebSocket…";
    }
    if (connectionState === "error") {
      return "Koneksi WebSocket gagal — periksa host/port lalu Connect lagi.";
    }
    return "Connect WebSocket terlebih dahulu di panel Connection.";
  }
  if (!selectedBridgeId) {
    return "Pilih bridge terlebih dahulu.";
  }
  if (!hasContent) {
    return "Tulis prompt atau lampirkan file sebelum mengirim.";
  }
  return null;
}

function autosizeEditor(
  editorElement: HTMLElement,
  minHeight: number,
  maxHeight: number
): void {
  editorElement.style.height = "auto";
  const next = Math.min(Math.max(editorElement.scrollHeight, minHeight), maxHeight);
  editorElement.style.height = `${next}px`;
  editorElement.style.overflowY = editorElement.scrollHeight > maxHeight ? "auto" : "hidden";
}

function isEmptyMarkdown(markdown: string): boolean {
  return !markdown.trim();
}

/** TipTap empty doc may serialize differently than parent `""` — treat both as empty. */
function markdownMatches(a: string, b: string): boolean {
  if (isEmptyMarkdown(a) && isEmptyMarkdown(b)) return true;
  return a === b;
}

function applyEditorMarkdown(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  markdown: string,
  minHeight: number,
  maxHeight: number
): void {
  if (isEmptyMarkdown(markdown)) {
    editor.commands.clearContent(false);
  } else {
    editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
  }
  autosizeEditor(editor.view.dom as HTMLElement, minHeight, maxHeight);
}

export function PromptEditor({
  variant = "default",
  value,
  attachments,
  placeholder = 'e.g. carikan produk "combed 30s" di halaman knitto.co.id',
  connectionState,
  selectedBridgeId,
  workerState,
  onChange,
  onAttachmentsChange,
  onSend,
  onCancel,
}: PromptEditorProps) {
  const isComposer = variant === "composer";
  const minHeight = isComposer ? COMPOSER_MIN_HEIGHT_PX : MIN_HEIGHT_PX;
  const maxHeight = isComposer ? COMPOSER_MAX_HEIGHT_PX : MAX_HEIGHT_PX;

  const skipEmit = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [storageModalOpen, setStorageModalOpen] = useState(false);

  const hasText = Boolean(value.trim());
  const hasContent = hasText || attachments.length > 0;
  const canSend =
    connectionState === "connected" && Boolean(selectedBridgeId) && hasContent;
  const validationMessage = useMemo(
    () =>
      workerState === "busy"
        ? null
        : resolveValidationMessage(connectionState, selectedBridgeId, hasContent),
    [connectionState, selectedBridgeId, hasContent, workerState]
  );

  const appendAttachments = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      if (!incoming.length) return;

      const slotsLeft = MAX_ATTACHMENTS - attachments.length;
      if (slotsLeft <= 0) {
        setAttachError(`Maksimal ${MAX_ATTACHMENTS} lampiran per prompt.`);
        return;
      }

      try {
        const accepted = incoming.filter(isAcceptedAttachment).slice(0, slotsLeft);
        if (!accepted.length) {
          setAttachError(
            "Tipe file tidak didukung. File executable atau tanpa ekstensi tidak diizinkan."
          );
          return;
        }
        const next = await filesToPromptAttachments(accepted);
        onAttachmentsChange([...attachments, ...next]);
        setAttachError(null);
      } catch (error) {
        setAttachError(error instanceof Error ? error.message : String(error));
      }
    },
    [attachments, onAttachmentsChange]
  );

  const attachedStoragePaths = useMemo(
    () => attachments.map((a) => a.storagePath),
    [attachments]
  );

  const handleStorageApply = useCallback(
    async (entries: StorageEntry[]) => {
      if (!entries.length) return;

      const slotsLeft = MAX_ATTACHMENTS - attachments.length;
      if (slotsLeft <= 0) {
        setAttachError(`Maksimal ${MAX_ATTACHMENTS} lampiran per prompt.`);
        throw new Error("Slot lampiran penuh");
      }

      const unique = entries.filter(
        (entry, index, list) =>
          list.findIndex((item) => item.path === entry.path) === index &&
          !attachments.some((a) => a.storagePath === entry.path)
      );

      const toAdd = unique.slice(0, slotsLeft);
      if (!toAdd.length) {
        setAttachError("File yang dipilih sudah dilampirkan.");
        throw new Error("Sudah dilampirkan");
      }

      const newAttachments = toAdd.map((entry) => storageEntryToPromptAttachment(entry));

      onAttachmentsChange([...attachments, ...newAttachments]);
      setAttachError(null);
    },
    [attachments, onAttachmentsChange]
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file && isPasteableImage(file)) imageFiles.push(file);
      }

      if (!imageFiles.length) return;
      event.preventDefault();
      await appendAttachments(imageFiles);
    },
    [appendAttachments]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (workerState === "busy") return;
      await appendAttachments(event.dataTransfer.files);
    },
    [appendAttachments, workerState]
  );

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
    setAttachError(null);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editable: workerState !== "busy",
    editorProps: {
      attributes: {
        class: isComposer ? "prompt-editor-content prompt-editor-content--composer" : "prompt-editor-content",
      },
    },
    onCreate: ({ editor: ed }) => {
      autosizeEditor(ed.view.dom as HTMLElement, minHeight, maxHeight);
    },
    onUpdate: ({ editor: ed }) => {
      autosizeEditor(ed.view.dom as HTMLElement, minHeight, maxHeight);
      if (skipEmit.current) return;
      onChange(ed.getMarkdown());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(workerState !== "busy");
  }, [editor, workerState]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getMarkdown();
    if (markdownMatches(value, current)) return;

    skipEmit.current = true;
    applyEditorMarkdown(editor, value, minHeight, maxHeight);
    queueMicrotask(() => {
      skipEmit.current = false;
    });
  }, [editor, value]);

  const isBusy = workerState === "busy";
  const actionTitle = isBusy ? "Stop job" : validationMessage ?? "Send prompt";
  const canAttach = !isBusy && attachments.length < MAX_ATTACHMENTS;

  

  return (
    <div className="w-full">
      <PromptAttachments
        attachments={attachments}
        disabled={isBusy}
        onRemove={removeAttachment}
      />

      <div
        className={cn(
          "relative transition-colors",
          isComposer
            ? "rounded-[28px] border border-white/10 bg-[#2f2f2f] shadow-lg focus-within:border-white/15"
            : "rounded-xl border border-white/8 bg-[rgba(15,17,26,0.88)] focus-within:border-white/8",
          "focus-within:outline-none focus-within:ring-0",
          dragOver && "border-blue-500/40 bg-blue-500/5",
          validationMessage && !isBusy && !isComposer && "border-amber-500/20",
          isBusy && "opacity-90"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isBusy) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_INPUT}
          multiple
          className="hidden"
          onChange={async (event) => {
            const files = event.target.files;
            if (files?.length) await appendAttachments(files);
            event.target.value = "";
          }}
        />

        <div className="flex items-end gap-2 p-2.5 pl-2">
          <ButtonIcon
            type="button"
            variant="ghost"
            className="mb-0.5 h-9 w-9 min-w-0 shrink-0 rounded-full! border-white/10 bg-slate-800/80 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [&_svg]:h-4 [&_svg]:w-4"
            aria-label="Lampirkan media"
            title="Lampirkan media"
            disabled={!canAttach}
            onClick={() => setStorageModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path
                d="M21 15l-5-5L5 21"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ButtonIcon>

          <div className="min-w-0 flex-1 py-1 pr-1">
            <EditorContent editor={editor} />
          </div>

          <Button
            variant={isBusy ? "danger" : "primary"}
            className={cn(
              "size-10 p-0! shadow-[0_4px_12px_rgba(0,0,0,0.2)] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
              isComposer ? "rounded-full" : "rounded-lg"
            )}
            aria-label={actionTitle}
            title={actionTitle}
            onClick={isBusy ? onCancel : onSend}
            disabled={!isBusy && !canSend}
          >
            {isBusy ? (
              <StopCircleIcon size={16} />
            ) : (
              <SendIcon size={16} />
            )}
          </Button>
        </div>

        {dragOver && !isBusy && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[3] flex items-center justify-center border border-dashed border-blue-400/50 bg-blue-500/10 text-sm font-medium text-blue-300",
              isComposer ? "rounded-[28px]" : "rounded-xl"
            )}
          >
            Lepaskan file di sini
          </div>
        )}
      </div>

      {attachError && (
        <p className="mt-2 text-xs leading-snug text-red-400" role="alert">
          {attachError}
        </p>
      )}
      {validationMessage && !isComposer && (
        <p className="mt-2 text-xs leading-snug text-amber-400/90" role="status">
          {validationMessage}
        </p>
      )}

      <StorageMediaModal
        open={storageModalOpen}
        slotsLeft={MAX_ATTACHMENTS - attachments.length}
        attachedPaths={attachedStoragePaths}
        onClose={() => setStorageModalOpen(false)}
        onApply={handleStorageApply}
        onEntryDeleted={(path) => {
          onAttachmentsChange(syncAttachmentsAfterDelete(attachments, path));
        }}
        onEntryRenamed={(oldPath, newPath) => {
          onAttachmentsChange(syncAttachmentsAfterRename(attachments, oldPath, newPath));
        }}
      />

      <BridgeAndModel />
    </div>
  );
}
