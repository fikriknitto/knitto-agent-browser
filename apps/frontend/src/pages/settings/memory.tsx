import { AppMemorySettings } from "@/components/settings/app-memory-settings";

export default function SettingsMemoryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">App Memory</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Catatan locator / flow per app (browser &amp; mobile) yang dipakai agent tools.
        </p>
      </div>
      <div className="rounded-xl border border-white/8 bg-[rgba(12,14,22,0.6)] px-4 py-3">
        <AppMemorySettings />
      </div>
    </div>
  );
}
