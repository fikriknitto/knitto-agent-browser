import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterConsole,
  filterNetwork,
  type ConsoleEntry,
  type NetworkEntry,
} from "./observability.js";

const consoleEntries: ConsoleEntry[] = [
  { type: "log", text: "a", at: 1 },
  { type: "error", text: "boom", at: 2 },
  { type: "warning", text: "careful", at: 3 },
  { type: "error", text: "boom2", at: 4 },
];

const networkEntries: NetworkEntry[] = [
  { method: "GET", url: "https://x/api/orders", status: 200, at: 1 },
  { method: "POST", url: "https://x/api/orders", status: 201, at: 2 },
  { method: "GET", url: "https://x/assets/logo.png", status: 200, at: 3 },
];

describe("filterConsole", () => {
  it("filters by level (case-insensitive)", () => {
    const out = filterConsole(consoleEntries, { level: ["error"] });
    assert.equal(out.length, 2);
    assert.ok(out.every((e) => e.type === "error"));
  });

  it("limit returns the last N", () => {
    const out = filterConsole(consoleEntries, { limit: 1 });
    assert.deepEqual(out.map((e) => e.at), [4]);
  });

  it("no opts returns all", () => {
    assert.equal(filterConsole(consoleEntries).length, 4);
  });
});

describe("filterNetwork", () => {
  it("filters by urlPattern regex", () => {
    const out = filterNetwork(networkEntries, { urlPattern: "/api/orders" });
    assert.equal(out.length, 2);
  });

  it("filters by method", () => {
    const out = filterNetwork(networkEntries, { method: "post" });
    assert.deepEqual(out.map((e) => e.status), [201]);
  });

  it("combines urlPattern + method", () => {
    const out = filterNetwork(networkEntries, { urlPattern: "orders", method: "GET" });
    assert.deepEqual(out.map((e) => e.status), [200]);
  });
});
