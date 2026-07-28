import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { replayPlaybookSteps } from "./replay-runner.js";

describe("replay-runner", () => {
  it("executes whitelisted tools in order", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const mcpClient = {
      callTool: async (params: { name: string; arguments?: Record<string, unknown> }) => {
        calls.push({ name: params.name, args: params.arguments ?? {} });
        return { content: [{ type: "text", text: "ok" }] };
      },
    };

    const result = await replayPlaybookSteps({
      mcpClient: mcpClient as never,
      variables: { email: "user@test.com" },
      playbook: {
        version: 1,
        platform: "browser",
        precondition: { mustHave: [] },
        variables: ["email"],
        steps: [
          {
            tool: "browser_fill",
            args: {
              locator: { role: "textbox", name: "Email" },
              value: "{{email}}",
            },
          },
          { tool: "browser_click", args: { locator: { role: "button", name: "Login" } } },
        ],
      },
    });

    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.args.value, "user@test.com");
  });

  it("rejects non-whitelisted tools", async () => {
    const result = await replayPlaybookSteps({
      mcpClient: {
        callTool: async () => ({ content: [] }),
      } as never,
      variables: {},
      playbook: {
        version: 1,
        platform: "browser",
        precondition: { mustHave: [] },
        variables: [],
        steps: [{ tool: "browser_get_app_memory", args: { appId: "x" } }],
      },
    });
    assert.equal(result.ok, false);
  });
});
