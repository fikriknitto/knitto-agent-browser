import type { Editor } from "@tiptap/react";

export function autosizeEditor(
  editorElement: HTMLElement,
  minHeight: number,
  maxHeight: number
): void {
  const scrollTop = editorElement.scrollTop;
  editorElement.style.height = "auto";
  const next = Math.min(Math.max(editorElement.scrollHeight, minHeight), maxHeight);
  editorElement.style.height = `${next}px`;
  editorElement.style.overflowY = editorElement.scrollHeight > maxHeight ? "auto" : "hidden";
  editorElement.scrollTop = scrollTop;
}

export function isEmptyMarkdown(markdown: string): boolean {
  return !markdown.trim();
}

export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n+$/, "")
    .trim();
}

/** TipTap empty doc may serialize differently than parent `""` — treat both as empty. */
export function markdownMatches(a: string, b: string): boolean {
  const left = normalizeMarkdown(a);
  const right = normalizeMarkdown(b);
  if (!left && !right) return true;
  return left === right;
}

export function shouldSkipExternalMarkdownSync(
  editor: Editor,
  incomingValue: string,
  lastEmittedMarkdown: string
): boolean {
  const current = editor.getMarkdown();
  if (markdownMatches(incomingValue, current)) return true;
  if (markdownMatches(incomingValue, lastEmittedMarkdown)) return true;
  return false;
}

export function setEditorPlainText(editor: Editor, text: string): void {
  const lines = text.split("\n");
  editor.commands.setContent(
    {
      type: "doc",
      content: lines.map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      })),
    },
    { emitUpdate: false }
  );
}

export function applyEditorMarkdown(
  editor: Editor,
  markdown: string,
  minHeight: number,
  maxHeight: number
): void {
  if (isEmptyMarkdown(markdown)) {
    editor.commands.clearContent(false);
  } else {
    editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
    if (!normalizeMarkdown(editor.getMarkdown())) {
      setEditorPlainText(editor, markdown);
    }
  }
  autosizeEditor(editor.view.dom as HTMLElement, minHeight, maxHeight);
}

export function releaseSkipEmit(skipEmit: { current: boolean }): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      skipEmit.current = false;
    });
  });
}
