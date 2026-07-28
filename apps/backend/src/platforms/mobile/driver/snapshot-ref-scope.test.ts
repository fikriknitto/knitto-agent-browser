import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Browser } from "webdriverio";
import { setAutomationJobId } from "../job-context.js";
import { captureScreenSnapshot, getRefXpath } from "./snapshot.js";

function fakeDriver(xml: string): Browser {
  return {
    getPageSource: async () => xml,
    getCurrentPackage: async () => "com.example.app",
    getCurrentActivity: async () => ".MainActivity",
  } as unknown as Browser;
}

const ROOT_ONLY_EDITABLE_XML = `<hierarchy>
  <node class="android.widget.EditText" editable="true" clickable="true" enabled="true" bounds="[0,0][100,50]" />
</hierarchy>`;

const NESTED_EDITABLE_XML = `<hierarchy>
  <node class="android.widget.FrameLayout" clickable="false" enabled="true">
    <node class="android.widget.EditText" editable="true" clickable="true" enabled="true" bounds="[10,10][110,60]" />
  </node>
</hierarchy>`;

describe("snapshot ref scoping across concurrent mobile jobs", () => {
  it("resolves a ref to the correct job's element even after another job snapshots in between", async () => {
    setAutomationJobId("job-A");
    await captureScreenSnapshot(fakeDriver(ROOT_ONLY_EDITABLE_XML));

    // Job B snapshots next (in-process mobile client shares this module —
    // this simulates a second concurrent job interleaving a snapshot call).
    setAutomationJobId("job-B");
    await captureScreenSnapshot(fakeDriver(NESTED_EDITABLE_XML));

    // Back to job A: its ref must still resolve to job A's own element,
    // not job B's (the bug this test guards against: a single unscoped
    // module-level map would have been overwritten by job B's capture).
    setAutomationJobId("job-A");
    assert.equal(getRefXpath("e1"), "/hierarchy/*[1]");

    setAutomationJobId("job-B");
    assert.equal(getRefXpath("e1"), "/hierarchy/*[1]/*[1]");
  });
});
