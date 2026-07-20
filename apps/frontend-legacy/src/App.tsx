import { usePromptShortcuts } from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMemorySettings } from "./components/app-memory-settings";
import { ApiDataLoginScreen } from "./components/api-data-login-screen";
import { AgentCredentials, type AgentCredKind, type AgentCredStatusMap } from "./components/agent-credentials";
import { ChatHeader } from "./components/chat-header";
import { ChatMain } from "./components/chat-main";
import { ConnectionPanel } from "./components/connection-panel";
import { toMobileConfigPayload } from "./components/platform-selector";
import { PromptShortcutsSettings } from "./components/prompt-shortcuts-settings";
import { RunHistoryModal } from "./components/run-history-modal";
import { SettingsModal } from "./components/settings-modal";
import { MobileDevicesProvider } from "./contexts/mobile-devices-context";
import { isActiveJobStatus, syncActiveJobIds } from "./lib/active-jobs";
import {
  createAgentRun,
  getAgentRunResults,
  getStoredApiDataToken,
  getStoredApiDataUsername,
  mapBridgeKindToAgentRuntime,
  setStoredApiDataToken,
} from "./lib/api/api-data-runs-api";
import { mergeAgentChatLine } from "./lib/merge-agent-chat-line";
import { parseTestCasesFromPrompt, shortcutToRegistryEntry } from "./lib/parse-test-cases";
import { type PromptAttachment } from "./lib/prompt-attachment";
import { type AppliedPromptShortcut, promptShortcutPath } from "./lib/prompt-compose";
import type { PromptShortcut } from "./lib/prompt-shortcuts";
import { DEFAULT_CHANNEL, DEFAULT_WS_HOST, DEFAULT_WS_PORT } from "./lib/protocol";
import { buildRunEvidence, applyEvidenceToTestCases } from "./lib/run-evidence";
import type { BridgeSummary, ChatLine, ConnectionState } from "./lib/types";
import { AutomationWsClient } from "./lib/ws-client";

const STORAGE_KEY = "knitto-automation-web";

type PersistedState = {
  host?: string;
  port?: string;
  channel?: string;
  useWss?: boolean;
  wantConnected?: boolean;
  selectedBridgeId?: string;
  selectedModel?: string;
  strategy?: string;
  cursorKey?: string;
  openaiBaseUrl?: string;
  openaiKey?: string;
  platform?: AutomationPlatform;
  mobileConfig?: MobileConfig;
};

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState & {
      nineRouterBaseUrl?: string;
      nineRouterKey?: string;
    };
    return {
      ...parsed,
      openaiBaseUrl: parsed.openaiBaseUrl ?? parsed.nineRouterBaseUrl,
      openaiKey: parsed.openaiKey ?? parsed.nineRouterKey,
    };
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

function normalizeCredKind(value: string | undefined): AgentCredKind | undefined {
  const kind = String(value ?? "").toLowerCase();
  if (kind === "cursor") return "cursor";
  if (
    kind === "openai" ||
    kind === "ninerouter" ||
    kind === "openrouter" ||
    kind === "gemini"
  ) {
    return "openai";
  }
  return undefined;
}

function bridgesRefKindFromId(
  list: BridgeSummary[],
  bridgeId: string
): AgentCredKind | undefined {
  const bridge = list.find((b) => b.bridgeId === bridgeId);
  return normalizeCredKind(bridge?.bridgeKind);
}

