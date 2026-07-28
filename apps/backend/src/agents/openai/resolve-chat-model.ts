import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * OpenAI-compatible proxies (9Router, LiteLLM) expect `/v1/chat/completions`.
 * `createOpenAI()(model)` defaults to Responses API (`/v1/responses`) in @ai-sdk/openai v3,
 * which breaks non-streaming generateText when the proxy returns SSE.
 */
export function resolveOpenaiChatModel(opts: {
  model: string;
  apiKey?: string;
  baseURL: string;
}): LanguageModel {
  const openai = createOpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL,
  });
  return openai.chat(opts.model);
}
