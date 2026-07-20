export type {
  GeneratePromptShortcutInput,
  GeneratePromptShortcutResult,
  PromptShortcut,
  PromptShortcutPlatform,
  PromptShortcutVariant,
  PromptShortcutWriteInput,
} from "./prompt-shortcuts/types";

export { fillPromptTemplate, extractTemplatePlaceholders } from "./prompt-shortcuts/template";

export {
  createPromptShortcut,
  deletePromptShortcut,
  generatePromptShortcutTemplate,
  getPromptShortcut,
  listPromptShortcuts,
  updatePromptShortcut,
} from "./api/prompt-shortcuts-api";

/** @deprecated use listPromptShortcuts via usePromptShortcuts hook */
export { listPromptShortcuts as fetchPromptShortcuts } from "./api/prompt-shortcuts-api";

/** @deprecated use listPromptShortcuts */
export { listPromptShortcuts as loadPromptShortcuts } from "./api/prompt-shortcuts-api";

export type { AgentJobMessage } from "@knitto/shared";
