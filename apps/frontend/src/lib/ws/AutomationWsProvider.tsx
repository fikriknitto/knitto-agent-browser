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
  setWantConnected,
} from "@/redux/connectionSlice";
import {
  appendChatLine,
  setLastSubmittedJobId,
  setWorkerState,
  upsertAgentChatLine,
} from "@/redux/automationSlice";
import type { RootState } from "@/redux/store";
import { AutomationWsClient } from "@/lib/ws/ws-client";
import { isActiveJobStatus, syncActiveJobIds } from "@/lib/utils/active-jobs";
import type { AgentJobMessage, ChatLine } from "@/types/automation";

type WsContextValue = {
  client: AutomationWsClient | null;
  connect: () => void;
  disconnect: () => void;
  refreshStatus: () => void;
};

const WsContext = createContext<WsContextValue>({
  client: null,
  connect: () => undefined,
  disconnect: () => undefined,
  refreshStatus: () => undefined,
});

export function useAutomationWs() {
  return useContext(WsContext);
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
    openaiBaseUrl,
    openaiKey,
    bridges,
  } = useSelector((s: RootState) => s.connection);

  const clientRef = useRef<AutomationWsClient | null>(null);
  const activeJobIds = useRef(new Set<string>());
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const credPushSigRef = useRef("");
  const credsRef = useRef({ cursorKey, openaiBaseUrl, openaiKey });
  credsRef.current = { cursorKey, openaiBaseUrl, openaiKey };

  const pushStoredCredentials = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    const list = bridgesRef.current;
    const { cursorKey: ck, openaiBaseUrl: base, openaiKey: ok } = credsRef.current;
    const cursorBridge = list.find((b) => b.bridgeKind === "cursor");
    const openaiBridge = list.find((b) => b.bridgeKind === "openai");
    const sig = `${cursorBridge?.bridgeId}|${ck}|${openaiBridge?.bridgeId}|${base}|${ok}`;
    if (!sig.replace(/\|/g, "") || sig === credPushSigRef.current) return;
    let pushed = false;
    if (cursorBridge && ck.trim()) {
      client.sendCredentials({
        bridgeId: cursorBridge.bridgeId,
        bridgeKind: "cursor",
        apiKey: ck.trim(),
      });
      pushed = true;
    }
    if (openaiBridge && base.trim()) {
      client.sendCredentials({
        bridgeId: openaiBridge.bridgeId,
        bridgeKind: "openai",
        openai: { baseUrl: base.trim(), apiKey: ok.trim() },
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

        const line: ChatLine = {
          id: msg.id,
          role: "agent",
          text: msg.message || msg.result || msg.status,
          status: msg.status,
          progress: msg.progress,
          result: msg.result,
          screenshots: msg.screenshots,
          videoUrl: msg.videoUrl,
          videoUrls: msg.videoUrls,
          testCaseResults: msg.testCaseResults,
          runId: msg.runId,
        };
        dispatch(upsertAgentChatLine(line));
      },
      onCredentialsRequest: () => {
        credPushSigRef.current = "";
        pushStoredCredentials();
      },
      onCredentialsStatus: (payload) => {
        dispatch(
          appendChatLine({
            id: `cred-${Date.now()}`,
            role: "system",
            text: payload.valid
              ? `Credentials verified (${payload.bridgeKind}).`
              : `Credentials: ${payload.message}`,
          })
        );
      },
      onJoined: () => {
        credPushSigRef.current = "";
        queueMicrotask(() => pushStoredCredentials());
        dispatch(
          appendChatLine({
            id: `sys-joined-${Date.now()}`,
            role: "system",
            text: "WebSocket joined — credentials auto-pushed if saved.",
          })
        );
      },
    });

    clientRef.current = client;
    return client;
  }, [dispatch, pushStoredCredentials]);

  const connect = useCallback(() => {
    dispatch(setWantConnected(true));
    ensureClient().connect(host, port, channel, useWss);
  }, [dispatch, ensureClient, host, port, channel, useWss]);

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

  const value = useMemo(
    () => ({
      client: clientRef.current,
      connect,
      disconnect,
      refreshStatus,
    }),
    [connect, disconnect, refreshStatus, connectionState]
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}
