import { usePromptShortcuts } from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import { fillPromptTemplate, type PromptShortcut } from "@/lib/prompt-shortcuts";
import { cn } from "@/lib/cn";
import type { AppliedPromptShortcut } from "@/lib/utils/prompt-compose";
import type { BridgeSummary, ConnectionState } from "@/lib/types";
import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import { Eye, Search, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentAndModel } from "./agent-and-model";
import { PlatformSelector } from "./platform-selector";
import { PromptShortcutPreviewModal } from "./prompt-shortcut-preview-modal";
import { Button } from "@/components/chat/ui";

type AutomationConfigPanelProps = {
  bridges: BridgeSummary[];
  connectionState: ConnectionState;
  selectedBridgeId: string;
  selectedModel: string;
  platform: AutomationPlatform;
  mobileConfig: MobileConfig;
  promptBases: AppliedPromptShortcut[];
  disabled?: boolean;
  /** When true, render only the inner scroll body (drawer wraps chrome). */
  embedded?: boolean;
  /** Body + preview only — parent supplies aside / tab chrome. */
  pane?: boolean;
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
  onPlatformChange: (platform: AutomationPlatform) => void;
  onMobileConfigChange: (config: MobileConfig) => void;
  onAddPromptBase: (shortcut: PromptShortcut, filledText: string) => void;
  onRemovePromptBase: (id: string) => void;
  onApplyMainPrompt: (filledText: string) => void;
  onClose?: () => void;
};

type PlatformGroup = {
  key: string;
  label: string;
  items: PromptShortcut[];
};

function groupShortcuts(shortcuts: PromptShortcut[]): PlatformGroup[] {
  const browser: PromptShortcut[] = [];
  const mobile: PromptShortcut[] = [];
  for (const s of shortcuts) {
    if (s.platform === "mobile") mobile.push(s);
    else browser.push(s);
  }
  const byLabel = (a: PromptShortcut, b: PromptShortcut) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  browser.sort(byLabel);
  mobile.sort(byLabel);
  const groups: PlatformGroup[] = [];
  if (browser.length) groups.push({ key: "browser", label: "Browser", items: browser });
  if (mobile.length) groups.push({ key: "mobile", label: "Mobile", items: mobile });
  return groups;
}

export function AutomationConfigPanel({
  bridges,
  connectionState,
  selectedBridgeId,
  selectedModel,
  platform,
  mobileConfig,
  promptBases,
  disabled,
  embedded = false,
  pane = false,
  onSelectBridge,
  onSelectModel,
  onPlatformChange,
  onMobileConfigChange,
  onAddPromptBase,
  onRemovePromptBase,
  onApplyMainPrompt,
  onClose,
}: AutomationConfigPanelProps) {
  const { data: shortcuts = [], isError, error } = usePromptShortcuts();
  const [search, setSearch] = useState("");
  const [previewShortcut, setPreviewShortcut] = useState<PromptShortcut | null>(null);

  const selectedIds = useMemo(() => new Set(promptBases.map((b) => b.id)), [promptBases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shortcuts;
    return shortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.platform.toLowerCase().includes(q)
    );
  }, [shortcuts, search]);

  const groups = useMemo(() => groupShortcuts(filtered), [filtered]);

  const loadError = isError
    ? error instanceof Error
      ? error.message
      : "Gagal memuat prompt shortcuts"
    : "";

  const toggleShortcut = (shortcut: PromptShortcut, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      const filledText = fillPromptTemplate(shortcut.template, shortcut.defaults);
      onAddPromptBase(shortcut, filledText);
    } else {
      onRemovePromptBase(shortcut.id);
    }
  };

  const body = (
    <div className="automation-config-scroll space-y-5">
      <section className="space-y-2">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
          Configurations
        </h2>
        <AgentAndModel
          layout="stack"
          bridges={bridges}
          connectionState={connectionState}
          selectedBridgeId={selectedBridgeId}
          selectedModel={selectedModel}
          disabled={disabled}
          onSelectBridge={onSelectBridge}
          onSelectModel={onSelectModel}
        />
        <PlatformSelector
          variant="panel"
          platform={platform}
          mobileConfig={mobileConfig}
          disabled={disabled}
          onPlatformChange={onPlatformChange}
          onMobileConfigChange={onMobileConfigChange}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-black-40 dark:text-slate-500">
            Templates
          </h2>
          {promptBases.length > 0 && (
            <span className="text-[10px] text-black-40 dark:text-slate-500">
              {promptBases.length} dipilih
            </span>
          )}
        </div>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-black-40 dark:text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            disabled={disabled}
            placeholder="Cari template…"
            className="h-9 w-full rounded-lg border border-black/10 bg-black/5 py-1.5 pl-8 pr-2.5 text-sm text-black-100 outline-none placeholder:text-black-40 focus:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white/20"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {loadError && <p className="m-0 text-xs text-red-600 dark:text-red-400">{loadError}</p>}

        {shortcuts.length === 0 && !loadError ? (
          <p className="m-0 text-xs text-black-40 dark:text-slate-500">Belum ada prompt shortcut.</p>
        ) : groups.length === 0 ? (
          <p className="m-0 text-xs text-black-40 dark:text-slate-500">Tidak ada hasil pencarian.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-[11px] font-medium text-black-60 dark:text-slate-400">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-black-40 dark:text-slate-500">
                    {group.items.length}
                  </span>
                </div>
                <ul className="m-0 list-none space-y-0.5 p-0">
                  {group.items.map((shortcut) => {
                    const checked = selectedIds.has(shortcut.id);
                    return (
                      <li key={shortcut.id}>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition",
                            checked
                              ? "border-black/15 bg-black/5 dark:border-white/15 dark:bg-white/8"
                              : "border-transparent hover:bg-black/4 dark:hover:bg-white/5"
                          )}
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-3.5 shrink-0 rounded border-black/20 text-[#0f163F] focus:ring-0 dark:border-white/20"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => toggleShortcut(shortcut, e.target.checked)}
                            />
                            <span className="min-w-0 truncate text-sm text-black-100 dark:text-slate-100">
                              {shortcut.icon ? `${shortcut.icon} ` : ""}
                              {shortcut.label}
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 text-black-40 dark:text-slate-500"
                            aria-label={`Preview ${shortcut.label}`}
                            title="Preview"
                            disabled={disabled}
                            onClick={() => setPreviewShortcut(shortcut)}
                          >
                            <Eye className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const preview = (
    <PromptShortcutPreviewModal
      open={previewShortcut !== null}
      shortcut={previewShortcut}
      onClose={() => setPreviewShortcut(null)}
      onApply={(shortcut) => {
        const filled = fillPromptTemplate(shortcut.template, shortcut.defaults);
        onApplyMainPrompt(filled);
      }}
    />
  );

  if (pane) {
    return (
      <>
        {body}
        {preview}
      </>
    );
  }

  if (embedded) {
    return (
      <>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-3 py-2.5 dark:border-white/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-black-100 dark:text-slate-100">
            <Settings2 className="size-4" aria-hidden />
            Config
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Tutup config"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>
        {body}
        {preview}
      </>
    );
  }

  return (
    <aside className="automation-config-panel hidden md:flex" aria-label="Automation configurations">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/10 px-3 py-2.5 dark:border-white/10">
        <Settings2 className="size-4 text-black-60 dark:text-slate-400" aria-hidden />
        <span className="text-sm font-semibold text-black-100 dark:text-slate-100">Configurations</span>
      </div>
      {body}
      {preview}
    </aside>
  );
}
