import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOpenaiChatModel } from "./resolve-chat-model.js";

describe("resolveOpenaiChatModel", () => {
  it("returns a language model using chat completions API", () => {
    const model = resolveOpenaiChatModel({
      model: "test-automation",
      apiKey: "key",
      baseURL: "http://localhost:20128/v1",
    });
    assert.ok(model);
    const record = model as { modelId?: string; provider?: string };
    assert.equal(record.modelId, "test-automation");
    assert.equal(record.provider, "openai.chat");
  });
});
