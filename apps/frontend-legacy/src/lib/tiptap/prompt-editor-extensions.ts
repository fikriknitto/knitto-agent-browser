import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function createPromptEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      blockquote: {},
      horizontalRule: {},
    }),
    Placeholder.configure({ placeholder }),
    Markdown,
  ];
}
