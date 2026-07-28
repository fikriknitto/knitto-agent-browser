import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setBridgeAvailable,
  setBridges,
  setConnectionState,
  setCredStatus,
  setWantConnected,
  type OpenaiProvider,
} from "@/redux/connectionSlice";
import {
  setLastSubmittedJobId,
  setWorkerState,
  upsertAgentChatLine,
} from "@/redux/automationSlice";
import type { RootState } from "@/redux/store";
import { AutomationWsClient } from "@/lib/ws/ws-client";
import { isActiveJobStatus, syncActiveJobIds } from "@/lib/utils/active-jobs";
import { mergeAgentChatLine } from "@/lib/utils/merge-agent-chat-line";
import type { AgentJobMessage, ChatLine } from "@/types/automation";

type WsContextValue = {
  client: AutomationWsClient | null;
  getClient: () => AutomationWsClient | null;
  connect: () => void;
  disconnect: () => void;
  refreshStatus: () => void;
};

const WsContext = createContext<WsContextValue>({
  client: null,
  getClient: () => null,
  connect: () => undefined,
  disconnect: () => undefined,
  refreshStatus: () => undefined,
});

export function useAutomationWs() {
  return useContext(WsContext);
}

function buildCredPushSignature(cursorKey: string, providers: OpenaiProvider[]): string {
  const cursorPart = cursorKey.trim();
  const openaiPart = providers
    .map((p) => `${p.id}|${p.name}|${p.baseUrl}|${p.apiKey}`)
    .sort()
    .join(";");
  return `${cursorPart}::${openaiPart}`;
}

export function AutomationWsProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const {
    host,
    port,
    channel,
    useWss,
    wantConnected,
    connectionState,
    cursorKey,
    openaiProviders,
    bridges,
  } = useSelector((s: RootState) => s.connection);
  const chatLines = useSelector((s: RootState) => s.automation.chatLines);

  const clientRef = useRef<AutomationWsClient | null>(null);
  const activeJobIds = useRef(new Set<string>());
  const chatLinesRef = useRef<ChatLine[]>([]);
  chatLinesRef.current = chatLines;
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const credPushSigRef = useRef("");
  const credsRef = useRef({ cursorKey, openaiProviders });
  credsRef.current = { cursorKey, openaiProviders };
  const connectParamsRef = useRef({ host, port, channel, useWss });
  connectParamsRef.current = { host, port, channel, useWss };

  const pushStoredCredentials = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    const list = bridgesRef.current;
    const { cursorKey: ck, openaiProviders: providers } = credsRef.current;
    const sig = buildCredPushSignature(ck, providers);
    if (!sig.replace(/[:;|]/g, "") || sig === credPushSigRef.current) return;

    client.sendOpenaiProvidersSync(
      providers.map((p) => ({
        id: p.id,
        name: p.name.trim() || "OpenAI-compatible",
      }))
    );

    let pushed = false;
    const cursorBridge = list.find((b) => b.bridgeKind === "cursor");
    if (cursorBridge && ck.trim()) {
      client.sendCredentials({
        bridgeId: cursorBridge.bridgeId,
        bridgeKind: "cursor",
        apiKey: ck.trim(),
      });
      pushed = true;
    }

    for (const provider of providers) {
      const baseUrl = provider.baseUrl.trim();
      if (!baseUrl) continue;
      client.sendCredentials({
        bridgeId: provider.id,
        bridgeKind: "openai",
        openai: {
          name: provider.name.trim() || "OpenAI-compatible",
          baseUrl,
          apiKey: provider.apiKey.trim(),
        },
      });
      pushed = true;
    }

    if (pushed) credPushSigRef.current = sig;
  }, []);

  const ensureClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = new AutomationWsClient({
      onConnectionState: (state) => dispatch(setConnectionState(state)),
      onBridges: (next) => {
        bridgesRef.current = next;
        dispatch(setBridges(next));
        pushStoredCredentials();
      },
      onBridgeAvailable: (available) => dispatch(setBridgeAvailable(available)),
      onAgentJob: (msg: AgentJobMessage) => {
        dispatch(setWorkerState(syncActiveJobIds(msg.id, msg.status, activeJobIds.current)));
        if (!isActiveJobStatus(msg.status)) {
          dispatch(setLastSubmittedJobId(null));
        }
        clientRef.current?.clearSubmittedJob(msg.id, msg.status);

        const prevLine = chatLinesRef.current.find(
          (l) => l.id === msg.id && l.role === "agent"
        );
        const line = mergeAgentChatLine(msg, prevLine);
        dispatch(upsertAgentChatLine(line));
      },
      onCredentialsRequest: () => {
        credPushSigRef.current = "";
        pushStoredCredentials();
      },
      onCredentialsStatus: (payload) => {
        dispatch(
          setCredStatus({
            bridgeId: payload.bridgeId,
            message: payload.valid ? "Verified." : payload.message,
            valid: payload.valid,
          })
        );
      },
      onJoined: () => {
        credPushSigRef.current = "";
        queueMicrotask(() => pushStoredCredentials());
      },
    });

    clientRef.current = client;
    return client;
  }, [dispatch, pushStoredCredentials]);

  const connect = useCallback(() => {
    const { host, port, channel, useWss } = connectParamsRef.current;
    dispatch(setWantConnected(true));
    ensureClient().connect(host, port, channel, useWss);
  }, [dispatch, ensureClient]);

  const disconnect = useCallback(() => {
    dispatch(setWantConnected(false));
    clientRef.current?.disconnect();
  }, [dispatch]);

  const refreshStatus = useCallback(() => {
    clientRef.current?.refreshStatus();
  }, []);

  useEffect(() => {
    if (!wantConnected) return;
    ensureClient().connect(host, port, channel, useWss);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect intent only
  }, [wantConnected, ensureClient]);

  useEffect(() => {
    if (connectionState !== "connected") return;
    credPushSigRef.current = "";
    pushStoredCredentials();
  }, [connectionState, cursorKey, openaiProviders, pushStoredCredentials]);

  const getClient = useCallback(() => clientRef.current, []);

  const value = useMemo(
    () => ({
      client: clientRef.current,
      getClient,
      connect,
      disconnect,
      refreshStatus,
    }),
    [getClient, connect, disconnect, refreshStatus]
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}
