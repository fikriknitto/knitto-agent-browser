import type {
  AgentJobCancelMessage,
  BridgeInfo,
  BridgeModelOption,
  UserPromptMessage,
} from "@knitto/shared";
import { createLogger } from "../platforms/mcp-kit/core/index.js";
import { browserHeadedFromEnv } from "../core/evidence/browser-env.js";
import { JobQueue } from "../core/orchestration/queue.js";
import { createStartBridgeJob } from "./openai/agent-runner.js";
import {
  emptyModelCatalog,
  fallbackModelCatalog,
  fetchModelCatalog,
  validateOpenaiCredentials,
  type ModelCatalog,
} from "./openai/model-catalog.js";
import config, { type OpenaiCredentials } from "./openai/config.js";
import type {
  AgentRuntime,
  ConfigChanged,
  CredentialsRequest,
  CredentialsStatusEmitter,
  JobBroadcast,
} from "./agent-runtime.interface.js";

const logger = createLogger("openai-agent");

function catalogSignature(catalog: ModelCatalog): string {
  return `${catalog.defaultModel}|${catalog.models.map((m) => m.id).join(",")}`;
}

function credentialKey(creds: OpenaiCredentials): string {
  return `${creds.baseUrl}|${creds.apiKey}`;
}

function parseCredentials(data: Record<string, unknown>): {
  creds: OpenaiCredentials;
  name?: string;
} | null {
  const nested = data.openai;
  if (!nested || typeof nested !== "object") return null;
  const record = nested as Record<string, unknown>;
  const baseUrl = typeof record.baseUrl === "string" ? record.baseUrl.trim() : "";
  if (!baseUrl) return null;
  const name = typeof record.name === "string" ? record.name.trim() : undefined;
  return {
    creds: {
      baseUrl,
      apiKey: typeof record.apiKey === "string" ? record.apiKey.trim() : "",
    },
    name,
  };
}

/** OpenAI-compatible runtime (knitto-agent). One instance per named provider. */
export class OpenaiAgentService implements AgentRuntime {
  private readonly queue: JobQueue;
  private lastAppliedCredentials: string | null = null;
  private lastCredentialsStatus: { valid: boolean; message: string } | null = null;
  private lastConfigSignature: string | null = null;
  private defaultModel = config.modelId;
  private models: BridgeModelOption[] = [];
  private browserHeaded = browserHeadedFromEnv();
  private credentials: OpenaiCredentials = { baseUrl: "", apiKey: "" };

  constructor(
    readonly bridgeId: string,
    private displayName: string,
    private readonly emitJob: JobBroadcast,
    private readonly requestCredentials: CredentialsRequest,
    private readonly emitCredentialsStatus: CredentialsStatusEmitter,
    private readonly onConfigChanged: ConfigChanged
  ) {
    const startJob = createStartBridgeJob(() => this.credentials);
    this.queue = new JobQueue(
      (msg) => this.emitJob({ ...msg, bridgeId: this.bridgeId }),
      config.maxConcurrentPerChannel,
      startJob
    );
  }

  setDisplayName(name: string): void {
    const trimmed = name.trim() || "OpenAI-compatible";
    if (trimmed === this.displayName) return;
    this.displayName = trimmed;
    this.onConfigChanged();
  }

  getCredentials(): OpenaiCredentials {
    return this.credentials;
  }

  getInfo(): BridgeInfo {
    return {
      bridgeId: this.bridgeId,
      bridgeKind: "openai",
      bridgeLabel: `${this.displayName} (OpenAI-compatible)`,
      defaultModel: this.defaultModel,
      models: this.models,
      browserHeaded: this.browserHeaded,
    };
  }

  async start(): Promise<void> {
    this.requestCredentials(this.bridgeId, "openai");
    this.publishConfig(fallbackModelCatalog(config.modelId || undefined));
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

    const parsed = parseCredentials(data);
    if (!parsed) return;

    if (parsed.name) {
      this.setDisplayName(parsed.name);
    }

    void this.applyCredentials(parsed.creds);
  }

  private async applyCredentials(creds: OpenaiCredentials): Promise<void> {
    const key = credentialKey(creds);
    if (key === this.lastAppliedCredentials && credentialKey(this.credentials) === key) {
      if (this.lastCredentialsStatus) {
        this.emitCredentialsStatus(
          this.bridgeId,
          "openai",
          this.lastCredentialsStatus.valid,
          this.lastCredentialsStatus.message
        );
      }
      return;
    }

    const { valid, message } = await validateOpenaiCredentials(creds);

    this.credentials = creds;
    this.lastCredentialsStatus = { valid, message };

    if (valid) {
      this.lastAppliedCredentials = key;
      logger.info(`OpenAI-compatible credentials verified (${this.bridgeId})`);
      await this.publishFromApi();
    } else {
      this.lastAppliedCredentials = null;
      logger.warn(
        `OpenAI-compatible credentials rejected (${this.bridgeId}): ${message}`
      );
      this.publishConfig(fallbackModelCatalog(config.modelId || undefined));
    }

    this.emitCredentialsStatus(this.bridgeId, "openai", valid, message);
  }

  private async publishFromApi(): Promise<void> {
    const creds = this.credentials;
    if (!creds.baseUrl.trim()) return;
    try {
      const catalog = await fetchModelCatalog(creds);
      this.publishConfig(catalog);
      if (!catalog.models.length && this.lastCredentialsStatus?.valid) {
        this.emitCredentialsStatus(
          this.bridgeId,
          "openai",
          true,
          "Katalog model gagal dimuat — cek Base URL"
        );
      }
    } catch (error) {
      logger.warn(
        `OpenAI-compatible model catalog fetch failed (${this.bridgeId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.publishConfig(emptyModelCatalog());
      if (this.lastCredentialsStatus?.valid) {
        this.emitCredentialsStatus(
          this.bridgeId,
          "openai",
          true,
          "Katalog model gagal dimuat — cek Base URL"
        );
      }
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
    logger.info(
      `Published OpenAI-compatible config (${this.bridgeId}, ${catalog.models.length} models)`
    );
  }
}
