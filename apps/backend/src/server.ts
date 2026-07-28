import { config as loadDotenv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server as HttpServer } from "node:http";
import type { AgentJobMessage, BridgeKind } from "@knitto/shared";
import { createLogger } from "./platforms/mcp-kit/core/index.js";
import { createApp } from "./app.js";
import { loadEnv, resolveHttpHost, resolveHttpPort } from "./config/env.js";
import { AgentRegistryService } from "./agents/agent-registry.service.js";
import { startEvidenceUploadFlusher } from "./infra/api-data/evidence-upload-flush.js";
import { WsHub } from "./infra/websocket/ws-hub.js";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: join(backendRoot, ".env") });

const logger = createLogger("server");

const LISTEN_RETRY_ATTEMPTS = 20;
const LISTEN_RETRY_DELAY_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listenHttpServer(
  httpServer: HttpServer,
  wsHub: WsHub,
  host: string,
  port: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      httpServer.off("error", onError);
      httpServer.off("listening", onListening);
    };

    const onError = (error: NodeJS.ErrnoException) => {
      cleanup();
      reject(error);
    };

    const onListening = () => {
      cleanup();
      resolve();
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    wsHub.onceListenError(onError);
    httpServer.listen(port, host);
  });
}

async function listenWithRetry(
  httpServer: HttpServer,
  wsHub: WsHub,
  host: string,
  port: number
): Promise<void> {
  for (let attempt = 1; attempt <= LISTEN_RETRY_ATTEMPTS; attempt++) {
    try {
      await listenHttpServer(httpServer, wsHub, host, port);
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "EADDRINUSE" && attempt < LISTEN_RETRY_ATTEMPTS) {
        logger.warn(
          `Port ${port} masih dipakai (watch restart?) — coba lagi ${attempt}/${LISTEN_RETRY_ATTEMPTS}…`
        );
        await sleep(LISTEN_RETRY_DELAY_MS);
        continue;
      }
      if (err.code === "EADDRINUSE") {
        throw new Error(
          `Port ${port} sudah dipakai — ubah BACKEND_PORT di apps/backend/.env atau hentikan proses yang memakai port tersebut`
        );
      }
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  const host = resolveHttpHost(env);
  const port = resolveHttpPort(env);

  let wsHub: WsHub;
  let httpServer: HttpServer;
  let shuttingDown = false;

  const bridgeRegistry = new AgentRegistryService(
    (msg: AgentJobMessage) => {
      wsHub.emitAgentJob(msg);
    },
    (bridgeId: string, bridgeKind: BridgeKind) => {
      wsHub.broadcastCredentialsRequest(bridgeId, bridgeKind);
    },
    (bridgeId: string, bridgeKind: BridgeKind, valid: boolean, message: string) => {
      wsHub.broadcastCredentialsStatus(bridgeId, bridgeKind, valid, message);
    },
    () => {
      wsHub.broadcastBridgeUpdates();
    }
  );

  const app = createApp(bridgeRegistry);
  httpServer = createServer(app);

  wsHub = new WsHub(httpServer, bridgeRegistry);

  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Shutting down (${signal})…`);
    wsHub.closeSync();
    httpServer.closeAllConnections?.();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 300).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  await listenWithRetry(httpServer, wsHub, host, port);
  logger.info(`Backend listening on http://${host}:${port} (WS: /ws)`);

  try {
    await bridgeRegistry.startAll();
    wsHub.broadcastBridgeUpdates();
    startEvidenceUploadFlusher();
  } catch (error) {
    logger.error(
      `Agent runtime startup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

main().catch((error) => {
  logger.error(error instanceof Error ? error : String(error));
  process.exit(1);
});
