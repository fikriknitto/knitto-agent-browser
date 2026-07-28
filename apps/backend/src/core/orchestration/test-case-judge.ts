import type OpenAI from "openai";
import config, { type OpenaiCredentials } from "../../agents/openai/config.js";
import { createOpenaiClient, openaiClientContext } from "../../agents/openai/openai-client.js";
import { formatOpenaiSdkError } from "../../agents/openai/sdk-error.js";
import { withOpenaiRetry } from "../../agents/openai/retry.js";

export type JudgeTestCaseOutcomeInput = {
  creds: OpenaiCredentials;
  model: string;
  /** The test case's original stated goal/instruction. */
  instruction: string;
  /** The agent's own final "Ringkasan akhir" — never trusted on its own. */
  agentSummary: string;
  /** Final on-screen state, if one was captured. */
  screenshotBase64?: string;
  signal?: AbortSignal;
};

export type JudgeTestCaseOutcomeResult = {
  passed: boolean;
  /** Alasan singkat — dipakai sebagai fallback jika field terstruktur kosong */
  reason: string;
  /** Skenario yang diuji dalam bahasa sederhana */
  scenario?: string;
  /** Langkah utama yang dilakukan agent */
  stepsPerformed?: string;
  /** Hasil yang diharapkan */
  expectedResult?: string;
  /** Hasil aktual yang ditemukan */
  actualResult?: string;
  /** Kesimpulan dalam bahasa sederhana */
  conclusion?: string;
  /** Penjelasan penyebab kegagalan — hanya diisi jika passed=false */
  failureReason?: string;
  /** Saran langkah selanjutnya — hanya diisi jika passed=false */
  suggestion?: string;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type JudgeDeps = {
  createChatCompletion: (
    params: {
      model: string;
      messages: Array<{ role: "system" | "user"; content: string | ChatContentPart[] }>;
    },
    options?: { signal?: AbortSignal }
  ) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
};

function defaultDeps(creds: OpenaiCredentials): JudgeDeps {
  const client = createOpenaiClient(creds);
  return {
    createChatCompletion: (params, options) =>
      client.chat.completions.create(
        params as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        options
      ),
  };
}

const JUDGE_SYSTEM_PROMPT = `Anda adalah QA judge yang ketat dan teliti. Anda akan diberi instruksi test case, ringkasan akhir dari agent yang menjalankannya, dan (jika tersedia) screenshot layar terakhir.

Nilai APAKAH tujuan test case benar-benar tercapai berdasarkan bukti yang diberikan.
JANGAN percaya begitu saja ringkasan agent — ringkasan bisa salah/optimis padahal buktinya menunjukkan kegagalan (misal: field form masih kosong, tetap di halaman login, pesan error terlihat).

Tulis laporan hasil pengujian yang mudah dipahami oleh tester non-teknis. Gunakan bahasa Indonesia yang jelas dan sederhana.

Balas HANYA dengan JSON persis seperti ini, tanpa teks lain:
{
  "passed": true/false,
  "reason": "alasan singkat satu kalimat",
  "scenario": "deskripsi singkat skenario yang diuji",
  "stepsPerformed": "langkah-langkah utama yang dilakukan agent secara berurutan",
  "expectedResult": "hasil yang seharusnya terjadi jika test berhasil",
  "actualResult": "apa yang benar-benar terjadi berdasarkan bukti (ringkasan agent dan/atau screenshot)",
  "conclusion": "kesimpulan dalam 1-2 kalimat — jelaskan mengapa test dinyatakan berhasil atau gagal dengan bahasa sederhana",
  "failureReason": "jika gagal: penjelasan penyebab kegagalan dalam bahasa sederhana (bukan error teknis). Kosongkan jika passed=true",
  "suggestion": "jika gagal: saran konkret langkah berikutnya atau bagian yang perlu diperiksa. Kosongkan jika passed=true"
}

Aturan pengisian:
- Semua field wajib diisi, kecuali failureReason dan suggestion yang boleh kosong jika passed=true.
- Jangan isi failureReason dan suggestion dengan pesan error teknis mentah — ubah menjadi penjelasan yang dimengerti tester.
- actualResult harus berdasarkan bukti nyata, bukan asumsi.`;

function buildUserContent(
  instruction: string,
  agentSummary: string,
  screenshotBase64?: string
): string | ChatContentPart[] {
  const text = `Instruksi test case:\n${instruction}\n\nRingkasan akhir dari agent:\n${agentSummary}`;
  if (!screenshotBase64) return text;
  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
  ];
}

