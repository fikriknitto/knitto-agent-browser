import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOpenaiClient,
  openaiClientBaseUrl,
  openaiClientContext,
} from "./openai-client.js";

describe("createOpenaiClient", () => {
  it("normalizes base URL to /v1 for the official SDK", () => {
    const creds = { baseUrl: "http://192.168.20.15:4000/v1/", apiKey: "sk-test" };
    assert.equal(openaiClientBaseUrl(creds), "http://192.168.20.15:4000/v1");

    const client = createOpenaiClient(creds);
    assert.equal(client.baseURL, "http://192.168.20.15:4000/v1");
  });

  it("builds error context with model", () => {
    const ctx = openaiClientContext(
      { baseUrl: "http://192.168.20.15:4000", apiKey: "" },
      "aimurah/claude-sonnet-4.6"
    );
    assert.equal(ctx.baseURL, "http://192.168.20.15:4000/v1");
    assert.equal(ctx.model, "aimurah/claude-sonnet-4.6");
  });
});
