import { Agent } from "@cursor/sdk";
import type { BridgeKind } from "@knitto/shared";
import type { GeneratePromptShortcutBody } from "./prompt-shortcut-schemas.js";
import type { AgentRegistryService } from "../../agents/agent-registry.service.js";
import cursorConfig from "../../agents/cursor/config.js";
import type { OpenaiCredentials } from "../../agents/openai/config.js";
import { assertModelAvailable } from "../../agents/openai/model-catalog.js";
import { runOpenaiTextTurn } from "../../agents/openai/text-turn.js";

const GENERATE_TIMEOUT_MS = 60_000;

export type GeneratePromptShortcutResult = {
  template: string;
  defaults?: Record<string, string>;
  label?: string;
};

const SYSTEM_PROMPT = `You are a Senior Browser Automation Prompt Engineer with extensive experience in designing reusable prompt templates for AI-powered browser automation agents.

Your responsibility is to create high-quality, reusable, and maintainable browser automation prompt templates.

Your goal is NOT to execute browser automation.

Your goal is to generate prompt templates that can later be completed by users by simply filling variable values.

# Responsibilities

When a user describes an automation scenario, you must generate a reusable prompt template.
The generated template should:

- be written entirely in Bahasa Indonesia (formal, clear, concise)
- be clean and easy to understand
- be reusable
- avoid hardcoded values
- identify only the variables actually needed
- separate variables from automation logic
- follow browser automation best practices
- be optimized for AI browser agents

# Workflow
For every request, follow this workflow.

## Step 1
Understand the user's automation goal.

Determine:

- what the browser should do
- what information is required
- what validations are required
- what outputs should be generated

## Step 2
Identify every variable required by the scenario.
Only include variables that are actually needed.
Do NOT invent unnecessary variables.

Examples:
Login
- url
- username
- password

Search Product
- url
- keyword

Upload File
- url
- username
- password
- upload_file

Checkout
- url
- username
- password
- product_name
- quantity
- payment_method

Generate the browser automation scenario.
Always use placeholders.

Example (Bahasa Indonesia — placeholder names stay snake_case in English)
1. Buka {url}
2. Tunggu hingga halaman selesai dimuat.
3. Isi {username}.
4. Isi {password}.
5. Klik Login.
6. Verifikasi dashboard ditampilkan.
Never replace placeholders with actual values.

# Output format
Return ONLY the numbered automation template in Bahasa Indonesia, using snake_case placeholders like {url} and {username}.
Do not wrap the template in markdown code fences.
Do not execute browser automation.`;

function buildUserPrompt(brief: string, label?: string): string {
  const lines = [
    "Skenario automation (jawab template dalam Bahasa Indonesia):",
    brief.trim(),
  ];
  if (label?.trim()) {
    lines.push("", `Label shortcut yang disarankan: ${label.trim()}`);
  }
  return lines.join("\n");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI generate timed out")), ms);
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

function extractPlaceholders(template: string): Record<string, string> {
  const defaults: Record<string, string> = {};
  const matches = template.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
  for (const match of matches) {
    const key = match[1]!;
    if (!(key in defaults)) defaults[key] = "";
  }
  return defaults;
}

function stripOuterCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|text|plaintext)?\s*([\s\S]*?)```\s*$/i);
  return fenceMatch ? fenceMatch[1]!.trim() : trimmed;
}

function parseGeneratedText(raw: string): GeneratePromptShortcutResult {
  const trimmed = stripOuterCodeFence(raw.trim());
  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)```\s*$/i);

  if (jsonFence) {
    const template = stripOuterCodeFence(trimmed.slice(0, jsonFence.index).trim());
    try {
      const parsed = JSON.parse(jsonFence[1]!) as {
        defaults?: Record<string, string>;
        label?: string;
      };
      const defaults =
        parsed.defaults && typeof parsed.defaults === "object"
          ? parsed.defaults
          : extractPlaceholders(template);
      return {
        template: template || trimmed,
        defaults: Object.keys(defaults).length ? defaults : undefined,
        label: typeof parsed.label === "string" ? parsed.label : undefined,
      };
    } catch {
      return {
        template: template || trimmed,
        defaults: (() => {
          const d = extractPlaceholders(template || trimmed);
          return Object.keys(d).length ? d : undefined;
        })(),
      };
    }
  }

  const template = trimmed;
  const defaults = extractPlaceholders(template);
  return {
    template,
    defaults: Object.keys(defaults).length ? defaults : undefined,
  };
}

async function generateWithOpenai(
  creds: OpenaiCredentials,
  model: string,
  brief: string,
  label?: string,
  cachedModelIds?: string[]
): Promise<string> {
  await assertModelAvailable(creds, model, { cachedModelIds });
  return runOpenaiTextTurn({
    creds,
    model,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(brief, label),
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

async function generateWithCursor(model: string, brief: string, label?: string): Promise<string> {
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

  const run = await agent.send(`${SYSTEM_PROMPT}\n\n${buildUserPrompt(brief, label)}`, {
    model: { id: model },
  });

  const timeout = setTimeout(() => {
    void run.cancel().catch(() => undefined);
  }, GENERATE_TIMEOUT_MS);

  try {
    for await (const _event of run.stream()) {
      // drain stream
    }
    const result = await run.wait();
    if (result.status === "error") {
      throw new Error("Cursor agent run failed");
    }
    if (typeof result.result === "string") {
      return result.result.trim();
    }
    return JSON.stringify(result.result ?? "");
  } finally {
    clearTimeout(timeout);
  }
}

async function generateByBridgeKind(
  bridgeRegistry: AgentRegistryService,
  bridgeId: string,
  kind: BridgeKind,
  model: string,
  brief: string,
  label?: string
): Promise<string> {
  switch (kind) {
    case "openai": {
      const openai = bridgeRegistry.getOpenai(bridgeId);
      if (!openai) {
        throw new Error(`OpenAI-compatible provider not found: ${bridgeId}`);
      }
      const cachedModelIds = openai.getInfo().models.map((entry) => entry.id);
      return generateWithOpenai(
        openai.getCredentials(),
        model,
        brief,
        label,
        cachedModelIds
      );
    }
    case "cursor":
      return generateWithCursor(model, brief, label);
    default:
      throw new Error(`Agent runtime tidak didukung: ${kind}`);
  }
}

export async function generatePromptShortcutTemplate(
  bridgeRegistry: AgentRegistryService,
  body: GeneratePromptShortcutBody
): Promise<GeneratePromptShortcutResult> {
  const runner = bridgeRegistry.get(body.bridgeId);
  if (!runner) {
    throw new Error(`Bridge not found: ${body.bridgeId}`);
  }

  const bridgeKind = runner.getInfo().bridgeKind;
  const raw = await withTimeout(
    generateByBridgeKind(
      bridgeRegistry,
      body.bridgeId,
      bridgeKind,
      body.model,
      body.brief,
      body.label
    ),
    GENERATE_TIMEOUT_MS
  );

  if (!raw) {
    throw new Error("Model returned empty response");
  }

  return parseGeneratedText(raw);
}
