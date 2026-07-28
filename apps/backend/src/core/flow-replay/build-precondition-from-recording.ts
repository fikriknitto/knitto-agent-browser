import type { PlaybookPrecondition, TestCasePlatform } from "@knitto/shared";
import type { RecordedToolCall } from "./record-playbook.js";

export function buildPreconditionFromToolCalls(
  platform: TestCasePlatform,
  toolCalls: RecordedToolCall[]
): PlaybookPrecondition {
  if (platform === "mobile") {
    const launch = toolCalls.find((call) => call.tool === "mobile_launch_app");
    const packageName =
      typeof launch?.args.appPackage === "string" ? launch.args.appPackage : undefined;
    return {
      package: packageName,
      mustHave: [],
    };
  }

  const navigate = toolCalls.find((call) => call.tool === "browser_navigate");
  let urlIncludes: string | undefined;
  if (typeof navigate?.args.url === "string") {
    try {
      const path = new URL(navigate.args.url).pathname;
      urlIncludes = path && path !== "/" ? path : undefined;
    } catch {
      urlIncludes = navigate.args.url;
    }
  }

  const mustHave = toolCalls
    .filter((call) => call.tool === "browser_fill" || call.tool === "browser_click")
    .slice(0, 3)
    .map((call) => {
      const locator = call.args.locator;
      if (!locator || typeof locator !== "object") return {};
      const loc = locator as Record<string, unknown>;
      return {
        role: typeof loc.role === "string" ? loc.role : undefined,
        name: typeof loc.name === "string" ? loc.name : undefined,
        text: typeof loc.text === "string" ? loc.text : undefined,
      };
    })
    .filter((rule) => rule.role || rule.name || rule.text);

  return { urlIncludes, mustHave };
}
