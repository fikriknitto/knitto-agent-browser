import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Browser } from "webdriverio";
import { setAutomationJobId } from "../job-context.js";
import { captureScreenSnapshot, getRefXpath } from "./snapshot.js";

function fakeDriver(xml: string): Browser {
  return {
    getPageSource: async () => xml,
    getCurrentPackage: async () => "com.mobileknitto",
    getCurrentActivity: async () => ".MainActivity",
  } as unknown as Browser;
}

// Faithful miniature of REAL Appium UiAutomator2 getPageSource() output,
// captured live from a BlueStacks device running the com.mobileknitto login
// screen: tag name = CLASS name (not <node>), and there is NO `editable`
// attribute anywhere — editability is only implied by the EditText class.
const REAL_APPIUM_STYLE_XML = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy index="0" class="hierarchy" rotation="1" width="720" height="1280">
  <android.widget.FrameLayout index="0" package="com.mobileknitto" class="android.widget.FrameLayout" text="" clickable="false" enabled="true" bounds="[0,0][720,1280]" displayed="true">
    <android.widget.LinearLayout index="0" package="com.mobileknitto" class="android.widget.LinearLayout" text="" clickable="false" enabled="true" bounds="[0,0][720,1280]" displayed="true">
      <android.widget.EditText index="0" package="com.mobileknitto" class="android.widget.EditText" text="Username" clickable="true" enabled="true" focusable="true" password="false" bounds="[159,606][518,673]" displayed="true" hint="Username" input-type="16385" showing-hint="true" />
      <android.widget.TextView index="1" package="com.mobileknitto" class="android.widget.TextView" text="Forgot Password?" clickable="true" enabled="true" bounds="[418,790][586,820]" displayed="true" />
      <android.widget.EditText index="2" package="com.mobileknitto" class="android.widget.EditText" text="Password" clickable="true" enabled="true" focusable="true" password="true" bounds="[159,706][518,773]" displayed="true" hint="Password" input-type="129" showing-hint="true" />
      <android.widget.Button index="3" package="com.mobileknitto" class="android.widget.Button" text="Login" clickable="true" enabled="true" bounds="[135,840][585,905]" displayed="true" />
    </android.widget.LinearLayout>
  </android.widget.FrameLayout>
</hierarchy>`;

describe("snapshot parsing of real Appium UiAutomator2 XML (class-named tags)", () => {
  it("finds interactive elements in class-named-tag XML (was: always empty because only <node> children were walked)", async () => {
    setAutomationJobId("job-appium-format");
    const result = await captureScreenSnapshot(fakeDriver(REAL_APPIUM_STYLE_XML));

    // Regression guard: `walkNode` used to traverse children only via the
    // literal key `node`. Appium names tags after classes, so the tree was
    // never entered and every real-device snapshot returned zero elements —
    // the agent had no refs, looped on observe-only tools, and never typed.
    assert.equal(result.elements.length, 4, `expected 4 interactive elements, got ${result.elements.length}`);
  });

  it("derives editable=true from the EditText class (UiAutomator2 XML has no editable attribute)", async () => {
    setAutomationJobId("job-appium-format");
    const result = await captureScreenSnapshot(fakeDriver(REAL_APPIUM_STYLE_XML));

    const editables = result.elements.filter((e) => e.editable);
    assert.equal(editables.length, 2);
    assert.deepEqual(
      editables.map((e) => e.text),
      ["Username", "Password"]
    );
    assert.deepEqual(editables[0]?.bbox, { x: 159, y: 606, width: 359, height: 67 });

    const button = result.elements.find((e) => e.text === "Login");
    assert.ok(button, "Login button must be present");
    assert.equal(button?.editable, false);
    assert.equal(button?.clickable, true);
  });

  it("builds positional wildcard xpaths that respect document order across mixed sibling tags", async () => {
    setAutomationJobId("job-appium-format");
    const result = await captureScreenSnapshot(fakeDriver(REAL_APPIUM_STYLE_XML));

    // EditText(1), TextView, EditText(2), Button are DIFFERENT tag names —
    // the old grouped (non-preserveOrder) parse would have clumped same-name
    // siblings together and scrambled positional indices. Verify each ref's
    // xpath points at the element's true document position.
    const username = result.elements.find((e) => e.text === "Username");
    const forgot = result.elements.find((e) => e.text === "Forgot Password?");
    const password = result.elements.find((e) => e.text === "Password");
    const login = result.elements.find((e) => e.text === "Login");

    assert.equal(getRefXpath(username!.ref), "/hierarchy/*[1]/*[1]/*[1]");
    assert.equal(getRefXpath(forgot!.ref), "/hierarchy/*[1]/*[1]/*[2]");
    assert.equal(getRefXpath(password!.ref), "/hierarchy/*[1]/*[1]/*[3]");
    assert.equal(getRefXpath(login!.ref), "/hierarchy/*[1]/*[1]/*[4]");
  });

  it("interactiveOnly=false also returns non-interactive containers", async () => {
    setAutomationJobId("job-appium-format");
    const result = await captureScreenSnapshot(fakeDriver(REAL_APPIUM_STYLE_XML), {
      interactiveOnly: false,
    });
    // 2 containers + 4 interactive = 6
    assert.equal(result.elements.length, 6);
  });
});
