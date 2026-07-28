import { PromptShortcutsSettings } from "@/components/settings/prompt-shortcuts-settings";

export default function SettingsShortcutsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">Prompt Shortcuts</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Template prompt reusable untuk composer automation.
        </p>
      </div>
      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
        <PromptShortcutsSettings />
      </div>
    </div>
  );
}
