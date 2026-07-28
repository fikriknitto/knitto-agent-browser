import { randomBytes } from "node:crypto";
import type { BridgeKind, BridgeInfo } from "@knitto/shared";
import { createLogger } from "../platforms/mcp-kit/core/index.js";
import { CursorAgentService } from "./cursor-agent.service.js";
import { OpenaiAgentService } from "./openai-agent.service.js";
import type {
  AgentRuntime,
  ConfigChanged,
  CredentialsRequest,
  CredentialsStatusEmitter,
  JobBroadcast,
} from "./agent-runtime.interface.js";

const logger = createLogger("agent-registry");

const AGENT_LABELS: Record<BridgeKind, string> = {
  cursor: "Cursor",
  openai: "OpenAI-compatible",
};

function createAgentId(kind: BridgeKind): string {
  return `${kind}-${randomBytes(4).toString("hex")}`;
}

export type OpenaiProviderRef = {
  id: string;
  name: string;
};

export class AgentRegistryService {
  private readonly runners = new Map<string, AgentRuntime>();

  constructor(
    private readonly emitJob: JobBroadcast,
    private readonly requestCredentials: CredentialsRequest,
    private readonly emitCredentialsStatus: CredentialsStatusEmitter,
    private readonly onConfigChanged: ConfigChanged
  ) {}

  async startAll(): Promise<void> {
    const bridgeId = createAgentId("cursor");
    const runner = new CursorAgentService(
      bridgeId,
      this.emitJob,
      this.requestCredentials,
      this.emitCredentialsStatus,
      this.onConfigChanged
    );
    this.runners.set(bridgeId, runner);
    logger.info(`Starting agent runtime ${bridgeId} (${AGENT_LABELS.cursor})`);
    await runner.start();
  }

  upsertOpenaiProvider(bridgeId: string, displayName: string): OpenaiAgentService {
    const existing = this.runners.get(bridgeId);
    if (existing instanceof OpenaiAgentService) {
      existing.setDisplayName(displayName);
      return existing;
    }

    const runner = new OpenaiAgentService(
      bridgeId,
      displayName,
      this.emitJob,
      this.requestCredentials,
      this.emitCredentialsStatus,
      this.onConfigChanged
    );
    this.runners.set(bridgeId, runner);
    logger.info(`Registered OpenAI-compatible provider ${bridgeId} (${displayName})`);
    void runner.start();
    return runner;
  }

  removeOpenaiProvider(bridgeId: string): void {
    const runner = this.runners.get(bridgeId);
    if (!(runner instanceof OpenaiAgentService)) return;
    this.runners.delete(bridgeId);
    logger.info(`Removed OpenAI-compatible provider ${bridgeId}`);
  }

  syncOpenaiProviders(providers: OpenaiProviderRef[]): void {
    const nextIds = new Set(providers.map((p) => p.id));
    for (const provider of providers) {
      this.upsertOpenaiProvider(provider.id, provider.name.trim() || "OpenAI-compatible");
    }
    for (const [bridgeId, runner] of this.runners) {
      if (runner instanceof OpenaiAgentService && !nextIds.has(bridgeId)) {
        this.removeOpenaiProvider(bridgeId);
      }
    }
  }

  get(bridgeId: string): AgentRuntime | undefined {
    return this.runners.get(bridgeId);
  }

  getOpenai(bridgeId: string): OpenaiAgentService | undefined {
    const runner = this.runners.get(bridgeId);
    return runner instanceof OpenaiAgentService ? runner : undefined;
  }

  getAll(): BridgeInfo[] {
    return [...this.runners.values()].map((r) => r.getInfo());
  }

  isAvailable(): boolean {
    return this.runners.size > 0;
  }

  findByKind(kind: BridgeKind): AgentRuntime | undefined {
    return [...this.runners.values()].find((r) => r.getInfo().bridgeKind === kind);
  }
}
