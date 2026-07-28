import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchBrowserPrecondition } from "./match-precondition.js";

describe("match-precondition", () => {
  it("returns match when all mustHave rules are present", () => {
    const status = matchBrowserPrecondition(
      {
        version: 1,
        platform: "browser",
        precondition: {
          urlIncludes: "/login",
          mustHave: [
            { role: "textbox", name: "Email" },
            { role: "button", name: "Login" },
          ],
        },
        variables: [],
        steps: [{ tool: "browser_click", args: {} }],
      },
      {
        url: "https://example.com/login",
        elements: [
          { role: "textbox", name: "Email", inViewport: true },
          { role: "button", name: "Login", inViewport: true },
        ],
      }
    );
    assert.equal(status, "match");
  });

  it("returns mismatch when url differs", () => {
    const status = matchBrowserPrecondition(
      {
        version: 1,
        platform: "browser",
        precondition: { urlIncludes: "/dashboard", mustHave: [] },
        variables: [],
        steps: [{ tool: "browser_click", args: {} }],
      },
      { url: "https://example.com/login", elements: [] }
    );
    assert.equal(status, "mismatch");
  });

  it("returns ambiguous on partial mustHave", () => {
    const status = matchBrowserPrecondition(
      {
        version: 1,
        platform: "browser",
        precondition: {
          mustHave: [
            { role: "textbox", name: "Email" },
            { role: "button", name: "Login" },
          ],
        },
        variables: [],
        steps: [{ tool: "browser_click", args: {} }],
      },
      {
        url: "https://example.com/login",
        elements: [{ role: "textbox", name: "Email", inViewport: true }],
      }
    );
    assert.equal(status, "ambiguous");
  });
});
