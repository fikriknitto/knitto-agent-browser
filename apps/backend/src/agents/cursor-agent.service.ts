import type {
  AgentJobCancelMessage,
  BridgeInfo,
  BridgeModelOption,
  UserPromptMessage,
} from "@knitto/shared";
import { createLogger } from "../platforms/mcp-kit/core/index.js";
import { browserHeadedFromEnv } from "../core/evidence/browser-env.js";
import { JobQueue } from "../core/orchestration/queue.js";
import { startBridgeJob } from "./cursor/agent-runner.js";
import config, { setCursorApiKey } from "./cursor/config.js";
import {
  fallbackModelCatalog,
  fetchModelCatalog,
  validateCursorApiKey,
  type ModelCatalog,
} from "./cursor/model-catalog.js";
import type {
  AgentRuntime,
  ConfigChanged,
  CredentialsRequest,
  CredentialsStatusEmitter,
  JobBroadcast,
} from "./agent-runtime.interface.js";

const logger = createLogger("cursor-agent");

function catalogSignature(catalog: ModelCatalog): string {
  return `${catalog.defaultModel}|${catalog.models.map((m) => m.id).join(",")}`;
}

export class CursorAgentService implements AgentRuntime {
  private readonly queue: JobQueue;
  private lastAppliedApiKey: string | null = null;
  private lastCredentialsStatus: { valid: boolean; message: string } | null = null;
  private lastConfigSignature: string | null = null;
  private defaultModel = config.modelId;
  private models: BridgeModelOption[] = [];
  private browserHeaded = browserHeadedFromEnv();

  constructor(
    readonly bridgeId: string,
    private readonly emitJob: JobBroadcast,
    private readonly requestCredentials: CredentialsRequest,
    private readonly emitCredentialsStatus: CredentialsStatusEmitter,
    private readonly onConfigChanged: ConfigChanged
  ) {
    this.queue = new JobQueue(
      (msg) => this.emitJob({ ...msg, bridgeId: this.bridgeId }),
      config.maxConcurrentPerChannel,
      startBridgeJob
    );
  }

  getInfo(): BridgeInfo {
    return {
      bridgeId: this.bridgeId,
      bridgeKind: "cursor",
      bridgeLabel: "Cursor",
      defaultModel: this.defaultModel,
      models: this.models,
      browserHeaded: this.browserHeaded,
    };
  }

  async start(): Promise<void> {
    this.requestCredentials(this.bridgeId, "cursor");
    this.publishConfig(fallbackModelCatalog(config.modelId));
  }

  handleUserPrompt(msg: UserPromptMessage): void {
    this.queue.enqueueFromMessage(msg);
  }

  handleJobCancel(msg: AgentJobCancelMessage): void {
    void this.queue.cancel(msg.id, msg.channel);
  }

  handleCredentials(data: Record<string, unknown>): void {
    const bridgeId = typeof data.bridgeId === "string" ? data.bridgeId : null;
    if (bridgeId && bridgeId !== this.bridgeId) return;

    const apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
    if (!apiKey) return;

    void this.applyCredentials(apiKey);
  }

  private async applyCredentials(apiKey: string): Promise<void> {
    if (apiKey === this.lastAppliedApiKey && config.cursorApiKey === apiKey) {
      if (this.lastCredentialsStatus) {
        this.emitCredentialsStatus(
          this.bridgeId,
          "cursor",
          this.lastCredentialsStatus.valid,
          this.lastCredentialsStatus.message
        );
      }
      return;
    }

    const { valid, message } = await validateCursorApiKey(apiKey);

    // Keep user-supplied key even if verify fails (avoid forced re-entry).
    setCursorApiKey(apiKey);
    this.lastCredentialsStatus = { valid, message };

    if (valid) {
      this.lastAppliedApiKey = apiKey;
      logger.info("Cursor API key verified");
      await this.publishFromApi();
    } else {
      this.lastAppliedApiKey = null;
      logger.warn(`Cursor API key rejected: ${message}`);
      this.publishConfig(fallbackModelCatalog(config.modelId));
    }

    this.emitCredentialsStatus(this.bridgeId, "cursor", valid, message);
  }

  private async publishFromApi(): Promise<void> {
    this.publishConfig(fallbackModelCatalog(config.modelId));
    if (!config.cursorApiKey) return;
    try {
      const catalog = await fetchModelCatalog(config.cursorApiKey);
      this.publishConfig(catalog);
    } catch (error) {
      logger.warn(
        `Cursor model catalog fetch failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private publishConfig(catalog: ModelCatalog): void {
    const signature = catalogSignature(catalog);
    if (signature === this.lastConfigSignature) return;
    this.lastConfigSignature = signature;
    this.defaultModel = catalog.defaultModel;
    this.models = catalog.models;
    this.browserHeaded = browserHeadedFromEnv();
    this.onConfigChanged();
    logger.info(`Published Cursor config (${catalog.models.length} models)`);
  }
}
