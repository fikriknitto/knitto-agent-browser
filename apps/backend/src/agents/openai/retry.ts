import { APIError } from "openai";

const RETRYABLE_STATUS = new Set([408, 429, 502, 503]);

const RETRYABLE_MESSAGE_PATTERNS = [
  "rate limit",
  "quota",
  "too many requests",
  "overloaded",
  "capacity",
  "temporarily unavailable",
];

const NON_RETRYABLE_MESSAGE_PATTERNS = [
  "maximum context length",
  "context length exceeded",
  "context window",
  "token limit",
  "input is too long",
  "prompt is too long",
];

export class OpenaiApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenaiApiError";
    this.status = status;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isContextOverflowMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return NON_RETRYABLE_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function isRetryableOpenaiError(err: unknown): boolean {
  if (isAbortError(err)) return false;

  if (err instanceof OpenaiApiError) {
    if (isContextOverflowMessage(err.message)) return false;
    if (RETRYABLE_STATUS.has(err.status)) return true;
    if (err.status === 401 || err.status === 403 || err.status === 404) return false;
  }

  if (err instanceof APIError) {
    const status = err.status;
    if (typeof status === "number") {
      if (isContextOverflowMessage(err.message)) return false;
      if (RETRYABLE_STATUS.has(status)) return true;
      if (status === 401 || status === 403 || status === 404) return false;
      if (status >= 500) return true;
    }
  }

  const message = errorMessage(err).toLowerCase();
  if (isContextOverflowMessage(message)) return false;

  if (err instanceof OpenaiApiError && err.status >= 500) return true;

  if (RETRYABLE_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true;
  }

  if (
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("network")
  ) {
    return true;
  }

  return false;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type RetryCallback = (
  attempt: number,
  maxRetries: number,
  delayMs: number,
  error: unknown
) => void;

export async function withOpenaiRetry<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries: number;
    baseDelayMs: number;
    signal?: AbortSignal;
    onRetry?: RetryCallback;
  }
): Promise<T> {
  const maxRetries = Math.max(0, opts.maxRetries);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isAbortError(error) || !isRetryableOpenaiError(error) || attempt >= maxRetries) {
        throw error;
      }

      const delayMs = opts.baseDelayMs * 2 ** attempt;
      opts.onRetry?.(attempt + 1, maxRetries, delayMs, error);
      await sleep(delayMs, opts.signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
