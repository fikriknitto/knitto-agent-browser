import { useMobileDevices } from "@/contexts/mobile-devices-context";
import { useMobilePackages } from "@/hooks/mobile/use-mobile-packages";
import { cn } from "@/lib/cn";
import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "./ui/combobox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const AUTO_UDID = "";

type ComboboxOption = { value: string; label: string };

type PlatformSelectorProps = {
  platform: AutomationPlatform;
  mobileConfig: MobileConfig;
  disabled?: boolean;
  /** `panel` = stacked for config sidebar; `composer` = compact strip. */
  variant?: "composer" | "panel";
  onPlatformChange: (platform: AutomationPlatform) => void;
  onMobileConfigChange: (config: MobileConfig) => void;
};

export function toMobileConfigPayload(config: MobileConfig): MobileConfig | undefined {
  if (!config.appPackage?.trim()) return undefined;
  const payload: MobileConfig = { appPackage: config.appPackage.trim() };
  if (config.udid?.trim()) payload.udid = config.udid.trim();
  if (config.deepLink?.trim()) payload.deepLink = config.deepLink.trim();
  return payload;
}

const searchInPopupClass =
  "mb-0! mt-1! ml-1! mr-1! h-8! w-[calc(100%-0.5rem)]! max-w-none! rounded-md! border border-black/10 bg-black/5 text-sm text-black-100 shadow-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100 [&_input]:h-8 [&_input]:px-2.5 [&_input]:text-sm";

type StackSelectProps = {
  ariaLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  items: ComboboxOption[];
  value: ComboboxOption | null;
  disabled?: boolean;
  emptyText: string;
  isPanel: boolean;
  onValueChange: (item: ComboboxOption | null) => void;
};

