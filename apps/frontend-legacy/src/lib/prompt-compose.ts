import type { PromptShortcutVariant } from "./prompt-shortcuts";
import { mergePromptParts, toPromptShortcutRelativePath } from "@knitto/shared";

export type { PromptShortcutVariant };
export { mergePromptParts, toPromptShortcutRelativePath };

export function promptShortcutPath(id: string): string {
  return toPromptShortcutRelativePath(id);
}

export type AppliedPromptShortcut = {
  id: string;
  label: string;
  icon: string;
  variant: PromptShortcutVariant;
  filledText: string;
};

/** Snapshot for chat history (no filledText — path reference only). */
export type ChatPromptBase = Omit<AppliedPromptShortcut, "filledText"> & {
  path: string;
};
