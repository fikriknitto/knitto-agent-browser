import { parseFlowPlaybookJson, type FlowPlaybook } from "@knitto/shared";
import { normalizeSectionKey, parseMemorySections } from "../memory/app-memory-sections.js";

const PLAYBOOK_FENCE_RE = /```playbook\s*\n([\s\S]*?)```/i;

export function extractPlaybookJsonFromSection(sectionBody: string): string | undefined {
  const match = sectionBody.match(PLAYBOOK_FENCE_RE);
  return match?.[1]?.trim() || undefined;
}

export function parsePlaybookFromSectionBody(sectionBody: string): FlowPlaybook | undefined {
  const json = extractPlaybookJsonFromSection(sectionBody);
  if (!json) return undefined;
  try {
    return parseFlowPlaybookJson(json);
  } catch {
    return undefined;
  }
}

export function parsePlaybookFromMemoryContent(
  content: string,
  sectionKey: string
): FlowPlaybook | undefined {
  const sections = parseMemorySections(content);
  const normalized = normalizeSectionKey(sectionKey);
  const body = sections.get(normalized);
  if (!body) return undefined;
  return parsePlaybookFromSectionBody(body);
}

export function serializePlaybookBlock(playbook: FlowPlaybook): string {
  return `\`\`\`playbook\n${JSON.stringify(playbook, null, 2)}\n\`\`\``;
}
