import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AutomationPlatform } from "@knitto/shared";
import type { BridgeSummary, ConnectionState } from "@/types/automation";
import { env } from "@/lib/variables/env";

const STORAGE_KEY = "knitto-automation-web";

export type ConnectionPersisted = {
  host: string;
  port: string;
  channel: string;
  useWss: boolean;
  wantConnected: boolean;
  selectedBridgeId: string;
  selectedModel: string;
  platform: AutomationPlatform;
  cursorKey: string;
  openaiBaseUrl: string;
  openaiKey: string;
};

function loadPersisted(): Partial<ConnectionPersisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<ConnectionPersisted>;
  } catch {
    return {};
  }
}

function persist(state: ConnectionStateSlice) {
  const payload: ConnectionPersisted = {
    host: state.host,
    port: state.port,
    channel: state.channel,
    useWss: state.useWss,
    wantConnected: state.wantConnected,
    selectedBridgeId: state.selectedBridgeId,
    selectedModel: state.selectedModel,
    platform: state.platform,
    cursorKey: state.cursorKey,
    openaiBaseUrl: state.openaiBaseUrl,
    openaiKey: state.openaiKey,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

const saved = loadPersisted();

type ConnectionStateSlice = {
  host: string;
  port: string;
  channel: string;
  useWss: boolean;
  wantConnected: boolean;
  connectionState: ConnectionState;
  bridgeAvailable: boolean;
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  selectedModel: string;
  platform: AutomationPlatform;
  cursorKey: string;
  openaiBaseUrl: string;
  openaiKey: string;
};

const initialState: ConnectionStateSlice = {
  host: saved.host ?? env.VITE_WS_HOST,
  port: saved.port ?? env.VITE_WS_PORT,
  channel: saved.channel ?? env.VITE_DEFAULT_CHANNEL,
  useWss: saved.useWss ?? false,
  wantConnected: saved.wantConnected ?? false,
  connectionState: "disconnected",
  bridgeAvailable: false,
  bridges: [],
  selectedBridgeId: saved.selectedBridgeId ?? "",
  selectedModel: saved.selectedModel ?? "",
  platform: saved.platform ?? "browser",
  cursorKey: saved.cursorKey ?? "",
  openaiBaseUrl: saved.openaiBaseUrl ?? "",
  openaiKey: saved.openaiKey ?? "",
};

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setHost(state, action: PayloadAction<string>) {
      state.host = action.payload;
      persist(state);
    },
    setPort(state, action: PayloadAction<string>) {
      state.port = action.payload;
      persist(state);
    },
    setChannel(state, action: PayloadAction<string>) {
      state.channel = action.payload;
      persist(state);
    },
    setUseWss(state, action: PayloadAction<boolean>) {
      state.useWss = action.payload;
      persist(state);
    },
    setWantConnected(state, action: PayloadAction<boolean>) {
      state.wantConnected = action.payload;
      persist(state);
    },
    setConnectionState(state, action: PayloadAction<ConnectionState>) {
      state.connectionState = action.payload;
    },
    setBridgeAvailable(state, action: PayloadAction<boolean>) {
      state.bridgeAvailable = action.payload;
    },
    setBridges(state, action: PayloadAction<BridgeSummary[]>) {
      state.bridges = action.payload;
      const product = action.payload.filter(
        (b) => b.bridgeKind === "cursor" || b.bridgeKind === "openai"
      );
      if (product.length && !product.some((b) => b.bridgeId === state.selectedBridgeId)) {
        state.selectedBridgeId = product[0]!.bridgeId;
        persist(state);
      }
    },
    setSelectedBridgeId(state, action: PayloadAction<string>) {
      state.selectedBridgeId = action.payload;
      persist(state);
    },
    setSelectedModel(state, action: PayloadAction<string>) {
      state.selectedModel = action.payload;
      persist(state);
    },
    setPlatform(state, action: PayloadAction<AutomationPlatform>) {
      state.platform = action.payload;
      persist(state);
    },
    setCursorKey(state, action: PayloadAction<string>) {
      state.cursorKey = action.payload;
      persist(state);
    },
    setOpenaiBaseUrl(state, action: PayloadAction<string>) {
      state.openaiBaseUrl = action.payload;
      persist(state);
    },
    setOpenaiKey(state, action: PayloadAction<string>) {
      state.openaiKey = action.payload;
      persist(state);
    },
  },
});

export const {
  setHost,
  setPort,
  setChannel,
  setUseWss,
  setWantConnected,
  setConnectionState,
  setBridgeAvailable,
  setBridges,
  setSelectedBridgeId,
  setSelectedModel,
  setPlatform,
  setCursorKey,
  setOpenaiBaseUrl,
  setOpenaiKey,
} = connectionSlice.actions;

export default connectionSlice.reducer;
