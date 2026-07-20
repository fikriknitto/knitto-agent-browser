import { apiUrl } from "../api/config";
import { request } from "../http/client";

export type MobileDevice = {
  udid: string;
  state: "idle" | "busy";
  jobId?: string;
  model?: string;
};

export type MobileDevicesStreamPayload = {
  devices: MobileDevice[];
  at: string;
  error: string | null;
};

export type MobilePackage = {
  package: string;
};

export function getMobileDevicesStreamUrl(): string {
  return apiUrl("/api/mobile/devices/stream");
}

export async function listMobileDevices(): Promise<MobileDevicesStreamPayload> {
  return request<MobileDevicesStreamPayload>("/api/mobile/devices");
}

export async function listMobilePackages(
  udid: string,
  query?: string
): Promise<MobilePackage[]> {
  const params = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const data = await request<{ packages: MobilePackage[] }>(
    `/api/mobile/devices/${encodeURIComponent(udid)}/packages${params}`
  );
  return data.packages;
}

export async function resolveMobilePackageActivity(
  udid: string,
  pkg: string
): Promise<{ package: string; activity: string }> {
  return request<{ package: string; activity: string }>(
    `/api/mobile/devices/${encodeURIComponent(udid)}/packages/${encodeURIComponent(pkg)}/activity`
  );
}
