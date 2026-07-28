import { randomBytes } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import type { AgentJobMessage, BridgeKind } from "@knitto/shared";
import { createLogger } from "../../core/logging.js";
import type { AgentRegistryService } from "../../agents/agent-registry.service.js";
import { WebSocketServer, type WebSocket } from "ws";

const logger = createLogger("ws-hub");

type Role = "web";

type ClientMeta = {
  channel: string;
  role: Role;
  connectionId: string;
};

const AGENT_WEB_TYPES = new Set([
  "user_prompt",
  "agent_job_cancel",
  "refresh_status",
  "bridge_credentials",
  "openai_providers_sync",
]);

function createConnectionId(): string {
  return `web-${randomBytes(4).toString("hex")}`;
}

function normalizeBridgeKind(kind?: string): BridgeKind {
  const raw = String(kind ?? "").toLowerCase();
  if (
    raw === "openai" ||
    raw === "ninerouter" ||
    raw === "9router" ||
    raw === "openrouter" ||
    raw === "sca" ||
    raw === "gemini" ||
    raw === "google"
  ) {
    return "openai";
  }
  return "cursor";
}

function parseOpenaiCredentials(data: Record<string, unknown>): {
  baseUrl: string;
  apiKey: string;
  name?: string;
} | null {
  const nested = data.openai;
  if (!nested || typeof nested !== "object") return null;
  const record = nested as Record<string, unknown>;
  const baseUrl = typeof record.baseUrl === "string" ? record.baseUrl.trim() : "";
  if (!baseUrl) return null;
  const name = typeof record.name === "string" ? record.name.trim() : undefined;
  return {
    baseUrl,
    apiKey: typeof record.apiKey === "string" ? record.apiKey.trim() : "",
    ...(name ? { name } : {}),
  };
}

function parseOpenaiProvidersSync(
  data: Record<string, unknown>
): Array<{ id: string; name: string }> | null {
  const raw = data.providers;
  if (!Array.isArray(raw)) return null;
  const providers: Array<{ id: string; name: string }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) continue;
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : "OpenAI-compatible";
    providers.push({ id, name });
  }
  return providers;
}

export class WsHub {
  private readonly channels = new Map<string, Set<WebSocket>>();
  private readonly socketMeta = new WeakMap<WebSocket, ClientMeta>();
  private readonly socketsByConnectionId = new Map<string, WebSocket>();
  private readonly wss: WebSocketServer;

  constructor(
    httpServer: HttpServer,
    private readonly bridgeRegistry: AgentRegistryService
  ) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  /** Listen-time errors (e.g. EADDRINUSE) from the attached WebSocket server. */
  onceListenError(listener: (error: NodeJS.ErrnoException) => void): void {
    this.wss.once("error", listener);
  }

  async close(): Promise<void> {
    this.terminateClients();
    await new Promise<void>((resolve, reject) => {
      this.wss.close((error) => (error ? reject(error) : resolve()));
    });
  }

  /** Fast teardown for dev watch restarts (SIGTERM). */
  closeSync(): void {
    this.terminateClients();
    try {
      this.wss.close();
    } catch {
      // ignore
    }
  }

  private terminateClients(): void {
    for (const ws of this.socketsByConnectionId.values()) {
      try {
        ws.terminate();
      } catch {
        // ignore
      }
    }
    this.socketsByConnectionId.clear();
    this.channels.clear();
  }

  emitAgentJob(msg: AgentJobMessage): void {
    const connectionId = msg.connectionId;
    if (connectionId) {
      const ws = this.socketsByConnectionId.get(connectionId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
        return;
      }
    }
    this.broadcastToWeb(msg.channel, msg);
  }

  broadcastCredentialsRequest(bridgeId: string, bridgeKind: BridgeKind, channel?: string): void {
    const targets = channel ? [channel] : [...this.channels.keys()];
    for (const ch of targets) {
      this.broadcastToWeb(ch, {
        type: "bridge_credentials_request",
        bridgeId,
        bridgeKind,
        channel: ch,
      });
    }
  }

  broadcastCredentialsStatus(
    bridgeId: string,
    bridgeKind: BridgeKind,
    valid: boolean,
    message: string
  ): void {
    for (const channel of this.channels.keys()) {
      this.broadcastToWeb(channel, {
        type: "bridge_credentials_status",
        bridgeId,
        bridgeKind,
        valid,
        message,
        channel,
      });
    }
  }

  broadcastBridgeUpdates(): void {
    for (const channel of this.channels.keys()) {
      this.sendBridgeStatusToChannel(channel);
      this.sendBridgesSnapshotToChannel(channel);
    }
  }

  private getChannelClients(channel: string): Set<WebSocket> {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    return set;
  }

  private broadcastToWeb(channel: string, payload: unknown, except?: WebSocket): void {
    const raw = JSON.stringify(payload);
    for (const client of this.getChannelClients(channel)) {
      if (client !== except && client.readyState === client.OPEN) {
        client.send(raw);
      }
    }
  }

  private bridgeSummaries() {
    return this.bridgeRegistry.getAll().map((b) => ({
      bridgeId: b.bridgeId,
      bridgeKind: b.bridgeKind,
      bridgeLabel: b.bridgeLabel,
    }));
  }

  private bridgeSnapshotPayload() {
    return this.bridgeRegistry.getAll();
  }

