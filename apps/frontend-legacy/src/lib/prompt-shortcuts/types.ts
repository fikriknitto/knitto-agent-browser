export type PromptShortcutVariant = "blue" | "green" | "amber" | "neutral";

export type PromptShortcutPlatform = "browser" | "mobile";

export type PromptShortcut = {
  id: string;
  label: string;
  icon: string;
  variant: PromptShortcutVariant;
  platform: PromptShortcutPlatform;
  appPackage?: string;
  url?: string;
  deepLink?: string;
  template: string;
  defaults: Record<string, string>;
};

export type PromptShortcutWriteInput = {
  label: string;
  variant: PromptShortcutVariant;
  platform: PromptShortcutPlatform;
  appPackage?: string;
  url?: string;
  deepLink?: string;
  template: string;
  defaults: Record<string, string>;
};

export type GeneratePromptShortcutInput = {
  bridgeId: string;
  model: string;
  brief: string;
  label?: string;
};

export type GeneratePromptShortcutResult = {
  template: string;
  defaults?: Record<string, string>;
  label?: string;
};
