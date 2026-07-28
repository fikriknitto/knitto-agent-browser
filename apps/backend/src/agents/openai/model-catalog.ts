import config, { openaiApiV1, type OpenaiCredentials } from "./config.js";
import { createOpenaiClient } from "./openai-client.js";

export interface ModelCatalogEntry {
  id: string;
  label: string;
  vision?: boolean;
}

export interface ModelCatalog {
  defaultModel: string;
  models: ModelCatalogEntry[];
}

/** OpenAI-compatible model list (GET {baseUrl}/v1/models, legacy /v1). */
export interface OpenaiModelsResponse {
  object?: string;
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
  }>;
}

const FALLBACK_MODELS: ModelCatalogEntry[] = [
  { id: "automation", label: "automation (combo)", vision: true },
];

export function fallbackModelCatalog(defaultModel?: string): ModelCatalog {
  const model = defaultModel?.trim() || FALLBACK_MODELS[0]!.id;
  const models = FALLBACK_MODELS.some((m) => m.id === model)
    ? FALLBACK_MODELS
    : [{ id: model, label: model, vision: true }, ...FALLBACK_MODELS];
  return { defaultModel: model, models };
}

/** Empty catalog when API fetch fails — avoids phantom `automation` models in the UI. */
export function emptyModelCatalog(): ModelCatalog {
  const preferred = config.modelId.trim();
  if (!preferred) {
    return { defaultModel: "", models: [] };
  }
  return {
    defaultModel: preferred,
    models: [{ id: preferred, label: preferred, vision: true }],
  };
}

function modelLabel(item: NonNullable<OpenaiModelsResponse["data"]>[number]): string {
  const id = typeof item.id === "string" ? item.id : "";
  if (item.owned_by && item.owned_by !== id) {
    return `${id} (${item.owned_by})`;
  }
  return id;
}

function parseModelsPayload(payload: unknown, sourceUrl: string): ModelCatalogEntry[] {
  if (!payload || typeof payload !== "object") {
    throw new Error(`OpenAI-compatible models response is not JSON object (${sourceUrl})`);
  }
  const data = (payload as OpenaiModelsResponse).data;
  if (!Array.isArray(data)) {
    throw new Error(`OpenAI-compatible models response missing data[] (${sourceUrl})`);
  }

  const models: ModelCatalogEntry[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id) continue;
    // LiteLLM / some proxies omit object:"model" — accept any row with an id.
    if (item.object != null && item.object !== "model") continue;
    models.push({
      id,
      label: modelLabel(item),
      vision: true,
    });
  }
  return models;
}

async function fetchModelsFromUrl(
  url: string,
  headers: Record<string, string>
): Promise<{ models: ModelCatalogEntry[]; status: number }> {
  const response = await fetch(url, { headers });
  const status = response.status;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const snippet = body.trim().slice(0, 200);
    throw new Error(
      snippet
        ? `GET ${url} → ${status}: ${snippet}`
        : `GET ${url} → ${status}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/json/i.test(contentType)) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GET ${url} → non-JSON (${contentType || "unknown"}): ${body.trim().slice(0, 120)}`
    );
  }

  const payload = (await response.json()) as unknown;
  return { models: parseModelsPayload(payload, url), status };
}

async function listModelsViaSdk(creds: OpenaiCredentials): Promise<ModelCatalogEntry[]> {
  const client = createOpenaiClient(creds);
  const page = await client.models.list();
  const models: ModelCatalogEntry[] = [];

  for (const item of page.data) {
    const id = item.id?.trim();
    if (!id) continue;
    models.push({
      id,
      label: item.owned_by && item.owned_by !== id ? `${id} (${item.owned_by})` : id,
      vision: true,
    });
  }

  return models;
}

async function fetchModelsLegacy(creds: OpenaiCredentials): Promise<ModelCatalogEntry[]> {
  const base = openaiApiV1(creds.baseUrl);
  const primary = `${base}/models`;
  const legacy = base;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (creds.apiKey) headers.Authorization = `Bearer ${creds.apiKey}`;

  try {
    const { models } = await fetchModelsFromUrl(primary, headers);
    return models;
  } catch (primaryError) {
    const primaryMsg =
      primaryError instanceof Error ? primaryError.message : String(primaryError);
    // Legacy 9Router-style list at /v1 (not /v1/models).
    try {
      const { models } = await fetchModelsFromUrl(legacy, headers);
      return models;
    } catch (legacyError) {
      const legacyMsg =
        legacyError instanceof Error ? legacyError.message : String(legacyError);
      throw new Error(
        `Tried ${primary} then ${legacy}. Primary: ${primaryMsg}. Legacy: ${legacyMsg}`
      );
    }
  }
}

async function fetchModels(creds: OpenaiCredentials): Promise<ModelCatalogEntry[]> {
  try {
    const models = await listModelsViaSdk(creds);
    if (models.length) return models;
  } catch {
    // Fall back to legacy fetch for proxies with non-standard model list paths.
  }
  return fetchModelsLegacy(creds);
}

export async function validateOpenaiCredentials(
  creds: OpenaiCredentials
): Promise<{ valid: boolean; message: string }> {
  const baseUrl = creds.baseUrl.trim();
  if (!baseUrl) {
    return { valid: false, message: "OpenAI-compatible base URL is empty" };
  }

  try {
    const models = await fetchModels(creds);
    if (!models.length) {
      return {
        valid: false,
        message: "Endpoint reachable but no models returned — check Base URL / API key",
      };
    }
    return { valid: true, message: "OpenAI-compatible credentials verified" };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Cannot reach OpenAI-compatible endpoint";
    const message =
      raw === "fetch failed" || /ECONNREFUSED|ENOTFOUND|network/i.test(raw)
        ? `${raw} — pastikan endpoint OpenAI-compatible (LiteLLM) jalan dan Base URL benar (tanpa /v1). Jika backend di Docker, pakai http://host.docker.internal:<port> (bukan localhost).`
        : raw;
    return {
      valid: false,
      message,
    };
  }
}

export async function assertModelAvailable(
  creds: OpenaiCredentials,
  model: string,
  opts?: { cachedModelIds?: string[] }
): Promise<void> {
  const trimmed = model.trim();
  if (!trimmed) {
    throw new Error("Model tidak boleh kosong.");
  }

  const cached = opts?.cachedModelIds?.map((id) => id.trim()).filter(Boolean);
  if (cached?.length && cached.includes(trimmed)) {
    return;
  }

  const models = await fetchModels(creds);
  if (!models.some((entry) => entry.id === trimmed)) {
    throw new Error(
      `Model "${trimmed}" tidak ada di katalog provider. Pilih model dari dropdown atau periksa Base URL/API key.`
    );
  }
}

export async function fetchModelCatalog(creds: OpenaiCredentials): Promise<ModelCatalog> {
  const preferred = config.modelId.trim();

  if (!creds.baseUrl.trim()) {
    return fallbackModelCatalog(preferred || undefined);
  }

  try {
    const models = await fetchModels(creds);
    if (!models.length) return emptyModelCatalog();

    const hasPreferred = preferred && models.some((m) => m.id === preferred);
    return {
      defaultModel: hasPreferred ? preferred : models[0]!.id,
      models,
    };
  } catch {
    return emptyModelCatalog();
  }
}
