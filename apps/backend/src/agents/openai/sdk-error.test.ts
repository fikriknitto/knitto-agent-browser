import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APIError } from "openai";
import { OpenaiApiError } from "./retry.js";
import { formatOpenaiSdkError } from "./sdk-error.js";

const ctx = {
  baseURL: "http://localhost:9999/v1",
  model: "test-automation",
  operation: "chat",
};

describe("formatOpenaiSdkError", () => {
  it("maps Invalid JSON response with model and baseUrl", () => {
    const err = formatOpenaiSdkError(new Error("Invalid JSON response"), ctx);
    assert.match(err.message, /test-automation/);
    assert.match(err.message, /localhost:9999\/v1/);
    assert.match(err.message, /non-JSON/i);
  });

  it("maps 401 to API key message", () => {
    const err = formatOpenaiSdkError(new OpenaiApiError("Unauthorized", 401), ctx);
    assert.match(err.message, /API key tidak valid/i);
    assert.match(err.message, /test-automation/);
  });

  it("maps official OpenAI APIError 404 to model message", () => {
    const err = formatOpenaiSdkError(
      new APIError(404, undefined, "model not found", undefined),
      ctx
    );
    assert.match(err.message, /tidak dikenali/i);
    assert.match(err.message, /test-automation/);
  });

  it("maps fetch failed with network hint", () => {
    const err = formatOpenaiSdkError(new Error("fetch failed"), ctx);
    assert.match(err.message, /fetch failed/);
    assert.match(err.message, /host\.docker\.internal/i);
  });

  it("includes response body snippet when present", () => {
    const err = formatOpenaiSdkError(
      { message: "Bad Request", responseBody: "<html>gateway error</html>" },
      ctx
    );
    assert.match(err.message, /gateway error/);
  });
});
