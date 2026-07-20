import { createContext, useContext, type ReactNode } from "react";

export type MobileDevice = {
  udid: string;
  state: "idle" | "busy";
  jobId?: string;
  model?: string;
};

type MobileDevicesContextValue = {
  devices: MobileDevice[];
  connected: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
};

const MobileDevicesContext = createContext<MobileDevicesContextValue>({
  devices: [],
  connected: false,
  lastUpdatedAt: null,
  error: null,
});

type MobileDevicesProviderProps = {
  enabled?: boolean;
  children: ReactNode;
};

/** Stub provider — SSE device stream not ported yet. */
export function MobileDevicesProvider({ children }: MobileDevicesProviderProps) {
  return (
    <MobileDevicesContext.Provider
      value={{ devices: [], connected: false, lastUpdatedAt: null, error: null }}
    >
      {children}
    </MobileDevicesContext.Provider>
  );
}

export function useMobileDevices(): MobileDevicesContextValue {
  return useContext(MobileDevicesContext);
}
