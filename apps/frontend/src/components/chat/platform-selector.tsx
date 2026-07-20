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
} from "./ui/combobox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const AUTO_UDID = "";

type ComboboxOption = { value: string; label: string };

type PlatformSelectorProps = {
  platform: AutomationPlatform;
  mobileConfig: MobileConfig;
  disabled?: boolean;
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

export function PlatformSelector({
  platform,
  mobileConfig,
  disabled,
  onPlatformChange,
  onMobileConfigChange,
}: PlatformSelectorProps) {
  const isMobile = platform === "mobile";
  const isHybrid = platform === "hybrid";
  const showMobileFields = isMobile;
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
    deviceItems.find((item) => item.value === (mobileConfig.udid ?? AUTO_UDID)) ?? deviceItems[0] ?? null;

  const selectedPackage =
    packageItems.find((item) => item.value === mobileConfig.appPackage) ?? null;

  const noDevices = devices.length === 0;
  const deviceDisabled = disabled || noDevices;

  return (
    <div className="space-y-2 border-b border-white/8 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Platform</span>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
          {(["browser", "mobile", "hybrid"] as const).map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              className={cn(
                "rounded-full px-3 py-1 text-xs capitalize transition-colors",
                platform === value
                  ? "bg-white/15 text-slate-100"
                  : "text-slate-500 hover:text-slate-300"
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

      {isHybrid && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Device: Auto (pool) · Package: dari{" "}
            <span className="font-mono text-slate-400">App:</span> / shortcut di TC mobile
          </p>
          {devices.length === 0 && connected && (
            <p className="text-xs text-amber-400">
              Tidak ada device Android — hubungkan emulator atau device USB untuk TC mobile.
            </p>
          )}
          {streamError && <p className="text-xs text-amber-400">{streamError}</p>}
        </div>
      )}

      {showMobileFields && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Device</Label>
            <Combobox
              items={deviceItems}
              value={selectedDevice}
              disabled={deviceDisabled}
              isItemEqualToValue={(a, b) => a.value === b.value}
              onValueChange={(item) => {
                onMobileConfigChange({
                  ...mobileConfig,
                  udid: item?.value ? item.value : undefined,
                });
              }}
            >
              <ComboboxInput
                aria-label="Pilih device"
                placeholder={noDevices ? "Tidak ada device" : "Auto (pool)"}
                disabled={deviceDisabled}
                showClear={false}
                className="h-8 rounded-lg border-white/10 bg-white/5 text-xs"
              />
              <ComboboxContent>
                <ComboboxEmpty>Tidak ada device</ComboboxEmpty>
                <ComboboxList>
                  {(item: ComboboxOption) => (
                    <ComboboxItem key={item.value || "auto"} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Package (wajib)</Label>
            <Combobox
              items={packageItems}
              value={selectedPackage}
              disabled={disabled || !packageUdid}
              isItemEqualToValue={(a, b) => a.value === b.value}
              onValueChange={(item) => {
                if (!item?.value) return;
                onMobileConfigChange({ ...mobileConfig, appPackage: item.value });
              }}
            >
              <ComboboxInput
                aria-label="Pilih package"
                placeholder={packagesLoading ? "Memuat…" : "com.example.app"}
                disabled={disabled || !packageUdid}
                showClear={false}
                className="h-8 rounded-lg border-white/10 bg-white/5 text-xs"
              />
              <ComboboxContent>
                <ComboboxEmpty>
                  {!packageUdid ? "Pilih device dulu" : "Package tidak ditemukan"}
                </ComboboxEmpty>
                <ComboboxList>
                  {(item: ComboboxOption) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-slate-500">Deep link (opsional)</Label>
            <Input
              value={mobileConfig.deepLink ?? ""}
              disabled={disabled}
              placeholder="myapp://path"
              className="h-8 border-white/10 bg-white/5 text-xs"
              onChange={(e) =>
                onMobileConfigChange({
                  ...mobileConfig,
                  deepLink: e.target.value || undefined,
                })
              }
            />
          </div>

          {streamError && (
            <p className="sm:col-span-2 text-xs text-amber-400">{streamError}</p>
          )}
          {devices.length === 0 && connected && (
            <p className="sm:col-span-2 text-xs text-amber-400">
              Tidak ada device Android — hubungkan emulator atau device USB.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
