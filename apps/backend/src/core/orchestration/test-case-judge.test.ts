import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APIError } from "openai";
import { judgeTestCaseOutcomeWithLlm, parseJudgeResponse } from "./test-case-judge.js";

const creds = { baseUrl: "http://localhost:9999", apiKey: "test-key" };

function chatResponse(content: string) {
  return {
    id: "chat-1",
    object: "chat.completion",
    created: 0,
    model: "gpt-test",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
        logprobs: null,
      },
    ],
  };
}

describe("parseJudgeResponse", () => {
  it("parses a clean JSON object", () => {
    const result = parseJudgeResponse('{"passed": true, "reason": "ok"}');
    assert.deepEqual(result, { passed: true, reason: "ok" });
  });

  it("extracts JSON even if wrapped in prose", () => {
    const result = parseJudgeResponse('Sure, here it is:\n{"passed": false, "reason": "field kosong"}\nThanks');
    assert.deepEqual(result, { passed: false, reason: "field kosong" });
  });

  it("returns null for unparseable/missing passed field", () => {
    assert.equal(parseJudgeResponse("not json at all"), null);
    assert.equal(parseJudgeResponse('{"reason": "no passed field"}'), null);
  });
});

describe("judgeTestCaseOutcomeWithLlm", () => {
  it("returns passed:true when the judge confirms success", async () => {
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil, masuk ke halaman home.",
        screenshotBase64: "ZmFrZS1zY3JlZW5zaG90",
      },
      {
        createChatCompletion: async () =>
          chatResponse('{"passed": true, "reason": "Halaman home terlihat, login berhasil"}'),
      }
    );
    assert.equal(result.passed, true);
    assert.match(result.reason, /berhasil/);
  });

  it("returns passed:false when the judge sees the field is still empty (the reported bug)", async () => {
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil.",
        screenshotBase64: "ZmFrZS1zY3JlZW5zaG90",
      },
      {
        createChatCompletion: async () =>
          chatResponse(
            '{"passed": false, "reason": "Field username dan password masih kosong, masih di halaman login"}'
          ),
      }
    );
    assert.equal(result.passed, false);
    assert.match(result.reason, /kosong/);
  });

  it("never defaults to passed:true when the judge call itself throws (fail-safe)", async () => {
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil.",
        // no screenshot -> no text-only retry path, fails straight to failSafe
      },
      {
        createChatCompletion: async () => {
          throw new APIError(401, undefined, "invalid api key", undefined);
        },
      }
    );
    assert.equal(result.passed, false);
    assert.match(result.reason, /Verifikasi otomatis gagal/);
  });

  it("retries text-only when the image-attached call fails, and can still pass", async () => {
    let calls = 0;
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil, masuk ke halaman home.",
        screenshotBase64: "ZmFrZS1zY3JlZW5zaG90",
      },
      {
        createChatCompletion: async (params) => {
          calls += 1;
          const content = params.messages[1]?.content;
          if (Array.isArray(content)) {
            // First attempt includes the image — simulate a model that
            // rejects vision content parts.
            throw new Error("this model does not support image inputs");
          }
          return chatResponse('{"passed": true, "reason": "text-only judge ok"}');
        },
      }
    );
    assert.equal(calls, 2);
    assert.equal(result.passed, true);
    assert.match(result.reason, /text-only/);
  });

  it("fails safe (never true) if both the image and text-only retry fail", async () => {
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil.",
        screenshotBase64: "ZmFrZS1zY3JlZW5zaG90",
      },
      {
        createChatCompletion: async () => {
          throw new Error("provider unreachable");
        },
      }
    );
    assert.equal(result.passed, false);
    assert.match(result.reason, /Verifikasi otomatis gagal/);
  });

  it("fails safe if the model returns unparseable output", async () => {
    const result = await judgeTestCaseOutcomeWithLlm(
      {
        creds,
        model: "gpt-test",
        instruction: "Login dengan akun lintang_it",
        agentSummary: "Login berhasil.",
      },
      {
        createChatCompletion: async () => chatResponse("I think it probably worked."),
      }
    );
    assert.equal(result.passed, false);
  });
});