/** Same pattern as Model dropdown: one bordered trigger + search inside popup. */
function StackSelect({
  ariaLabel,
  placeholder,
  searchPlaceholder,
  items,
  value,
  disabled,
  emptyText,
  isPanel,
  onValueChange,
}: StackSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const triggerClass = isPanel
    ? "inline-flex h-9! w-full min-w-0 items-center gap-1 rounded-lg! border border-black/10 bg-black/5 px-2.5 text-sm text-black-100 shadow-none outline-none transition hover:bg-black/8 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-black-40 dark:[&_svg]:text-slate-500"
    : "inline-flex h-8! w-full min-w-0 items-center gap-1 rounded-lg! border border-black/10 bg-black/5 px-2.5 text-xs text-black-100 shadow-none outline-none transition hover:bg-black/8 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-black-40 dark:[&_svg]:text-slate-500";

  return (
    <Combobox
      items={items}
      value={value}
      disabled={disabled}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      onValueChange={(item) => onValueChange(item ?? null)}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setSearchQuery("");
      }}
      inputValue={searchQuery}
      onInputValueChange={setSearchQuery}
    >
      <ComboboxTrigger aria-label={ariaLabel} disabled={disabled} className={triggerClass}>
        <span className="min-w-0 flex-1 truncate text-left">
          <ComboboxValue placeholder={placeholder} />
        </span>
      </ComboboxTrigger>
      <ComboboxContent className="min-w-[18rem] max-w-[min(90vw,24rem)]">
        <ComboboxInput
          aria-label={`Cari ${ariaLabel.toLowerCase()}`}
          placeholder={searchPlaceholder}
          disabled={disabled}
          showTrigger={false}
          showClear={false}
          className={searchInPopupClass}
        />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.value || "auto"} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function PlatformSelector({
  platform,
  mobileConfig,
  disabled,
  variant = "composer",
  onPlatformChange,
  onMobileConfigChange,
}: PlatformSelectorProps) {
  const isMobile = platform === "mobile";
  const isHybrid = platform === "hybrid";
  const showMobileFields = isMobile;
  const isPanel = variant === "panel";
  const { devices, connected, error: streamError } = useMobileDevices();
  const packageUdid = mobileConfig.udid?.trim() || devices.find((d) => d.state === "idle")?.udid;
  const { data: packages = [], isLoading: packagesLoading } = useMobilePackages(packageUdid);
  const [browserLockJobId, setBrowserLockJobId] = useState<string | null>(null);

  useEffect(() => {
    if (platform !== "browser") {
      setBrowserLockJobId(null);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) return;
        const json = (await res.json()) as {
          browserLock?: { busy?: boolean; jobId?: string | null };
        };
        if (cancelled) return;
        setBrowserLockJobId(
          json.browserLock?.busy && json.browserLock.jobId ? json.browserLock.jobId : null
        );
      } catch {
        // ignore
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [platform]);

  const deviceItems = useMemo<ComboboxOption[]>(() => {
    const items: ComboboxOption[] = [{ value: AUTO_UDID, label: "Auto (pool)" }];
    for (const device of devices) {
      const status = device.state === "busy" ? "busy" : "idle";
      const jobHint =
        device.state === "busy" && device.jobId
          ? ` job=${device.jobId.length > 18 ? `${device.jobId.slice(0, 18)}…` : device.jobId}`
          : "";
      const label = device.model
        ? `${device.udid} — ${device.model} (${status}${jobHint})`
        : `${device.udid} (${status}${jobHint})`;
      items.push({ value: device.udid, label });
    }
    return items;
  }, [devices]);

  const packageItems = useMemo<ComboboxOption[]>(
    () => packages.map((p) => ({ value: p.package, label: p.package })),
    [packages]
  );

  const selectedDevice =
    deviceItems.find((item) => item.value === (mobileConfig.udid ?? AUTO_UDID)) ??
    deviceItems[0] ??
    null;

  const selectedPackage =
    packageItems.find((item) => item.value === mobileConfig.appPackage) ?? null;

  const noDevices = devices.length === 0;
  const deviceDisabled = disabled || noDevices;

  return (
    <div
      className={cn(
        "space-y-2",
        !isPanel && "border-b border-black/10 pb-2 dark:border-white/8"
      )}
    >
      <div className={cn(isPanel ? "space-y-1.5" : "flex flex-wrap items-center gap-2")}>
        <span className="text-xs font-medium text-black-40 dark:text-slate-500">Platform</span>
        <div
          className={cn(
            "inline-flex rounded-full border border-black/10 bg-black/5 p-0.5 dark:border-white/10 dark:bg-white/5",
            isPanel && "w-full"
          )}
        >
          {(["browser", "mobile", "hybrid"] as const).map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              className={cn(
                "rounded-full px-3 py-1 text-xs capitalize transition-colors",
                isPanel && "flex-1",
                platform === value
                  ? "bg-black/10 text-black-100 dark:bg-white/15 dark:text-slate-100"
                  : "text-black-40 hover:text-black-100 dark:text-slate-500 dark:hover:text-slate-300"
              )}
              onClick={() => {
                onPlatformChange(value);
                if (value === "hybrid") {
                  onMobileConfigChange({
                    appPackage: "",
                    udid: undefined,
                    deepLink: undefined,
                  });
                }
              }}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(showMobileFields || isHybrid) && connected && (
            <Badge variant="info" className="text-[10px]">
              {connected ? "SSE live" : "SSE offline"}
            </Badge>
          )}
          {platform === "browser" && browserLockJobId && (
            <Badge variant="warning" className="text-[10px] normal-case">
              Browser locked (
              {browserLockJobId.length > 14
                ? `${browserLockJobId.slice(0, 14)}…`
                : browserLockJobId}
              )
            </Badge>
          )}
        </div>
      </div>

      {isHybrid && (
        <div className="space-y-1">
          <p className="text-xs text-black-40 dark:text-slate-500">
            Device: Auto (pool) · Package: dari{" "}
            <span className="font-mono text-black-60 dark:text-slate-400">App:</span> / shortcut di TC
            mobile
          </p>
          {devices.length === 0 && connected && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Tidak ada device Android — hubungkan emulator atau device USB untuk TC mobile.
            </p>
          )}
          {streamError && <p className="text-xs text-amber-700 dark:text-amber-400">{streamError}</p>}
        </div>
      )}

      {showMobileFields && (
        <div className={cn("grid gap-2", isPanel ? "grid-cols-1" : "sm:grid-cols-2")}>
          <div className="space-y-1">
            <Label className="text-xs text-black-40 dark:text-slate-500">Device</Label>
            <StackSelect
              ariaLabel="Device"
              placeholder={noDevices ? "Tidak ada device" : "Auto (pool)"}
              searchPlaceholder="Cari device…"
              items={deviceItems}
              value={selectedDevice}
              disabled={deviceDisabled}
              emptyText="Tidak ada device"
              isPanel={isPanel}
              onValueChange={(item) => {
                onMobileConfigChange({
                  ...mobileConfig,
                  udid: item?.value ? item.value : undefined,
                });
              }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-black-40 dark:text-slate-500">Package (wajib)</Label>
            <StackSelect
              ariaLabel="Package"
              placeholder={packagesLoading ? "Memuat…" : "com.example.app"}
              searchPlaceholder="Cari package…"
              items={packageItems}
              value={selectedPackage}
              disabled={disabled || !packageUdid}
              emptyText={!packageUdid ? "Pilih device dulu" : "Package tidak ditemukan"}
              isPanel={isPanel}
              onValueChange={(item) => {
                if (!item?.value) return;
                onMobileConfigChange({ ...mobileConfig, appPackage: item.value });
              }}
            />
          </div>

          <div className={cn("space-y-1", !isPanel && "sm:col-span-2")}>
            <Label className="text-xs text-black-40 dark:text-slate-500">Deep link (opsional)</Label>
            <Input
              value={mobileConfig.deepLink ?? ""}
              disabled={disabled}
              placeholder="myapp://path"
              className={cn(
                "text-xs",
                isPanel
                  ? "h-9 border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/8"
                  : "h-8 border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              )}
              onChange={(e) =>
                onMobileConfigChange({
                  ...mobileConfig,
                  deepLink: e.target.value || undefined,
                })
              }
            />
          </div>

          {streamError && (
            <p className={cn("text-xs text-amber-700 dark:text-amber-400", !isPanel && "sm:col-span-2")}>
              {streamError}
            </p>
          )}
          {devices.length === 0 && connected && (
            <p className={cn("text-xs text-amber-700 dark:text-amber-400", !isPanel && "sm:col-span-2")}>
              Tidak ada device Android — hubungkan emulator atau device USB.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
