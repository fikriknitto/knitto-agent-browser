import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BridgeCredentials } from "./components/bridge-credentials";
import { ChatHeader } from "./components/chat-header";
import { ChatMain } from "./components/chat-main";
import { ConnectionPanel } from "./components/connection-panel";
import { SettingsDrawer } from "./components/settings-drawer";
import { type PromptAttachment } from "./lib/prompt-attachment";
import { DEFAULT_CHANNEL, DEFAULT_WS_HOST, DEFAULT_WS_PORT } from "./lib/protocol";
import type { BridgeSummary, ChatLine, ConnectionState } from "./lib/types";
import { AutomationWsClient } from "./lib/ws-client";

const STORAGE_KEY = "knitto-automation-web";

type PersistedState = {
  host?: string;
  port?: string;
  channel?: string;
  useWss?: boolean;
  selectedBridgeId?: string;
  selectedModel?: string;
  strategy?: string;
  cursorKey?: string;
  geminiKey?: string;
  openRouterKey?: string;
  nineRouterBaseUrl?: string;
  nineRouterKey?: string;
};

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : {};
  } catch {
    return {};
  }
}

function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function jobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App() {
  const persisted = useMemo(() => loadState(), []);
  const [host, setHost] = useState(persisted.host ?? DEFAULT_WS_HOST);
  const [port, setPort] = useState(persisted.port ?? DEFAULT_WS_PORT);
  const [channel, setChannel] = useState(persisted.channel ?? DEFAULT_CHANNEL);
  const [useWss, setUseWss] = useState(persisted.useWss ?? false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [selectedBridgeId, setSelectedBridgeId] = useState(persisted.selectedBridgeId ?? "");
  const [selectedModel, setSelectedModel] = useState(persisted.selectedModel ?? "");
  const [strategy, setStrategy] = useState(persisted.strategy ?? "automation_human_strategy");
  const [prompt, setPrompt] = useState("");
  const [promptAttachments, setPromptAttachments] = useState<PromptAttachment[]>([]);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [workerState, setWorkerState] = useState<"idle" | "busy">("idle");
  const [cursorKey, setCursorKey] = useState(persisted.cursorKey ?? "");
  const [geminiKey, setGeminiKey] = useState(persisted.geminiKey ?? "");
  const [openRouterKey, setOpenRouterKey] = useState(persisted.openRouterKey ?? "");
  const [nineRouterBaseUrl, setNineRouterBaseUrl] = useState(
    persisted.nineRouterBaseUrl ?? "http://localhost:20128"
  );
  const [nineRouterKey, setNineRouterKey] = useState(persisted.nineRouterKey ?? "");
  const [credStatus, setCredStatus] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeJobId = useRef<string | null>(null);
  const wsRef = useRef<AutomationWsClient | null>(null);

  useEffect(() => {
    saveState({
      host,
      port,
      channel,
      useWss,
      selectedBridgeId,
      selectedModel,
      strategy,
      cursorKey,
      geminiKey,
      openRouterKey,
      nineRouterBaseUrl,
      nineRouterKey,
    });
  }, [
    host,
    port,
    channel,
    useWss,
    selectedBridgeId,
    selectedModel,
    strategy,
    cursorKey,
    geminiKey,
    openRouterKey,
    nineRouterBaseUrl,
    nineRouterKey,
  ]);

  useEffect(() => {
    if (!selectedBridgeId && bridges.length) {
      setSelectedBridgeId(bridges[0]!.bridgeId);
    }
  }, [bridges, selectedBridgeId]);

  const ensureClient = useCallback(() => {
    if (wsRef.current) return wsRef.current;

    const client = new AutomationWsClient({
      onConnectionState: setConnectionState,
      onBridges: setBridges,
      onBridgeAvailable: setBridgeAvailable,
      onAgentJob: (msg) => {
        if (msg.status === "queued" || msg.status === "running") {
          setWorkerState("busy");
        } else {
          setWorkerState("idle");
          activeJobId.current = null;
        }

        setChatLines((prev) => {
          const idx = prev.findIndex((l) => l.id === msg.id && l.role === "agent");
          const prevLine = idx >= 0 ? prev[idx] : undefined;
          const line: ChatLine = {
            id: msg.id,
            role: "agent",
            text: msg.result ?? msg.message,
            status: msg.status,
            screenshots: msg.screenshots ?? prevLine?.screenshots,
            videoUrl: msg.videoUrl ?? prevLine?.videoUrl,
            toolName: msg.toolName ?? prevLine?.toolName,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = line;
            return next;
          }
          return [...prev, line];
        });
      },
      onCredentialsRequest: () => {
        setCredStatus("Bridge requested API credentials — save keys below.");
      },
      onCredentialsStatus: (payload) => {
        setCredStatus(payload.valid ? "Credentials verified." : payload.message);
      },
    });

    wsRef.current = client;
    return client;
  }, []);

  const handleConnect = useCallback(() => {
    ensureClient().connect(host, port, channel, useWss);
  }, [ensureClient, host, port, channel, useWss]);

  const handleDisconnect = () => {
    wsRef.current?.disconnect();
  };

  const handleRefresh = () => {
    wsRef.current?.refreshStatus();
  };

  const handleSend = () => {
    const text = prompt.trim();
    if ((!text && !promptAttachments.length) || !selectedBridgeId) return;

    const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);

    const id = jobId();
    activeJobId.current = id;

    const attachments = promptAttachments.length ? [...promptAttachments] : undefined;
    setChatLines((prev) => [
      ...prev,
      { id: `u-${id}`, role: "user", text: text.trim(), attachments },
    ]);
    setWorkerState("busy");
    setPrompt("");
    setPromptAttachments([]);

    wsRef.current?.sendUserPrompt({
      id,
      bridgeId: selectedBridgeId,
      text: text || "Gunakan lampiran sesuai instruksi di prompt user.",
      strategy,
      model:
        selectedModel ||
        bridge?.defaultModel ||
        bridge?.models?.[0]?.id ||
        "",
      attachments: promptAttachments.length ? promptAttachments : undefined,
    });
  };

  const handleCancel = () => {
    const id = activeJobId.current;
    if (!id || !selectedBridgeId || workerState !== "busy") return;
    wsRef.current?.cancelJob({ id, bridgeId: selectedBridgeId });
  };

  const selectedBridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
  const browserHeaded = selectedBridge?.browserHeaded;

  const sendCred = async (bridgeKind: "cursor" | "gemini" | "openrouter", apiKey: string) => {
    const bridge = bridges.find((b) => b.bridgeKind === bridgeKind);
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    if (!bridgeId || !apiKey.trim()) return;
    wsRef.current?.sendCredentials({ bridgeId, bridgeKind, apiKey: apiKey.trim() });
    setCredStatus(`Sent ${bridgeKind} credentials…`);
  };

  const sendNineRouterCred = async () => {
    const bridge = bridges.find((b) => b.bridgeKind === "ninerouter");
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    const baseUrl = nineRouterBaseUrl.trim();
    if (!bridgeId || !baseUrl) return;
    wsRef.current?.sendCredentials({
      bridgeId,
      bridgeKind: "ninerouter",
      nineRouter: { baseUrl, apiKey: nineRouterKey.trim() },
    });
    setCredStatus("Sent 9Router credentials…");
  };

  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      <ChatHeader
        bridges={bridges}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        strategy={strategy}
        connectionState={connectionState}
        bridgeAvailable={bridgeAvailable}
        onSelectBridge={setSelectedBridgeId}
        onSelectModel={setSelectedModel}
        onStrategyChange={setStrategy}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <ChatMain
        prompt={prompt}
        promptAttachments={promptAttachments}
        workerState={workerState}
        connectionState={connectionState}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        chatLines={chatLines}
        onPromptChange={setPrompt}
        onPromptAttachmentsChange={setPromptAttachments}
        onSend={handleSend}
        onCancel={handleCancel}
      />

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ConnectionPanel
          embedded
          host={host}
          port={port}
          channel={channel}
          useWss={useWss}
          connectionState={connectionState}
          bridgeAvailable={bridgeAvailable}
          browserHeaded={browserHeaded}
          onHostChange={setHost}
          onPortChange={setPort}
          onChannelChange={setChannel}
          onUseWssChange={setUseWss}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefresh={handleRefresh}
        />
        <BridgeCredentials
          embedded
          bridges={bridges}
          selectedBridgeId={selectedBridgeId}
          geminiKey={geminiKey}
          cursorKey={cursorKey}
          openRouterKey={openRouterKey}
          nineRouterBaseUrl={nineRouterBaseUrl}
          nineRouterKey={nineRouterKey}
          statusMessage={credStatus}
          onSelectBridge={setSelectedBridgeId}
          onGeminiKeyChange={setGeminiKey}
          onCursorKeyChange={setCursorKey}
          onOpenRouterKeyChange={setOpenRouterKey}
          onNineRouterBaseUrlChange={setNineRouterBaseUrl}
          onNineRouterKeyChange={setNineRouterKey}
          onSaveGemini={() => void sendCred("gemini", geminiKey)}
          onSaveCursor={() => void sendCred("cursor", cursorKey)}
          onSaveOpenRouter={() => void sendCred("openrouter", openRouterKey)}
          onSaveNineRouter={() => void sendNineRouterCred()}
        />
      </SettingsDrawer>
    </div>
  );
}
export default App;