  private sendBridgeStatus(ws: WebSocket, channelName: string): void {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "bridge_status",
        available: this.bridgeRegistry.isAvailable(),
        channel: channelName,
        bridges: this.bridgeSummaries(),
      })
    );
  }

  private sendBridgesSnapshot(ws: WebSocket, channelName: string): void {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "bridges_snapshot",
        channel: channelName,
        bridges: this.bridgeSnapshotPayload(),
      })
    );
  }

  private sendBridgeStatusToChannel(channel: string): void {
    this.broadcastToWeb(channel, {
      type: "bridge_status",
      available: this.bridgeRegistry.isAvailable(),
      channel,
      bridges: this.bridgeSummaries(),
    });
  }

  private sendBridgesSnapshotToChannel(channel: string): void {
    this.broadcastToWeb(channel, {
      type: "bridges_snapshot",
      channel,
      bridges: this.bridgeSnapshotPayload(),
    });
  }

  private handleAgentFromWeb(
    ws: WebSocket,
    meta: ClientMeta,
    data: Record<string, unknown>
  ): boolean {
    const channel = (data.channel as string) ?? meta.channel;

    if (data.type === "refresh_status") {
      this.sendBridgeStatus(ws, channel);
      this.sendBridgesSnapshot(ws, channel);
      return true;
    }

    if (data.type === "user_prompt") {
      const connectionId = meta.connectionId;
      if (!this.bridgeRegistry.isAvailable()) {
        ws.send(
          JSON.stringify({
            type: "agent_job",
            id: data.id,
            channel,
            connectionId,
            status: "error",
            message: "AI agent offline.",
            progress: 100,
          })
        );
        return true;
      }
      const agentRuntime =
        data.agentRuntime === "cursor" || data.agentRuntime === "openai"
          ? data.agentRuntime
          : undefined;
      let bridge =
        (data.bridgeId ? this.bridgeRegistry.get(String(data.bridgeId)) : undefined) ??
        (agentRuntime ? this.bridgeRegistry.findByKind(agentRuntime) : undefined);
      if (!bridge) {
        ws.send(
          JSON.stringify({
            type: "agent_job",
            id: data.id,
            channel,
            connectionId,
            status: "error",
            message: data.bridgeId
              ? "Selected agent is offline or not found."
              : "bridgeId or agentRuntime is required",
            progress: 100,
          })
        );
        return true;
      }
      bridge.handleUserPrompt({ ...data, connectionId } as never);
      return true;
    }

    if (data.type === "agent_job_cancel") {
      if (data.bridgeId) {
        const bridge = this.bridgeRegistry.get(String(data.bridgeId));
        bridge?.handleJobCancel(data as never);
      }
      return true;
    }

    if (data.type === "openai_providers_sync") {
      const providers = parseOpenaiProvidersSync(data);
      if (!providers) return true;
      this.bridgeRegistry.syncOpenaiProviders(providers);
      this.broadcastBridgeUpdates();
      this.sendBridgesSnapshotToChannel(channel);
      return true;
    }

    if (data.type === "bridge_credentials") {
      const bridgeKind = normalizeBridgeKind(String(data.bridgeKind ?? ""));
      const bridgeId = String(data.bridgeId ?? "").trim();

      if (bridgeKind === "openai") {
        const openai = parseOpenaiCredentials(data);
        if (!openai || !bridgeId) return true;
        const displayName = openai.name ?? "OpenAI-compatible";
        const target = this.bridgeRegistry.upsertOpenaiProvider(bridgeId, displayName);
        target.handleCredentials({
          bridgeId,
          openai,
        });
        return true;
      }

      const target =
        (bridgeId ? this.bridgeRegistry.get(bridgeId) : undefined) ??
        this.bridgeRegistry.findByKind(bridgeKind);
      if (!target) return true;

      if (typeof data.apiKey !== "string" || !data.apiKey.trim()) {
        return true;
      }
      target.handleCredentials({
        bridgeId: target.bridgeId,
        apiKey: data.apiKey.trim(),
      });
      return true;
    }

    return false;
  }

  private removeClient(ws: WebSocket): void {
    const meta = this.socketMeta.get(ws);
    if (!meta) return;
    this.socketsByConnectionId.delete(meta.connectionId);
    this.getChannelClients(meta.channel).delete(ws);
    if (this.getChannelClients(meta.channel).size === 0) {
      this.channels.delete(meta.channel);
    }
    this.socketMeta.delete(ws);
  }

  private handleConnection(ws: WebSocket): void {
    logger.info("WebSocket client connected");

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(String(raw)) as Record<string, unknown>;

        if (data.type === "join") {
          const channel = (data.channel as string)?.trim();
          if (!channel) {
            ws.send(JSON.stringify({ type: "error", message: "join requires channel" }));
            return;
          }

          const connectionId = createConnectionId();
          this.socketMeta.set(ws, { channel, role: "web", connectionId });
          this.socketsByConnectionId.set(connectionId, ws);
          this.getChannelClients(channel).add(ws);

          ws.send(
            JSON.stringify({
              type: "joined",
              channel,
              role: "web",
              connectionId,
            })
          );

          this.sendBridgeStatus(ws, channel);
          this.sendBridgesSnapshot(ws, channel);
          logger.info(`Client joined channel=${channel}`);
          return;
        }

        const meta = this.socketMeta.get(ws);
        if (!meta) {
          ws.send(JSON.stringify({ type: "error", message: "Join a channel first" }));
          return;
        }

        if (AGENT_WEB_TYPES.has(String(data.type))) {
          this.handleAgentFromWeb(ws, meta, data);
        }
      } catch (error) {
        logger.error(`Message error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    ws.on("close", () => {
      this.removeClient(ws);
      logger.info("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      logger.error(`Socket error: ${error}`);
      this.removeClient(ws);
    });
  }
}
