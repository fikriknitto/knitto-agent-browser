import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractPlaybookJsonFromSection,
  parsePlaybookFromSectionBody,
  serializePlaybookBlock,
} from "./parse-playbook.js";

describe("parse-playbook", () => {
  it("extracts playbook JSON from fenced block", () => {
    const body = `Some notes

\`\`\`playbook
{"version":1,"platform":"browser","precondition":{"mustHave":[]},"steps":[{"tool":"browser_click","args":{}}]}
\`\`\`
`;
    const json = extractPlaybookJsonFromSection(body);
    assert.ok(json?.includes('"version":1'));
    const parsed = parsePlaybookFromSectionBody(body);
    assert.equal(parsed?.platform, "browser");
    assert.equal(parsed?.steps[0]?.tool, "browser_click");
  });

  it("round-trips serializePlaybookBlock", () => {
    const block = serializePlaybookBlock({
      version: 1,
      platform: "mobile",
      precondition: { package: "com.example.app", mustHave: [] },
      variables: ["user"],
      steps: [{ tool: "mobile_tap", args: { locator: { text: "OK" } } }],
    });
    const parsed = parsePlaybookFromSectionBody(block);
    assert.equal(parsed?.platform, "mobile");
    assert.equal(parsed?.variables[0], "user");
  });
});
