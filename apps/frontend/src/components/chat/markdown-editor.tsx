import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import { createMarkdownClipboardEditorProps } from "@/lib/tiptap/editor-clipboard";
import {
  applyEditorMarkdown,
  autosizeEditor,
  releaseSkipEmit,
  shouldSkipExternalMarkdownSync,
} from "@/lib/tiptap/editor-markdown";
import { createPromptEditorExtensions } from "@/lib/tiptap/prompt-editor-extensions";

const DEFAULT_MIN_HEIGHT_PX = 280;
const DEFAULT_MAX_HEIGHT_PX = 480;

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Tulis konten markdown…",
  minHeight = DEFAULT_MIN_HEIGHT_PX,
  maxHeight = DEFAULT_MAX_HEIGHT_PX,
  disabled = false,
  className,
}: MarkdownEditorProps) {
  const skipEmit = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const lastEmittedMarkdownRef = useRef(value);
  const markdownClipboardProps = useMemo(
    () => createMarkdownClipboardEditorProps(() => editorRef.current),
    []
  );

  const editor = useEditor({
    extensions: createPromptEditorExtensions(placeholder),
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      ...markdownClipboardProps,
      attributes: {
        class: cn("markdown-editor-content", className),
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
    editor.setEditable(!disabled);
  }, [editor, disabled]);

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

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2">
      <EditorContent editor={editor} />
    </div>
  );
}