export function App() {
  const persisted = useMemo(() => loadState(), []);
  const [host, setHost] = useState(persisted.host ?? DEFAULT_WS_HOST);
  const [port, setPort] = useState(persisted.port ?? DEFAULT_WS_PORT);
  const [channel, setChannel] = useState(persisted.channel ?? DEFAULT_CHANNEL);
  const [useWss, setUseWss] = useState(persisted.useWss ?? false);
  const [wantConnected, setWantConnected] = useState(persisted.wantConnected ?? false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [bridges, setBridges] = useState<BridgeSummary[]>([]);
  const [selectedBridgeId, setSelectedBridgeId] = useState(persisted.selectedBridgeId ?? "");
  const [selectedModel, setSelectedModel] = useState(persisted.selectedModel ?? "");
  const [strategy] = useState(persisted.strategy ?? "automation_human_strategy");
  const [platform, setPlatform] = useState<AutomationPlatform>(persisted.platform ?? "browser");
  const [mobileConfig, setMobileConfig] = useState<MobileConfig>(
    persisted.mobileConfig ?? { appPackage: "" }
  );
  const [prompt, setPrompt] = useState("");
  const [promptBases, setPromptBases] = useState<AppliedPromptShortcut[]>([]);
  const [promptAttachments, setPromptAttachments] = useState<PromptAttachment[]>([]);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [workerState, setWorkerState] = useState<"idle" | "busy">("idle");
  const [cursorKey, setCursorKey] = useState(persisted.cursorKey ?? "");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(persisted.openaiBaseUrl ?? "");
  const [openaiKey, setOpenaiKey] = useState(persisted.openaiKey ?? "");
  const [credStatusByBridge, setCredStatusByBridge] = useState<AgentCredStatusMap>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRunId, setHistoryRunId] = useState<number | null>(null);
  const [apiDataAuthed, setApiDataAuthed] = useState(() => Boolean(getStoredApiDataToken()));
  const [apiDataUsername, setApiDataUsername] = useState(() => getStoredApiDataUsername() || null);

  const handleApiDataLoggedIn = useCallback((username: string) => {
    setApiDataAuthed(true);
    setApiDataUsername(username);
  }, []);

  const handleApiDataLogout = useCallback(() => {
    setStoredApiDataToken(null);
    setApiDataAuthed(false);
    setApiDataUsername(null);
    setWantConnected(false);
    wsRef.current?.disconnect();
  }, []);

  const lastSubmittedJobId = useRef<string | null>(null);
  const activeJobIds = useRef(new Set<string>());
  const jobRunIds = useRef(new Map<string, number>());
  const wsRef = useRef<AutomationWsClient | null>(null);
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const cursorKeyRef = useRef(cursorKey);
  cursorKeyRef.current = cursorKey;
  const openaiBaseUrlRef = useRef(openaiBaseUrl);
  openaiBaseUrlRef.current = openaiBaseUrl;
  const openaiKeyRef = useRef(openaiKey);
  openaiKeyRef.current = openaiKey;
  const credPushSigRef = useRef("");
  const { data: promptShortcuts = [] } = usePromptShortcuts();
  const shortcutRegistry = useMemo(
    () => promptShortcuts.map((shortcut) => shortcutToRegistryEntry(shortcut)),
    [promptShortcuts]
  );

  const pushStoredCredentials = useCallback(() => {
    const client = wsRef.current;
    if (!client) return;
    const list = bridgesRef.current;
    const cursorBridge = list.find((b) => b.bridgeKind === "cursor");
    const openaiBridge = list.find((b) => b.bridgeKind === "openai");
    const ck = cursorKeyRef.current.trim();
    const base = openaiBaseUrlRef.current.trim();
    const ok = openaiKeyRef.current.trim();
    const sig = `${cursorBridge?.bridgeId ?? ""}|${ck}|${openaiBridge?.bridgeId ?? ""}|${base}|${ok}`;
    if (!sig.replace(/\|/g, "") || sig === credPushSigRef.current) return;

    let pushed = false;
    if (cursorBridge && ck) {
      client.sendCredentials({
        bridgeId: cursorBridge.bridgeId,
        bridgeKind: "cursor",
        apiKey: ck,
      });
      pushed = true;
    }
    if (openaiBridge && base) {
      client.sendCredentials({
        bridgeId: openaiBridge.bridgeId,
        bridgeKind: "openai",
        openai: { baseUrl: base, apiKey: ok },
      });
      pushed = true;
    }
    if (pushed) credPushSigRef.current = sig;
  }, []);

  useEffect(() => {
    saveState({
      host,
      port,
      channel,
      useWss,
      wantConnected,
      selectedBridgeId,
      selectedModel,
      strategy,
      cursorKey,
      openaiBaseUrl,
      openaiKey,
      platform,
      mobileConfig: mobileConfig.appPackage ? mobileConfig : undefined,
    });
  }, [
    host,
    port,
    channel,
    useWss,
    wantConnected,
    selectedBridgeId,
    selectedModel,
    strategy,
    cursorKey,
    openaiBaseUrl,
    openaiKey,
    platform,
    mobileConfig,
  ]);

  useEffect(() => {
    const product = bridges.filter(
      (b) => b.bridgeKind === "cursor" || b.bridgeKind === "openai"
    );
    if (!product.length) return;
    const selectedStillValid = product.some((b) => b.bridgeId === selectedBridgeId);
    if (!selectedBridgeId || !selectedStillValid) {
      setSelectedBridgeId(product[0]!.bridgeId);
    }
  }, [bridges, selectedBridgeId]);

  const ensureClient = useCallback(() => {
    if (wsRef.current) return wsRef.current;

    const client = new AutomationWsClient({
      onConnectionState: setConnectionState,
      onBridges: (next) => {
        bridgesRef.current = next;
        setBridges(next);
        pushStoredCredentials();
      },
      onBridgeAvailable: setBridgeAvailable,
      onAgentJob: (msg) => {
        setWorkerState(syncActiveJobIds(msg.id, msg.status, activeJobIds.current));
        if (!isActiveJobStatus(msg.status) && lastSubmittedJobId.current === msg.id) {
          lastSubmittedJobId.current = null;
        }
        wsRef.current?.clearSubmittedJob(msg.id, msg.status);

        const terminal =
          msg.status === "completed" ||
          msg.status === "error" ||
          msg.status === "cancelled";
        const token = getStoredApiDataToken();
        setChatLines((prev) => {
          const idx = prev.findIndex((l) => l.id === msg.id && l.role === "agent");
          const prevLine = idx >= 0 ? prev[idx] : undefined;
          const line = mergeAgentChatLine(msg, prevLine);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = line;
            return next;
          }
          return [...prev, line];
        });

        // Prefer msg.runId, else create-before-WS map
        const runId = msg.runId ?? jobRunIds.current.get(msg.id);
        if (terminal && token && runId != null) {
          void (async () => {
            try {
              const results = await getAgentRunResults(token, runId);
              const bundled = buildRunEvidence(results, {
                screenshots: msg.screenshots,
                videoUrl: msg.videoUrl,
                videoUrls: msg.videoUrls,
              });
              if (
                !bundled.evidence.length &&
                !bundled.screenshots?.length &&
                !bundled.videoUrl &&
                !bundled.videoUrls?.length
              ) {
                return;
              }
              setChatLines((prev) =>
                prev.map((line) => {
                  if (!(line.id === msg.id && line.role === "agent")) return line;
                  const hydratedTc = applyEvidenceToTestCases(
                    line.testCaseResults ?? msg.testCaseResults,
                    bundled.evidence
                  );
                  return {
                    ...line,
                    runId: line.runId ?? runId,
                    evidence: bundled.evidence.length
                      ? bundled.evidence
                      : line.evidence,
                    testCaseResults: hydratedTc ?? line.testCaseResults,
                    screenshots: bundled.screenshots ?? line.screenshots,
                    videoUrl: bundled.videoUrl ?? line.videoUrl,
                    videoUrls: bundled.videoUrls ?? line.videoUrls,
                  };
                })
              );
            } catch {
              // keep Worker disk URLs
            }
          })();
        }
      },
      onCredentialsRequest: (payload) => {
        const kind = normalizeCredKind(payload.bridgeKind);
        if (!kind) return;
        setCredStatusByBridge((prev) => ({
          ...prev,
          [kind]: {
            message: "Agent requested API credentials — pushing from local storage…",
          },
        }));
        credPushSigRef.current = "";
        pushStoredCredentials();
      },
      onCredentialsStatus: (payload) => {
        const kind =
          normalizeCredKind(payload.bridgeKind) ??
          bridgesRefKindFromId(bridgesRef.current, payload.bridgeId);
        if (!kind) return;
        setCredStatusByBridge((prev) => ({
          ...prev,
          [kind]: {
            message: payload.valid ? "Credentials verified." : payload.message,
            valid: payload.valid,
          },
        }));
      },
      onJoined: () => {
        credPushSigRef.current = "";
        queueMicrotask(() => pushStoredCredentials());
      },
    });

    wsRef.current = client;
    return client;
  }, [pushStoredCredentials]);

  const handleConnect = useCallback(() => {
    setWantConnected(true);
    ensureClient().connect(host, port, channel, useWss);
  }, [ensureClient, host, port, channel, useWss]);

  const handleDisconnect = useCallback(() => {
    setWantConnected(false);
    wsRef.current?.disconnect();
  }, []);

  const handleRefresh = () => {
    wsRef.current?.refreshStatus();
  };

  // Auto-connect after refresh / login when user previously connected.
  // Mid-session drops are handled by AutomationWsClient backoff reconnect.
  useEffect(() => {
    if (!apiDataAuthed || !wantConnected) return;
    ensureClient().connect(host, port, channel, useWss);
    // Only re-run when auth / wantConnected flips — not on every host keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- host/port captured at connect intent
  }, [apiDataAuthed, wantConnected, ensureClient]);

  const handleSend = () => {
    const main = prompt.trim();
    const basePaths = promptBases.map((b) => promptShortcutPath(b.id));
    if ((!main && !promptAttachments.length && !basePaths.length) || !selectedBridgeId) return;

    const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
    const apiDataToken = getStoredApiDataToken();
    if (!apiDataToken) {
      setChatLines((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Sesi API Data hilang — logout lalu login ulang sebelum submit job.",
        },
      ]);
      return;
    }

    const id = jobId();
    lastSubmittedJobId.current = id;
    activeJobIds.current.add(id);

    const attachments = promptAttachments.length ? [...promptAttachments] : undefined;
    const baseSnapshot = promptBases.map((b) => ({
      id: b.id,
      label: b.label,
      icon: b.icon,
      variant: b.variant,
      path: promptShortcutPath(b.id),
    }));

    const parsedTc =
      platform === "hybrid"
        ? parseTestCasesFromPrompt(main, mobileConfig, shortcutRegistry)
        : null;

    setChatLines((prev) => [
      ...prev,
      {
        id: `u-${id}`,
        role: "user",
        text: main,
        jobPlatform: platform,
        testCaseCount: parsedTc?.testCases.length,
        promptBases: baseSnapshot.length ? baseSnapshot : undefined,
        attachments,
      },
      {
        id,
        role: "agent",
        text: "Membuat agent run di API Data…",
        status: "queued",
        progress: 0,
      },
    ]);
    setWorkerState("busy");
    setPrompt("");
    setPromptBases([]);
    setPromptAttachments([]);

    const model =
      selectedModel ||
      bridge?.defaultModel ||
      bridge?.models?.[0]?.id ||
      "";
    const promptText = main || "Gunakan lampiran sesuai instruksi di prompt user.";
    const mobileConfigPayload =
      platform === "mobile" || platform === "hybrid"
        ? toMobileConfigPayload(mobileConfig)
        : undefined;

    void (async () => {
      try {
        const run = await createAgentRun(apiDataToken, {
          agentJobId: id,
          agentRuntime: mapBridgeKindToAgentRuntime(bridge?.bridgeKind),
          platform,
        });
        jobRunIds.current.set(id, run.runId);

        setChatLines((prev) =>
          prev.map((line) =>
            line.id === id && line.role === "agent"
              ? {
                  ...line,
                  text: `runId ${run.runId} — mengirim ke Worker…`,
                  runId: run.runId,
                  status: "queued",
                }
              : line
          )
        );

        wsRef.current?.sendUserPrompt({
          id,
          bridgeId: selectedBridgeId,
          agentRuntime: mapBridgeKindToAgentRuntime(bridge?.bridgeKind),
          text: promptText,
          promptBasePaths: basePaths.length ? basePaths : undefined,
          mainPrompt: main || undefined,
          strategy,
          model,
          attachments,
          platform,
          mobileConfig: mobileConfigPayload,
          runId: run.runId,
          apiDataToken,
        });
      } catch (error) {
        activeJobIds.current.delete(id);
        lastSubmittedJobId.current = null;
        setWorkerState("idle");
        const message =
          error instanceof Error ? error.message : String(error);
        setChatLines((prev) =>
          prev.map((line) =>
            line.id === id && line.role === "agent"
              ? {
                  ...line,
                  text: `Gagal create run (job tidak dikirim): ${message}`,
                  status: "error",
                }
              : line
          )
        );
      }
    })();
  };

  const handleAddPromptBase = useCallback((shortcut: PromptShortcut, filledText: string) => {
    if (!filledText.trim()) return;
    const entry: AppliedPromptShortcut = {
      id: shortcut.id,
      label: shortcut.label,
      icon: shortcut.icon,
      variant: shortcut.variant,
      filledText,
    };
    setPromptBases((prev) => {
      const without = prev.filter((b) => b.id !== shortcut.id);
      return [...without, entry];
    });
  }, []);

  const handleRemovePromptBase = useCallback((id: string) => {
    setPromptBases((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleApplyMainPrompt = useCallback((filledText: string) => {
    setPrompt(filledText);
  }, []);

  const handleCancel = () => {
    const id = lastSubmittedJobId.current;
    if (!id || !selectedBridgeId || workerState !== "busy") return;
    wsRef.current?.cancelJob({ id, bridgeId: selectedBridgeId });
  };

  const selectedBridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
  const browserHeaded = selectedBridge?.browserHeaded;

  const sendCred = async (bridgeKind: "cursor", apiKey: string) => {
    const bridge = bridges.find((b) => b.bridgeKind === bridgeKind);
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    if (!bridgeId || !apiKey.trim()) return;
    setCredStatusByBridge((prev) => ({
      ...prev,
      [bridgeKind]: { message: `Sent ${bridgeKind} credentials…` },
    }));
    wsRef.current?.sendCredentials({ bridgeId, bridgeKind, apiKey: apiKey.trim() });
  };

  const sendOpenaiCred = async () => {
    const bridge = bridges.find((b) => b.bridgeKind === "openai");
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    const baseUrl = openaiBaseUrl.trim();
    if (!bridgeId || !baseUrl) return;
    setCredStatusByBridge((prev) => ({
      ...prev,
      openai: { message: "Sent OpenAI-compatible credentials…" },
    }));
    wsRef.current?.sendCredentials({
      bridgeId,
      bridgeKind: "openai",
      openai: { baseUrl, apiKey: openaiKey.trim() },
    });
  };

  return (
    <MobileDevicesProvider enabled={platform === "mobile" || platform === "hybrid"}>
    {!apiDataAuthed ? (
      <ApiDataLoginScreen onLoggedIn={handleApiDataLoggedIn} />
    ) : (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      <ChatHeader
        connectionState={connectionState}
        bridgeAvailable={bridgeAvailable}
        apiDataUsername={apiDataUsername}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => {
          setHistoryRunId(null);
          setHistoryOpen(true);
        }}
        onLogout={handleApiDataLogout}
      />

      <ChatMain
        bridges={bridges}
        prompt={prompt}
        promptBases={promptBases}
        promptAttachments={promptAttachments}
        platform={platform}
        mobileConfig={mobileConfig}
        workerState={workerState}
        connectionState={connectionState}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        chatLines={chatLines}
        onPromptChange={setPrompt}
        onAddPromptBase={handleAddPromptBase}
        onRemovePromptBase={handleRemovePromptBase}
        onApplyMainPrompt={handleApplyMainPrompt}
        onPromptAttachmentsChange={setPromptAttachments}
        onSelectBridge={setSelectedBridgeId}
        onSelectModel={setSelectedModel}
        onPlatformChange={(next) => {
          setPlatform(next);
          if (next === "hybrid") {
            setMobileConfig({ appPackage: "", udid: undefined, deepLink: undefined });
          }
        }}
        onMobileConfigChange={setMobileConfig}
        onSend={handleSend}
        onCancel={handleCancel}
        onOpenHistory={(runId) => {
          setHistoryRunId(runId);
          setHistoryOpen(true);
        }}
      />

      <RunHistoryModal
        open={historyOpen}
        initialRunId={historyRunId}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryRunId(null);
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        connection={
          <>
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
            <AgentCredentials
              embedded
              bridges={bridges}
              selectedBridgeId={selectedBridgeId}
              cursorKey={cursorKey}
              openaiBaseUrl={openaiBaseUrl}
              openaiKey={openaiKey}
              statusByBridge={credStatusByBridge}
              onSelectBridge={setSelectedBridgeId}
              onCursorKeyChange={setCursorKey}
              onOpenaiBaseUrlChange={setOpenaiBaseUrl}
              onOpenaiKeyChange={setOpenaiKey}
              onSaveCursor={() => void sendCred("cursor", cursorKey)}
              onSaveOpenai={() => void sendOpenaiCred()}
            />
          </>
        }
        templates={
          <PromptShortcutsSettings
            selectedBridgeId={selectedBridgeId}
            selectedModel={selectedModel}
            connectionState={connectionState}
          />
        }
        memory={<AppMemorySettings />}
      />
    </div>
    )}
    </MobileDevicesProvider>
  );
}
export default App;
