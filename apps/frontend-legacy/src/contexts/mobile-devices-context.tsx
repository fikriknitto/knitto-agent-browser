import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getMobileDevicesStreamUrl,
  type MobileDevice,
  type MobileDevicesStreamPayload,
} from "@/lib/api/mobile-device-api";

type MobileDevicesContextValue = {
  devices: MobileDevice[];
  connected: boolean;
  lastUpdatedAt: string | null;
  error: string | null;
};

const MobileDevicesContext = createContext<MobileDevicesContextValue | null>(null);

type MobileDevicesProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function MobileDevicesProvider({ enabled, children }: MobileDevicesProviderProps) {
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
      setDevices([]);
      setLastUpdatedAt(null);
      setError(null);
      return;
    }

    const source = new EventSource(getMobileDevicesStreamUrl());
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
      setError(null);
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as MobileDevicesStreamPayload;
        setDevices(payload.devices);
        setLastUpdatedAt(payload.at);
        setError(payload.error);
      } catch {
        // ignore malformed payloads
      }
    };

    source.onerror = () => {
      setConnected(false);
      setError("SSE connection error");
      source.close();
      sourceRef.current = null;
    };

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return (
    <MobileDevicesContext.Provider value={{ devices, connected, lastUpdatedAt, error }}>
      {children}
    </MobileDevicesContext.Provider>
  );
}

export function useMobileDevices(): MobileDevicesContextValue {
  const value = useContext(MobileDevicesContext);
  if (!value) {
    throw new Error("useMobileDevices must be used within MobileDevicesProvider");
  }
  return value;
}
