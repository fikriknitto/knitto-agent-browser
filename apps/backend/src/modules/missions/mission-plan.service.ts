import { Agent } from "@cursor/sdk";
import type { BridgeKind } from "@knitto/shared";
import type { AgentRegistryService } from "../../agents/agent-registry.service.js";
import cursorConfig from "../../agents/cursor/config.js";
import type { OpenaiCredentials } from "../../agents/openai/config.js";
import { assertModelAvailable } from "../../agents/openai/model-catalog.js";
import { runOpenaiTextTurn } from "../../agents/openai/text-turn.js";
import {
  missionPlanResponseSchema,
  type MissionPlanItem,
  type MissionPlanRequest,
  type MissionPlanResponse,
} from "./mission-plan-schemas.js";

const PLAN_TIMEOUT_MS = 90_000;
const MAX_ITEMS = 5;

const SYSTEM_PROMPT = `You are a QA automation mission planner for Knitto Agent Automation.

Your job is NOT to execute automation. Your job is to turn a user intent into a short ordered checklist of todos/checkpoints that an AI browser/mobile agent will later execute after human approval.

Rules:
- Write titles and bodies in Bahasa Indonesia (clear, concise, actionable).
- Return ONLY valid JSON (no markdown fences, no commentary).
- Shape:
{
  "items": [
    {
      "kind": "todo" | "checkpoint",
      "title": string,
      "body": string,
      "requiresEvidence": boolean
    }
  ]
}
- 1 to ${MAX_ITEMS} items — jumlah item HARUS proporsional dengan kompleksitas intent, bukan target tetap.
- Kalau intent adalah satu aksi atomic (satu navigate + satu pencarian/interaksi + satu implicit outcome), hasilkan TEPAT 1 item — jangan pecah action dan verification jadi item terpisah kalau itu satu alur uji yang sama.
- Tambah item lain HANYA kalau intent benar-benar butuh langkah berurutan yang secara nyata berbeda (mis. login dulu baru checkout), atau user secara eksplisit meminta checkpoint terpisah.
- kind "todo" = a step the agent must perform.
- kind "checkpoint" = a verification step, dipakai HANYA kalau verifikasi itu bukan bagian tak terpisahkan dari todo sebelumnya; set requiresEvidence=true when a screenshot/video proof is useful.
- body = concrete instructions for the agent (URLs, UI targets, expected outcomes). Do not invent secrets; use placeholders like {username} if needed.
- Incorporate platform context and any named templates/attachments when provided.
- Do not include setup fluff like "buka browser" unless the intent requires it.`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Mission plan timed out")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function buildUserPrompt(body: MissionPlanRequest): string {
  const lines = [
    "Intent mission:",
    body.intentText.trim(),
    "",
    `Platform: ${body.platform ?? "browser"}`,
  ];
  if (body.promptBaseLabels?.length) {
    lines.push(
      "",
      "Template / prompt bases yang dipilih user:",
      ...body.promptBaseLabels.map((l) => `- ${l}`)
    );
  }
  if (body.attachmentNames?.length) {
    lines.push(
      "",
      "Lampiran:",
      ...body.attachmentNames.map((n) => `- ${n}`)
    );
  }
  lines.push(
    "",
    `Return JSON with 1–${MAX_ITEMS} items only.`
  );
  return lines.join("\n");
}

function stripOuterCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  return fenceMatch ? fenceMatch[1]!.trim() : trimmed;
}

function extractJsonObject(raw: string): string {
  const stripped = stripOuterCodeFence(raw);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return stripped.slice(start, end + 1);
  }
  return stripped;
}

function parsePlanItems(raw: string): MissionPlanItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new Error("Model tidak mengembalikan JSON plan yang valid.");
  }

  const result = missionPlanResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      result.error.errors[0]?.message ?? "Struktur plan items tidak valid."
    );
  }

  return result.data.items.slice(0, MAX_ITEMS).map((item) => ({
    kind: item.kind,
    title: item.title.trim(),
    body: item.body?.trim() || item.title.trim(),
    requiresEvidence:
      item.kind === "checkpoint" ? true : Boolean(item.requiresEvidence),
  }));
}

async function planWithOpenai(
  creds: OpenaiCredentials,
  model: string,
  userPrompt: string,
  cachedModelIds?: string[]
): Promise<string> {
  await assertModelAvailable(creds, model, { cachedModelIds });
  return runOpenaiTextTurn({
    creds,
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    timeoutMs: PLAN_TIMEOUT_MS,
  });
}

async function planWithCursor(model: string, userPrompt: string): Promise<string> {
  if (!cursorConfig.cursorApiKey) {
    throw new Error("Cursor API key belum tersedia — simpan di panel Agent credentials");
  }

  const agent = await Agent.create({
    apiKey: cursorConfig.cursorApiKey,
    model: { id: model },
    local: {
      cwd: cursorConfig.bridgeCwd,
      settingSources: [],
    },
  });

  const run = await agent.send(`${SYSTEM_PROMPT}\n\n${userPrompt}`, {
    model: { id: model },
  });

  const timeout = setTimeout(() => {
    void run.cancel().catch(() => undefined);
  }, PLAN_TIMEOUT_MS);

  try {
    for await (const _event of run.stream()) {
      // drain
    }
    const result = await run.wait();
    if (result.status === "error") {
      throw new Error("Cursor agent plan failed");
    }
    if (typeof result.result === "string") {
      return result.result.trim();
    }
    return JSON.stringify(result.result ?? "");
  } finally {
    clearTimeout(timeout);
  }
}

async function planByBridgeKind(
  bridgeRegistry: AgentRegistryService,
  bridgeId: string,
  kind: BridgeKind,
  model: string,
  userPrompt: string
): Promise<string> {
  switch (kind) {
    case "openai": {
      const openai = bridgeRegistry.getOpenai(bridgeId);
      if (!openai) {
        throw new Error(`OpenAI-compatible provider not found: ${bridgeId}`);
      }
      const cachedModelIds = openai.getInfo().models.map((entry) => entry.id);
      return planWithOpenai(openai.getCredentials(), model, userPrompt, cachedModelIds);
    }
    case "cursor":
      return planWithCursor(model, userPrompt);
    default:
      throw new Error(`Agent runtime tidak didukung: ${kind}`);
  }
}

export async function planMissionTodos(
  bridgeRegistry: AgentRegistryService,
  body: MissionPlanRequest
): Promise<MissionPlanResponse> {
  const runner = bridgeRegistry.get(body.bridgeId);
  if (!runner) {
    throw new Error(`Bridge not found: ${body.bridgeId}`);
  }

  const bridgeKind = runner.getInfo().bridgeKind;
  const userPrompt = buildUserPrompt(body);
  const raw = await withTimeout(
    planByBridgeKind(bridgeRegistry, body.bridgeId, bridgeKind, body.model, userPrompt),
    PLAN_TIMEOUT_MS
  );

  if (!raw) {
    throw new Error("Model returned empty plan");
  }

  const items = parsePlanItems(raw);
  if (!items.length) {
    throw new Error("Plan kosong — coba perjelas intent lalu Re-plan.");
  }

  return { items };
}
