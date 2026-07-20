import type { Editor } from "@tiptap/react";
import type { EditorProps } from "@tiptap/pm/view";

type MarkdownManager = {
  serialize?: (content: unknown) => string;
};

type InlinePasteNode =
  | { type: "text"; text: string }
  | { type: "hardBreak" };

function getMarkdownManager(editor: Editor): MarkdownManager | undefined {
  const storage = editor.storage as { markdown?: MarkdownManager };
  if (storage.markdown?.serialize) return storage.markdown;
  const editorMarkdown = (editor as Editor & { markdown?: MarkdownManager }).markdown;
  return editorMarkdown;
}

function serializeSelectionMarkdown(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  if (empty) return editor.getMarkdown();

  const docSize = editor.state.doc.content.size;
  if (from <= 1 && to >= docSize - 1) {
    return editor.getMarkdown();
  }

  const manager = getMarkdownManager(editor);
  if (manager?.serialize) {
    try {
      const fragment = editor.state.doc.cut(from, to);
      return manager.serialize(fragment.toJSON());
    } catch {
      // fall through to plain text
    }
  }

  return editor.state.doc.textBetween(from, to, "\n\n");
}

function clipboardHasImage(event: ClipboardEvent): boolean {
  const items = event.clipboardData?.items;
  if (!items?.length) return false;
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) return true;
  }
  return false;
}

/** Normalize line endings only (keep trailing newlines for code blocks). */
export function normalizePasteLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Normalize clipboard text and drop trailing newlines that force empty paragraphs. */
export function preparePasteText(text: string): string {
  return normalizePasteLineEndings(text).replace(/\n+$/g, "");
}

/**
 * True when paste should be parsed as markdown blocks (headings, lists, fences, etc.).
 * Plain single/multi-line text stays inline to avoid unwanted new paragraphs.
 */
export function isBlockMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\n\s*\n/.test(trimmed)) return true;
  return /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|\|.+\|)/m.test(trimmed);
}

function toInlinePasteContent(text: string): string | InlinePasteNode[] {
  if (!text.includes("\n")) return text;

  const nodes: InlinePasteNode[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line) nodes.push({ type: "text", text: line });
    if (i < lines.length - 1) nodes.push({ type: "hardBreak" });
  }
  return nodes;
}

/** codeBlock only allows text (+ literal \\n), not hardBreak / paragraph nodes. */
function insertPlainTextInCodeBlock(editor: Editor, text: string): void {
  const { state, view } = editor;
  view.dispatch(state.tr.insertText(text));
}

export function createMarkdownClipboardEditorProps(
  getEditor: () => Editor | null
): Pick<EditorProps, "handleDOMEvents" | "handlePaste"> {
  return {
    handleDOMEvents: {
      copy: (_view, event) => {
        const editor = getEditor();
        if (!editor || !event.clipboardData) return false;

        const { empty } = editor.state.selection;
        if (empty) return false;

        const markdown = serializeSelectionMarkdown(editor);
        event.preventDefault();
        event.clipboardData.setData("text/plain", markdown);
        return true;
      },
    },
    handlePaste: (_view, event) => {
      const editor = getEditor();
      if (!editor || !event.clipboardData) return false;
      if (clipboardHasImage(event)) return false;

      const raw = event.clipboardData.getData("text/plain");
      if (!raw) return false;

      event.preventDefault();

      // Inside ``` / <pre>: keep paste as raw text so it cannot escape the fence.
      if (editor.isActive("codeBlock")) {
        const codeText = normalizePasteLineEndings(raw);
        if (codeText) insertPlainTextInCodeBlock(editor, codeText);
        return true;
      }

      const text = preparePasteText(raw);
      if (!text) return true;

      if (isBlockMarkdown(text)) {
        editor.commands.insertContent(text, { contentType: "markdown" });
      } else {
        editor.commands.insertContent(toInlinePasteContent(text));
      }
      return true;
    },
  };
}
