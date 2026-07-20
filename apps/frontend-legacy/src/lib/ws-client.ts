import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import { resolveWsUrl } from "./api-client";
import { isTerminalJobStatus } from "./active-jobs";
import type { AgentJobMessage, BridgeSummary, ConnectionState } from "./types";

const ACTIVE_JOBS_STORAGE_KEY = "knitto-automation-active-jobs";

export type WsClientCallbacks = {
  onConnectionState: (state: ConnectionState) => void;
  onBridges: (bridges: BridgeSummary[]) => void;
  onBridgeAvailable: (available: boolean) => void;
  onAgentJob: (msg: AgentJobMessage) => void;
  onCredentialsRequest: (payload: {
    bridgeId: string;
    bridgeKind: string;
  }) => void;
  onCredentialsStatus: (payload: {
    bridgeId: string;
    bridgeKind: string;
    valid: boolean;
    message: string;
  }) => void;
  /** Fired after join/system when connectionId is known (also after reconnect). */
  onJoined?: (payload: { connectionId: string; channel: string }) => void;
};

function loadPersistedJobIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(ACTIVE_JOBS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function persistJobIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(ACTIVE_JOBS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export class AutomationWsClient {
  private socket: WebSocket | null = null;
  private channel = "";
  private connectionId = "";
  private readonly submittedJobIds = loadPersistedJobIds();
  private intentionalDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private lastConnect: {
    host: string;
    port: string;
    channel: string;
    useWss: boolean;
  } | null = null;

  constructor(private readonly callbacks: WsClientCallbacks) {}

  clearSubmittedJob(jobId: string, status: AgentJobMessage["status"]): void {
    if (isTerminalJobStatus(status)) {
      this.submittedJobIds.delete(jobId);
      persistJobIds(this.submittedJobIds);
    }
  }

  connect(host: string, port: string, channel: string, useWss = false): void {
    this.clearReconnectTimer();
    this.intentionalDisconnect = false;
    this.lastConnect = { host, port, channel, useWss };
    this.openSocket(host, port, channel, useWss);
  }

  /** User-initiated disconnect — disables auto-reconnect until connect() again. */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;
    this.teardownSocket();
    this.connectionId = "";
    this.callbacks.onConnectionState("disconnected");
  }

  refreshStatus(): void {
    this.send({ type: "refresh_status", channel: this.channel });
  }

  sendUserPrompt(payload: {
    id: string;
    bridgeId: string;
    agentRuntime?: "cursor" | "openai";
    text: string;
    strategy: string;
    model: string;
    promptBasePaths?: string[];
    mainPrompt?: string;
    platform?: AutomationPlatform;
    mobileConfig?: MobileConfig;
    runId?: number;
    apiDataToken?: string;
    attachments?: Array<{
      storagePath?: string;
      mediaId?: number;
      mimeType: string;
      name: string;
      kind: "image" | "file";
    }>;
  }): void {
    this.submittedJobIds.add(payload.id);
    persistJobIds(this.submittedJobIds);
    this.send({
      type: "user_prompt",
      id: payload.id,
      channel: this.channel,
      bridgeId: payload.bridgeId,
      ...(payload.agentRuntime ? { agentRuntime: payload.agentRuntime } : {}),
      text: payload.text,
      strategy: payload.strategy,
      model: payload.model,
      ...(payload.promptBasePaths?.length ? { promptBasePaths: payload.promptBasePaths } : {}),
      ...(payload.mainPrompt ? { mainPrompt: payload.mainPrompt } : {}),
      ...(payload.platform ? { platform: payload.platform } : {}),
      ...(payload.mobileConfig ? { mobileConfig: payload.mobileConfig } : {}),
      ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
      ...(payload.runId != null ? { runId: payload.runId } : {}),
      ...(payload.apiDataToken ? { apiDataToken: payload.apiDataToken } : {}),
    });
  }

  sendCredentials(
    payload:
      | { bridgeId: string; bridgeKind: "cursor"; apiKey: string }
      | {
          bridgeId: string;
          bridgeKind: "openai";
          openai: { baseUrl: string; apiKey: string };
        }
  ): void {
    if (payload.bridgeKind === "openai") {
      this.send({
        type: "bridge_credentials",
        channel: this.channel,
        bridgeId: payload.bridgeId,
        bridgeKind: payload.bridgeKind,
        openai: payload.openai,
      });
      return;
    }

    this.send({
      type: "bridge_credentials",
      channel: this.channel,
      bridgeId: payload.bridgeId,
      bridgeKind: payload.bridgeKind,
      apiKey: payload.apiKey,
    });
  }

  cancelJob(payload: { id: string; bridgeId: string }): void {
    this.send({
      type: "agent_job_cancel",
      id: payload.id,
      channel: this.channel,
      bridgeId: payload.bridgeId,
    });
  }

  private openSocket(host: string, port: string, channel: string, useWss: boolean): void {
    this.teardownSocket();
    this.channel = channel;
    this.callbacks.onConnectionState("connecting");

    const url = resolveWsUrl(host, port, useWss);
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "join",
          channel: channel.trim(),
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as Record<string, unknown>;
        this.handleMessage(data);
      } catch {
        // ignore
      }
    };

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (this.intentionalDisconnect) {
        this.callbacks.onConnectionState("disconnected");
        return;
      }
      this.callbacks.onConnectionState("disconnected");
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      if (this.intentionalDisconnect) return;
      this.callbacks.onConnectionState("error");
    };
  }

  private teardownSocket(): void {
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalDisconnect || !this.lastConnect) return;
    this.clearReconnectTimer();
    const delays = [1000, 2000, 5000, 10000, 15000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)]!;
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalDisconnect || !this.lastConnect) return;
      const { host, port, channel, useWss } = this.lastConnect;
      this.openSocket(host, port, channel, useWss);
    }, delay);
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private handleMessage(data: Record<string, unknown>): void {
    switch (data.type) {
      case "joined":
      case "system":
        if (typeof data.connectionId === "string") {
          this.connectionId = data.connectionId;
        }
        this.reconnectAttempt = 0;
        this.callbacks.onConnectionState("connected");
        this.refreshStatus();
        this.callbacks.onJoined?.({
          connectionId: this.connectionId,
          channel: this.channel,
        });
        break;
      case "bridges_snapshot":
        this.callbacks.onBridges((data.bridges as BridgeSummary[]) ?? []);
        break;
      case "bridge_status":
        this.callbacks.onBridgeAvailable(data.available === true);
        if (Array.isArray(data.bridges)) {
          this.callbacks.onBridges(data.bridges as BridgeSummary[]);
        }
        break;
      case "agent_job": {
        const msg = data as unknown as AgentJobMessage;
        const ownsJob = this.submittedJobIds.has(msg.id);
        // After refresh/reconnect connectionId changes; still accept owned jobs
        // and channel broadcasts (msg without connectionId, or matching id).
        const sameConnection =
          !msg.connectionId || !this.connectionId || msg.connectionId === this.connectionId;
        if (!ownsJob && !sameConnection) {
          break;
        }
        this.callbacks.onAgentJob(msg);
        break;
      }
      case "bridge_credentials_request":
        this.callbacks.onCredentialsRequest({
          bridgeId: String(data.bridgeId ?? ""),
          bridgeKind: String(data.bridgeKind ?? ""),
        });
        break;
      case "bridge_credentials_status":
        this.callbacks.onCredentialsStatus({
          bridgeId: String(data.bridgeId ?? ""),
          bridgeKind: String(data.bridgeKind ?? ""),
          valid: data.valid === true,
          message: String(data.message ?? ""),
        });
        break;
      case "error":
        this.callbacks.onConnectionState("error");
        break;
      default:
        break;
    }
  }
}
