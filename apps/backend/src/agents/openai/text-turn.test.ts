import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APIError } from "openai";
import { runOpenaiTextTurn } from "./text-turn.js";

const creds = { baseUrl: "http://localhost:9999", apiKey: "test-key" };

describe("runOpenaiTextTurn", () => {
  it("returns trimmed text from chat.completions.create", async () => {
    let calls = 0;
    const text = await runOpenaiTextTurn(
      {
        creds,
        model: "gpt-test",
        system: "sys",
        prompt: "user",
      },
      {
        createChatCompletion: async () => {
          calls += 1;
          return {
            id: "chat-1",
            object: "chat.completion",
            created: 0,
            model: "gpt-test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "  hello plan  " },
                finish_reason: "stop",
                logprobs: null,
              },
            ],
          };
        },
      }
    );
    assert.equal(text, "hello plan");
    assert.equal(calls, 1);
  });

  it("retries on retryable 429 then succeeds", async () => {
    let calls = 0;
    const text = await runOpenaiTextTurn(
      {
        creds,
        model: "gpt-test",
        system: "sys",
        prompt: "user",
      },
      {
        createChatCompletion: async () => {
          calls += 1;
          if (calls === 1) {
            throw new APIError(429, undefined, "rate limit", undefined);
          }
          return {
            id: "chat-2",
            object: "chat.completion",
            created: 0,
            model: "gpt-test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop",
                logprobs: null,
              },
            ],
          };
        },
      }
    );
    assert.equal(text, "ok");
    assert.equal(calls, 2);
  });

  it("formats APIError with model and baseUrl", async () => {
    await assert.rejects(
      () =>
        runOpenaiTextTurn(
          {
            creds,
            model: "bad-model",
            system: "sys",
            prompt: "user",
          },
          {
            createChatCompletion: async () => {
              throw new APIError(404, undefined, "model not found", undefined);
            },
          }
        ),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /bad-model/);
        assert.match(err.message, /localhost:9999\/v1/);
        assert.match(err.message, /tidak dikenali/i);
        return true;
      }
    );
  });
});
