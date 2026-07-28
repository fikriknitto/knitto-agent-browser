import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Browser } from "webdriverio";
import { setAutomationJobId } from "../job-context.js";
import { captureScreenSnapshot } from "./snapshot.js";

function fakeDriver(xml: string): Browser {
  return {
    getPageSource: async () => xml,
    getCurrentPackage: async () => "com.example.app",
    getCurrentActivity: async () => ".MainActivity",
  } as unknown as Browser;
}

const LOGIN_SCREEN_XML = `<hierarchy>
  <node class="android.widget.FrameLayout" clickable="false" enabled="true" bounds="[0,0][1080,1920]">
    <node class="android.widget.EditText" text="" resource-id="com.example.app:id/username" content-desc="Username" clickable="true" editable="true" enabled="true" bounds="[100,300][980,380]" />
    <node class="android.widget.EditText" text="" resource-id="com.example.app:id/password" content-desc="Password" clickable="true" editable="true" enabled="true" bounds="[100,420][980,500]" />
    <node class="android.widget.Button" text="Login" resource-id="com.example.app:id/loginBtn" clickable="true" editable="false" enabled="true" bounds="[100,540][980,620]" />
  </node>
</hierarchy>`;

describe("snapshot attribute parsing", () => {
  it("reports EditText/Button nodes as interactive (clickable/editable), not an empty list", async () => {
    setAutomationJobId("job-attrs-test");
    const result = await captureScreenSnapshot(fakeDriver(LOGIN_SCREEN_XML));

    // Regression guard: a prior fast-xml-parser config mismatch (flat
    // "@_class" keys vs the code's `node["@_"]` grouped-object read) made
    // every clickable/editable check silently miss, so snapshots always
    // came back with zero interactive elements — the agent then had no ref
    // for the login fields and fell back to guessing raw tap coordinates.
    assert.equal(result.elements.length, 3, "expected 3 interactive elements, got 0 means attrs are not parsed");

    const username = result.elements.find((e) => e.resourceId?.endsWith("username"));
    assert.ok(username, "username field must be present in the snapshot");
    assert.equal(username?.editable, true);
    assert.equal(username?.clickable, true);
    assert.deepEqual(username?.bbox, { x: 100, y: 300, width: 880, height: 80 });

    const loginBtn = result.elements.find((e) => e.resourceId?.endsWith("loginBtn"));
    assert.ok(loginBtn, "login button must be present in the snapshot");
    assert.equal(loginBtn?.clickable, true);
    assert.equal(loginBtn?.text, "Login");
  });
});
