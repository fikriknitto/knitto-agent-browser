import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AutomationPlatform } from "@knitto/shared";
import type { BridgeSummary, ConnectionState } from "@/types/automation";
import { env } from "@/lib/variables/env";

const STORAGE_KEY = "knitto-automation-web";

export type OpenaiProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  /** API Data credential id once persisted server-side (undefined = not saved yet). */
  remoteId?: number;
};

export type CredStatus = {
  message: string;
  valid?: boolean;
};

type LegacyPersisted = {
  openaiBaseUrl?: string;
  openaiKey?: string;
};

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
  openaiProviders: OpenaiProvider[];
};

export function createOpenaiProviderId(): string {
  return `openai-${crypto.randomUUID()}`;
}

export function createOpenaiProvider(
  partial: Partial<Pick<OpenaiProvider, "name" | "baseUrl" | "apiKey">> = {}
): OpenaiProvider {
  return {
    id: createOpenaiProviderId(),
    name: partial.name?.trim() || "OpenAI-compatible",
    baseUrl: partial.baseUrl?.trim() || "",
    apiKey: partial.apiKey?.trim() || "",
  };
}

export function migrateOpenaiProviders(
  saved: Partial<ConnectionPersisted & LegacyPersisted>
): OpenaiProvider[] {
  if (Array.isArray(saved.openaiProviders) && saved.openaiProviders.length > 0) {
    return saved.openaiProviders.map((p) => ({
      id: p.id,
      name: p.name?.trim() || "OpenAI-compatible",
      baseUrl: p.baseUrl?.trim() || "",
      apiKey: p.apiKey?.trim() || "",
      remoteId: p.remoteId,
    }));
  }
  const legacyUrl = saved.openaiBaseUrl?.trim();
  if (legacyUrl) {
    return [
      {
        id: createOpenaiProviderId(),
        name: "OpenAI-compatible",
        baseUrl: legacyUrl,
        apiKey: saved.openaiKey?.trim() || "",
      },
    ];
  }
  return [];
}

function loadPersisted(): Partial<ConnectionPersisted> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ConnectionPersisted & LegacyPersisted>;
    return {
      ...parsed,
      openaiProviders: migrateOpenaiProviders(parsed),
    };
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
    openaiProviders: state.openaiProviders,
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
  openaiProviders: OpenaiProvider[];
  credStatusByBridgeId: Record<string, CredStatus>;
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
  openaiProviders: saved.openaiProviders ?? [],
  credStatusByBridgeId: {},
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
    addOpenaiProvider(state, action: PayloadAction<OpenaiProvider | undefined>) {
      state.openaiProviders.push(action.payload ?? createOpenaiProvider());
      persist(state);
    },
    updateOpenaiProvider(
      state,
      action: PayloadAction<{ id: string; patch: Partial<Omit<OpenaiProvider, "id">> }>
    ) {
      const provider = state.openaiProviders.find((p) => p.id === action.payload.id);
      if (!provider) return;
      const { patch } = action.payload;
      if (patch.name !== undefined) provider.name = patch.name;
      if (patch.baseUrl !== undefined) provider.baseUrl = patch.baseUrl;
      if (patch.apiKey !== undefined) provider.apiKey = patch.apiKey;
      persist(state);
    },
    setOpenaiProviderRemoteId(
      state,
      action: PayloadAction<{ id: string; remoteId: number }>
    ) {
      const provider = state.openaiProviders.find((p) => p.id === action.payload.id);
      if (!provider) return;
      provider.remoteId = action.payload.remoteId;
      persist(state);
    },
    removeOpenaiProvider(state, action: PayloadAction<string>) {
      state.openaiProviders = state.openaiProviders.filter((p) => p.id !== action.payload);
      delete state.credStatusByBridgeId[action.payload];
      if (state.selectedBridgeId === action.payload) {
        const cursor = state.bridges.find((b) => b.bridgeKind === "cursor");
        const nextOpenai = state.openaiProviders[0];
        state.selectedBridgeId = cursor?.bridgeId ?? nextOpenai?.id ?? "";
        persist(state);
      } else {
        persist(state);
      }
    },
    setCredStatus(
      state,
      action: PayloadAction<{
        bridgeId: string;
        message: string;
        valid?: boolean;
      }>
    ) {
      const { bridgeId, message, valid } = action.payload;
      state.credStatusByBridgeId[bridgeId] = { message, valid };
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
  addOpenaiProvider,
  updateOpenaiProvider,
  setOpenaiProviderRemoteId,
  removeOpenaiProvider,
  setCredStatus,
} = connectionSlice.actions;

export default connectionSlice.reducer;
