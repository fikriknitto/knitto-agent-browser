import type { AutomationPlatform, MobileConfig, StorageEntry } from "@knitto/shared";
import { useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { SendIcon, StopCircleIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/cn";
import {
  countTestCasesByPlatform,
  formatTestCaseShortcutSummary,
  parseTestCasesFromPrompt,
  shortcutToRegistryEntry,
  validateHybridPrompt,
  type ShortcutRegistryEntry,
} from "../lib/parse-test-cases";
import { usePromptShortcuts } from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import {
  ACCEPTED_FILE_INPUT,
  attachmentKey,
  filesToPromptAttachments,
  isAcceptedAttachment,
  isPasteableImage,
  isSameAttachment,
  storageEntryToPromptAttachment,
  syncAttachmentsAfterDelete,
  syncAttachmentsAfterRename,
  type PromptAttachment,
} from "../lib/prompt-attachment";
import type { AppliedPromptShortcut } from "../lib/prompt-compose";
import type { BridgeSummary, ConnectionState } from "../lib/types";
import { AgentAndModel } from "./agent-and-model";
import { PlatformSelector } from "./platform-selector";
import { useMobileDevices } from "@/contexts/mobile-devices-context";
import { PromptAttachments } from "./prompt-attachment-chip";
import { PromptTemplateShortcut } from "./prompt-template-shortcut";
import { MediaLibraryModal } from "./media-library-modal";
import { Button } from "./ui";
import { invalidateMediaLibraryEntries } from "@/query/invalidate-media-library";
import { createPromptEditorExtensions } from "@/lib/tiptap/prompt-editor-extensions";
import {
  applyEditorMarkdown,
  autosizeEditor,
  releaseSkipEmit,
  shouldSkipExternalMarkdownSync,
} from "@/lib/tiptap/editor-markdown";
import { createMarkdownClipboardEditorProps } from "@/lib/tiptap/editor-clipboard";

const MIN_HEIGHT_PX = 96;
const MAX_HEIGHT_PX = 256;
const COMPOSER_MIN_HEIGHT_PX = 44;
const COMPOSER_MAX_HEIGHT_PX = 160;
const MAX_ATTACHMENTS = 4;

type PromptEditorProps = {
  variant?: "default" | "composer";
  value: string;
  attachments: PromptAttachment[];
  promptBases: AppliedPromptShortcut[];
  platform: AutomationPlatform;
  mobileConfig: MobileConfig;
  placeholder?: string;
  connectionState: ConnectionState;
  selectedBridgeId: string;
  selectedModel: string;
  bridges: BridgeSummary[];
  workerState: "idle" | "busy";
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: PromptAttachment[]) => void;
  onRemovePromptBase: (id: string) => void;
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
  onPlatformChange: (platform: AutomationPlatform) => void;
  onMobileConfigChange: (config: MobileConfig) => void;
  onSend: () => void;
  onCancel: () => void;
};

function resolveValidationMessage(
  connectionState: ConnectionState,
  selectedBridgeId: string,
  hasContent: boolean,
  promptText: string,
  platform: AutomationPlatform,
  mobileConfig: MobileConfig,
  mobileDeviceCount: number,
  shortcutRegistry: ShortcutRegistryEntry[]
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
    return "Pilih agent terlebih dahulu.";
  }
  if (!hasContent) {
    return "Tulis prompt atau lampirkan file sebelum mengirim.";
  }
  if (platform === "mobile") {
    if (!mobileConfig.appPackage?.trim()) {
      return "Pilih package Android terlebih dahulu.";
    }
    if (mobileDeviceCount === 0) {
      return "Tidak ada device Android terhubung.";
    }
  }
  if (platform === "hybrid") {
    const result = validateHybridPrompt(promptText, mobileConfig, shortcutRegistry);
    if (result.errors.length) {
      return result.errors[0] ?? "Prompt hybrid tidak valid.";
    }
    const hasMobileTc = result.testCases.some((tc) => tc.platform === "mobile");
    if (hasMobileTc && mobileDeviceCount === 0) {
      return "Tidak ada device Android terhubung untuk TC mobile.";
    }
  }
  return null;
}

