import OpenAI from "openai";
import {
  normalizeOpenaiBaseUrl,
  openaiApiV1,
  type OpenaiCredentials,
} from "./config.js";

export type OpenaiClientContext = {
  baseURL: string;
  model: string;
};

/** Official OpenAI SDK client for LiteLLM / 9Router (chat.completions + models.list). */
export function createOpenaiClient(creds: OpenaiCredentials): OpenAI {
  const baseURL = openaiApiV1(normalizeOpenaiBaseUrl(creds.baseUrl));
  return new OpenAI({
    apiKey: creds.apiKey || "not-needed",
    baseURL,
    maxRetries: 0,
  });
}

export function openaiClientBaseUrl(creds: OpenaiCredentials): string {
  return openaiApiV1(normalizeOpenaiBaseUrl(creds.baseUrl));
}

export function openaiClientContext(
  creds: OpenaiCredentials,
  model: string
): OpenaiClientContext {
  return {
    baseURL: openaiClientBaseUrl(creds),
    model,
  };
}
