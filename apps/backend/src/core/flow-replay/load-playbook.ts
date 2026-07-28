import type { FlowPlaybook, TestCasePlatform } from "@knitto/shared";
import { readAppMemory } from "../../platforms/browser/memory/store.js";
import { readAppMemory as readMobileAppMemory } from "../../platforms/mobile/memory/store.js";
import { getAgentAppMemory } from "../../infra/api-data/agent-memory-client.js";
import { parsePlaybookFromMemoryContent } from "./parse-playbook.js";

export async function loadPlaybookForSection(args: {
  platform: TestCasePlatform;
  appId: string;
  sectionKey: string;
  apiDataToken?: string;
}): Promise<FlowPlaybook | undefined> {
  const content = await loadMemoryContent(args);
  if (!content) return undefined;
  return parsePlaybookFromMemoryContent(content, args.sectionKey);
}

export async function loadMemoryContent(args: {
  platform: TestCasePlatform;
  appId: string;
  apiDataToken?: string;
}): Promise<string | undefined> {
  const token = args.apiDataToken?.trim();
  if (token) {
    try {
      const row = await getAgentAppMemory(args.platform, args.appId, token);
      return row.content ?? "";
    } catch {
      return undefined;
    }
  }

  const disk =
    args.platform === "mobile"
      ? readMobileAppMemory(args.appId)
      : readAppMemory(args.appId);
  return disk.exists ? disk.content : undefined;
}