export function parseJudgeResponse(text: string): JudgeTestCaseOutcomeResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as {
      passed?: unknown;
      reason?: unknown;
      scenario?: unknown;
      stepsPerformed?: unknown;
      expectedResult?: unknown;
      actualResult?: unknown;
      conclusion?: unknown;
      failureReason?: unknown;
      suggestion?: unknown;
    };
    if (typeof parsed.passed !== "boolean") return null;
    return {
      passed: parsed.passed,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      scenario: typeof parsed.scenario === "string" ? parsed.scenario : undefined,
      stepsPerformed: typeof parsed.stepsPerformed === "string" ? parsed.stepsPerformed : undefined,
      expectedResult: typeof parsed.expectedResult === "string" ? parsed.expectedResult : undefined,
      actualResult: typeof parsed.actualResult === "string" ? parsed.actualResult : undefined,
      conclusion: typeof parsed.conclusion === "string" ? parsed.conclusion : undefined,
      failureReason: typeof parsed.failureReason === "string" && parsed.failureReason ? parsed.failureReason : undefined,
      suggestion: typeof parsed.suggestion === "string" && parsed.suggestion ? parsed.suggestion : undefined,
    };
  } catch {
    return null;
  }
}

async function callJudge(
  deps: JudgeDeps,
  args: { model: string; content: string | ChatContentPart[]; signal?: AbortSignal }
): Promise<string> {
  const response = await withOpenaiRetry(
    () =>
      deps.createChatCompletion(
        {
          model: args.model,
          messages: [
            { role: "system", content: JUDGE_SYSTEM_PROMPT },
            { role: "user", content: args.content },
          ],
        },
        { signal: args.signal }
      ),
    { maxRetries: config.maxRetries, baseDelayMs: config.retryDelayMs, signal: args.signal }
  );
  return response.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Verify a test case's claimed outcome against real evidence instead of
 * trusting the agent's own free-text summary — the agent's uncritical
 * "Ringkasan akhir" was previously the ONLY signal used to mark a test
 * case passed, which is why a completely blank login form could still be
 * reported as PASSED. NEVER defaults to passed:true on failure — an
 * unverifiable outcome fails safe as passed:false, since silently
 * defaulting to success here would just reintroduce the same bug.
 */
export async function judgeTestCaseOutcomeWithLlm(
  args: JudgeTestCaseOutcomeInput,
  deps?: JudgeDeps
): Promise<JudgeTestCaseOutcomeResult> {
  const resolvedDeps = deps ?? defaultDeps(args.creds);
  const ctx = { ...openaiClientContext(args.creds, args.model), operation: "test-case-judge" };

  const failSafe = (error: unknown): JudgeTestCaseOutcomeResult => {
    const formatted = formatOpenaiSdkError(error, ctx);
    return { passed: false, reason: `Verifikasi otomatis gagal dijalankan — ${formatted.message}` };
  };

  try {
    const withImage = buildUserContent(args.instruction, args.agentSummary, args.screenshotBase64);
    const text = await callJudge(resolvedDeps, {
      model: args.model,
      content: withImage,
      signal: args.signal,
    });
    const parsed = parseJudgeResponse(text);
    if (parsed) return parsed;
    throw new Error("Judge mengembalikan respons yang tidak bisa diparse.");
  } catch (firstError) {
    if (!args.screenshotBase64) {
      return failSafe(firstError);
    }
    // Retry once without the image — many OpenAI-compatible/proxy models
    // don't support vision content parts, so a first failure with an image
    // attached shouldn't immediately give up on judging altogether.
    try {
      const textOnly = buildUserContent(args.instruction, args.agentSummary, undefined);
      const text = await callJudge(resolvedDeps, {
        model: args.model,
        content: textOnly,
        signal: args.signal,
      });
      const parsed = parseJudgeResponse(text);
      if (parsed) return parsed;
      return failSafe(new Error("Judge mengembalikan respons yang tidak bisa diparse (text-only retry)."));
    } catch (secondError) {
      return failSafe(secondError);
    }
  }
}
