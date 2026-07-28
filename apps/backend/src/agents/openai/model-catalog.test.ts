import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { assertModelAvailable } from "./model-catalog.js";

const creds = { baseUrl: "http://localhost:9999", apiKey: "test-key" };

describe("assertModelAvailable", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("passes when model is in cached ids without fetch", async () => {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response("{}", { status: 500 });
    };

    await assertModelAvailable(creds, "cached-model", {
      cachedModelIds: ["cached-model", "other"],
    });
    assert.equal(fetchCalls, 0);
  });

  it("throws when model is not in provider catalog", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [{ id: "real-model", object: "model" }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );

    await assert.rejects(
      () => assertModelAvailable(creds, "missing-model"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /missing-model/);
        assert.match(err.message, /tidak ada di katalog/i);
        return true;
      }
    );
  });

  it("passes when model exists in fetched catalog", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [{ id: "provider-model", object: "model" }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );

    await assertModelAvailable(creds, "provider-model");
  });
});
