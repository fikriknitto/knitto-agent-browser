import { APIError } from "openai";
import { OpenaiApiError } from "./retry.js";

export type OpenaiSdkErrorContext = {
  baseURL: string;
  model: string;
  operation?: string;
};

const SNIPPET_MAX = 200;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function pickSnippet(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > SNIPPET_MAX ? `${trimmed.slice(0, SNIPPET_MAX)}…` : trimmed;
}

function extractResponseSnippet(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;

  const record = err as Record<string, unknown>;
  const direct =
    pickSnippet(record.responseBody) ??
    pickSnippet(record.text) ??
    pickSnippet(record.body);
  if (direct) return direct;

  const response = record.response;
  if (response && typeof response === "object") {
    const responseRecord = response as Record<string, unknown>;
  const fromResponse =
      pickSnippet(responseRecord.body) ?? pickSnippet(responseRecord.text);
    if (fromResponse) return fromResponse;
  }

  if (record.cause) {
    const fromCause = extractResponseSnippet(record.cause);
    if (fromCause) return fromCause;
  }

  return undefined;
}

function extractStatus(err: unknown): number | undefined {
  if (err instanceof OpenaiApiError) return err.status;
  if (err instanceof APIError && typeof err.status === "number") return err.status;
  if (!err || typeof err !== "object") return undefined;

  const record = err as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;

  const response = record.response;
  if (response && typeof response === "object") {
    const status = (response as Record<string, unknown>).status;
    if (typeof status === "number") return status;
  }

  if (record.cause) return extractStatus(record.cause);
  return undefined;
}

function networkHint(message: string): string {
  if (
    message === "fetch failed" ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(message)
  ) {
    return " — pastikan endpoint OpenAI-compatible jalan dan Base URL benar (tanpa /v1). Jika backend di Docker, pakai http://host.docker.internal:<port> (bukan localhost).";
  }
  return "";
}

function prefix(ctx: OpenaiSdkErrorContext): string {
  const op = ctx.operation?.trim() || "chat";
  return `${op} gagal (model=${ctx.model}, baseUrl=${ctx.baseURL})`;
}

/**
 * Normalize AI SDK / fetch errors into actionable Indonesian messages.
 */
export function formatOpenaiSdkError(
  err: unknown,
  ctx: OpenaiSdkErrorContext
): Error {
  const message = errorMessage(err);
  const lower = message.toLowerCase();
  const snippet = extractResponseSnippet(err);
  const status = extractStatus(err);
  const head = prefix(ctx);

  if (lower.includes("invalid json response")) {
    const detail = snippet ? `: ${snippet}` : "";
    if (snippet && /event:\s*response\.|response\.completed/i.test(snippet)) {
      return new Error(
        `${head}: Provider mengembalikan SSE Responses API (bukan Chat Completions)${detail}. Restart backend terbaru — seharusnya sudah memakai endpoint /chat/completions.`
      );
    }
    return new Error(
      `${head}: Chat API mengembalikan respons non-JSON${detail}. Periksa Base URL (tanpa double /v1) dan model di provider.`
    );
  }

  if (status === 401 || status === 403 || /\b401\b/.test(message) || /\b403\b/.test(message)) {
    return new Error(`${head}: API key tidak valid atau ditolak provider.`);
  }

  if (
    status === 404 ||
    /\b404\b/.test(message) ||
    lower.includes("model not found") ||
    lower.includes("does not exist")
  ) {
    return new Error(
      `${head}: Model tidak dikenali di provider. Pilih model dari dropdown katalog.`
    );
  }

  if (networkHint(message)) {
    return new Error(`${head}: ${message}${networkHint(message)}`);
  }

  const suffix = snippet && !message.includes(snippet) ? ` — ${snippet}` : "";
  return new Error(`${head}: ${message}${suffix}`);
}
