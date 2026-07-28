import type OpenAI from "openai";
import config, { type OpenaiCredentials } from "./config.js";
import {
  createOpenaiClient,
  openaiClientContext,
} from "./openai-client.js";
import { formatOpenaiSdkError } from "./sdk-error.js";
import { withOpenaiRetry } from "./retry.js";

export type RunOpenaiTextTurnInput = {
  creds: OpenaiCredentials;
  model: string;
  system: string;
  prompt: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type TextTurnDeps = {
  createChatCompletion: (
    params: {
      model: string;
      messages: Array<{ role: "system" | "user"; content: string }>;
    },
    options?: { signal?: AbortSignal }
  ) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
};

function defaultDeps(creds: OpenaiCredentials): TextTurnDeps {
  const client = createOpenaiClient(creds);
  return {
    createChatCompletion: (params, options) =>
      client.chat.completions.create(
        params as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        options
      ),
  };
}

function withOptionalTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`OpenAI text turn timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
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

function assertBaseUrl(creds: OpenaiCredentials): void {
  if (!creds.baseUrl.trim()) {
    throw new Error(
      "OpenAI-compatible belum dikonfigurasi — set Base URL di panel Agent credentials"
    );
  }
}

/**
 * Single-turn OpenAI-compatible text generation via official openai SDK.
 * Used by mission plan and prompt shortcut generate.
 */
export async function runOpenaiTextTurn(
  input: RunOpenaiTextTurnInput,
  deps?: TextTurnDeps
): Promise<string> {
  assertBaseUrl(input.creds);
  const resolvedDeps = deps ?? defaultDeps(input.creds);
  const ctx = { ...openaiClientContext(input.creds, input.model), operation: "chat" };

  try {
    const response = await withOptionalTimeout(
      withOpenaiRetry(
        () =>
          resolvedDeps.createChatCompletion(
            {
              model: input.model,
              messages: [
                { role: "system", content: input.system },
                { role: "user", content: input.prompt },
              ],
            },
            { signal: input.signal }
          ),
        {
          maxRetries: config.maxRetries,
          baseDelayMs: config.retryDelayMs,
          signal: input.signal,
        }
      ),
      input.timeoutMs
    );

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error("Model mengembalikan respons kosong.");
    }
    return text;
  } catch (err) {
    throw formatOpenaiSdkError(err, ctx);
  }
}