export function PromptEditor({
  variant = "default",
  value,
  attachments,
  promptBases,
  platform,
  mobileConfig,
  placeholder = 'e.g. carikan produk "combed 30s" di halaman knitto.co.id',
  connectionState,
  selectedBridgeId,
  selectedModel,
  bridges,
  workerState,
  onChange,
  onAttachmentsChange,
  onRemovePromptBase,
  onSelectBridge,
  onSelectModel,
  onPlatformChange,
  onMobileConfigChange,
  onSend,
  onCancel,
}: PromptEditorProps) {
  const isComposer = variant === "composer";
  const minHeight = isComposer ? COMPOSER_MIN_HEIGHT_PX : MIN_HEIGHT_PX;
  const maxHeight = isComposer ? COMPOSER_MAX_HEIGHT_PX : MAX_HEIGHT_PX;

  const skipEmit = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const lastEmittedMarkdownRef = useRef(value);
  const markdownClipboardProps = useMemo(
    () => createMarkdownClipboardEditorProps(() => editorRef.current),
    []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [storageModalOpen, setStorageModalOpen] = useState(false);

  const { devices: mobileDevices } = useMobileDevices();
  const { data: promptShortcuts = [] } = usePromptShortcuts();
  const shortcutRegistry = useMemo(
    () => promptShortcuts.map((shortcut) => shortcutToRegistryEntry(shortcut)),
    [promptShortcuts]
  );
  const hasText = Boolean(value.trim());
  const hasContent = hasText || attachments.length > 0 || promptBases.length > 0;
  const mobileReady =
    platform === "browser" ||
    (platform === "mobile" &&
      Boolean(mobileConfig.appPackage?.trim()) &&
      mobileDevices.length > 0) ||
    (platform === "hybrid" &&
      (() => {
        const result = validateHybridPrompt(value, mobileConfig, shortcutRegistry);
        if (result.errors.length) return false;
        const hasMobileTc = result.testCases.some((tc) => tc.platform === "mobile");
        return !hasMobileTc || mobileDevices.length > 0;
      })());
  const canSend =
    connectionState === "connected" &&
    Boolean(selectedBridgeId) &&
    hasContent &&
    mobileReady;
  const validationMessage = useMemo(
    () =>
      workerState === "busy"
        ? null
        : resolveValidationMessage(
            connectionState,
            selectedBridgeId,
            hasContent,
            value,
            platform,
            mobileConfig,
            mobileDevices.length,
            shortcutRegistry
          ),
    [
      connectionState,
      selectedBridgeId,
      hasContent,
      workerState,
      platform,
      mobileConfig,
      mobileDevices.length,
      value,
      shortcutRegistry,
    ]
  );

  const hybridPreview = useMemo(() => {
    if (platform !== "hybrid") return null;
    const result = parseTestCasesFromPrompt(value, mobileConfig, shortcutRegistry);
    if (result.errors.length) {
      return result.errors[0] ?? "Prompt hybrid tidak valid.";
    }
    if (!result.testCases.length) return null;
    const counts = countTestCasesByPlatform(result.testCases);
    const lines = result.testCases.map((tc) => {
      const shortcutSummary = formatTestCaseShortcutSummary(tc);
      const shortcutPart = shortcutSummary ? ` ← ${shortcutSummary}` : "";
      const varKeys = tc.variables ? Object.keys(tc.variables) : [];
      const vars = varKeys.length ? ` (${varKeys.join(", ")})` : "";
      return `· ${tc.id} ${tc.platform}${shortcutPart}${vars}`;
    });
    return `Detected: ${counts.total} test cases · ${counts.browser} browser · ${counts.mobile} mobile\n${lines.join("\n")}`;
  }, [platform, value, mobileConfig, shortcutRegistry]);

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
        await invalidateMediaLibraryEntries(queryClient);
        setAttachError(null);
      } catch (error) {
        setAttachError(error instanceof Error ? error.message : String(error));
      }
    },
    [attachments, onAttachmentsChange, queryClient]
  );

  const attachedLibraryKeys = useMemo(
    () => attachments.map(attachmentKey).filter(Boolean),
    [attachments]
  );

  const handleLibraryApply = useCallback(
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
          !attachments.some((a) => isSameAttachment(a, entry.path))
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
    extensions: createPromptEditorExtensions(placeholder),
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editable: workerState !== "busy",
    editorProps: {
      ...markdownClipboardProps,
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
      const markdown = ed.getMarkdown();
      lastEmittedMarkdownRef.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(workerState !== "busy");
  }, [editor, workerState]);

  useEffect(() => {
    if (!editor) return;
    if (shouldSkipExternalMarkdownSync(editor, value, lastEmittedMarkdownRef.current)) {
      return;
    }

    skipEmit.current = true;
    applyEditorMarkdown(editor, value, minHeight, maxHeight);
    lastEmittedMarkdownRef.current = value;
    releaseSkipEmit(skipEmit);
  }, [editor, value, minHeight, maxHeight]);

  const isBusy = workerState === "busy";
  const actionTitle = isBusy ? "Stop job" : validationMessage ?? "Send prompt";
  const canAttach = !isBusy && attachments.length < MAX_ATTACHMENTS;



  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-1">
        {attachments.length > 0 && (
          <PromptAttachments
            attachments={attachments}
            disabled={isBusy}
            onRemove={removeAttachment}
          />
        )}

        {promptBases.length > 0 && (
          <PromptTemplateShortcut
            bases={promptBases}
            disabled={isBusy}
            onRemove={onRemovePromptBase}
          />
        )}
      </div>

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

        <div className={cn("flex flex-col", isComposer ? "gap-1 p-2.5" : "gap-0")}>
          <div
            className={cn(
              "flex gap-2",
              isComposer ? "px-1 pt-1" : "items-end p-2.5 pl-2"
            )}
          >
            {!isComposer && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 shrink-0 rounded-full border-white/10 bg-slate-800/80"
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
              </Button>
            )}

            <div className={cn("min-w-0 flex-1", isComposer ? "py-0.5" : "py-1 pr-1")}>
              <EditorContent editor={editor} />
            </div>

            {!isComposer && (
              <Button
                variant={isBusy ? "destructive" : "default"}
                size="icon"
                className="rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                aria-label={actionTitle}
                title={actionTitle}
                onClick={isBusy ? onCancel : onSend}
                disabled={!isBusy && !canSend}
              >
                {isBusy ? <StopCircleIcon size={16} /> : <SendIcon size={16} />}
              </Button>
            )}
          </div>

          {isComposer && (
            <div className="flex flex-col gap-2 px-1 pb-0.5">
              <PlatformSelector
                platform={platform}
                mobileConfig={mobileConfig}
                disabled={isBusy}
                onPlatformChange={onPlatformChange}
                onMobileConfigChange={onMobileConfigChange}
              />
              {validationMessage && !isBusy && (
                <p className="px-1 text-xs leading-snug text-amber-400/90" role="status">
                  {validationMessage}
                </p>
              )}
              {hybridPreview && !validationMessage && (
                <p className="whitespace-pre-line px-1 text-xs text-slate-500">{hybridPreview}</p>
              )}
              <div className="flex items-center justify-between gap-2">
              <AgentAndModel
                bridges={bridges}
                selectedBridgeId={selectedBridgeId}
                selectedModel={selectedModel}
                disabled={isBusy}
                onSelectBridge={onSelectBridge}
                connectionState={connectionState}
                onSelectModel={onSelectModel}
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full bg-transparent hover:opacity-55"
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
                </Button>
                <Button
                  variant={isBusy ? "destructive" : "default"}
                  size="icon-sm"
                  className="rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                  aria-label={actionTitle}
                  title={actionTitle}
                  onClick={isBusy ? onCancel : onSend}
                  disabled={!isBusy && !canSend}
                >
                  {isBusy ? <StopCircleIcon size={16} /> : <SendIcon size={16} />}
                </Button>
              </div>
              </div>
            </div>
          )}
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

      <MediaLibraryModal
        open={storageModalOpen}
        slotsLeft={MAX_ATTACHMENTS - attachments.length}
        attachedPaths={attachedLibraryKeys}
        onClose={() => setStorageModalOpen(false)}
        onApply={handleLibraryApply}
        onEntryDeleted={(path) => {
          onAttachmentsChange(syncAttachmentsAfterDelete(attachments, path));
        }}
        onEntryRenamed={(oldPath, newPath) => {
          onAttachmentsChange(syncAttachmentsAfterRename(attachments, oldPath, newPath));
        }}
      />

    </div>
  );
}
