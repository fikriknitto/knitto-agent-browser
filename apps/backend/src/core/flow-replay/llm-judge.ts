import type { OpenaiCredentials } from "../../agents/openai/config.js";
import { runOpenaiTextTurn } from "../../agents/openai/text-turn.js";
import type { FlowPlaybook } from "@knitto/shared";
import { compactSnapshotForJudge, type BrowserSnapshot, type MobileSnapshot } from "./match-precondition.js";

export async function judgePreconditionWithLlm(args: {
  creds: OpenaiCredentials;
  model: string;
  playbook: FlowPlaybook;
  snapshot: BrowserSnapshot | MobileSnapshot;
  signal?: AbortSignal;
}): Promise<"match" | "mismatch"> {
  const preconditionSummary = JSON.stringify(args.playbook.precondition);
  const snapshotSummary = compactSnapshotForJudge(args.snapshot);

  const system = `You judge whether the current UI matches a stored automation playbook precondition.
Reply with exactly one word: match or mismatch.
- match: the page/screen is the same flow (labels may differ slightly)
- mismatch: clearly a different page, missing critical controls, or wrong app state`;

  const prompt = `Precondition:\n${preconditionSummary}\n\nCurrent snapshot:\n${snapshotSummary}`;

  const text = await runOpenaiTextTurn({
    creds: args.creds,
    model: args.model,
    system,
    prompt,
    signal: args.signal,
    timeoutMs: 30_000,
  });

  const normalized = text.trim().toLowerCase();
  if (normalized.includes("match") && !normalized.includes("mismatch")) return "match";
  return "mismatch";
}
