import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVideoFilterChain } from "./video-filter.js";

describe("buildVideoFilterChain", () => {
  it("includes mpdecimate and setpts when trim idle and speed > 1", () => {
    const chain = buildVideoFilterChain({ speed: 2, trimIdle: true });
    assert.match(chain, /mpdecimate/);
    assert.match(chain, /setpts=0\.5\*PTS/);
  });

  it("omits mpdecimate when trim idle disabled", () => {
    const chain = buildVideoFilterChain({ speed: 2, trimIdle: false });
    assert.doesNotMatch(chain, /mpdecimate/);
    assert.equal(chain, "setpts=0.5*PTS");
  });

  it("returns empty when speed is 1 and trim idle disabled", () => {
    assert.equal(buildVideoFilterChain({ speed: 1, trimIdle: false }), "");
  });

  it("returns only mpdecimate when speed is 1 and trim idle enabled", () => {
    assert.equal(
      buildVideoFilterChain({ speed: 1, trimIdle: true }),
      "mpdecimate=hi=64*12:lo=64*5:frac=0.33"
    );
  });
});
