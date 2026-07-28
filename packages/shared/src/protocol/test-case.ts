import { z } from "zod";

import type { MobileConfig } from "./bridge.js";

import { fillPromptTemplate } from "./prompt-template.js";



export const MAX_TEST_CASES = 20;



export const testCasePlatformSchema = z.enum(["browser", "mobile"]);

export type TestCasePlatform = z.infer<typeof testCasePlatformSchema>;



export const testCaseStatusSchema = z.enum([

  "pending",

  "running",

  "completed",

  "error",

  "skipped",

]);

export type TestCaseStatus = z.infer<typeof testCaseStatusSchema>;



export const resolvedShortcutSchema = z.object({

  shortcutId: z.string(),

  shortcutLabel: z.string(),

  resolvedBody: z.string(),

});

export type ResolvedShortcut = z.infer<typeof resolvedShortcutSchema>;



export const testCaseSpecSchema = z.object({

  id: z.string(),

  platform: testCasePlatformSchema,

  instruction: z.string(),

  appPackage: z.string().optional(),

  udid: z.string().optional(),

  deepLink: z.string().optional(),

  title: z.string().optional(),

  shortcutId: z.string().optional(),

  shortcutLabel: z.string().optional(),

  shortcuts: z.array(resolvedShortcutSchema).optional(),

  variables: z.record(z.string()).optional(),

  memoryAppId: z.string().optional(),

  resolvedShortcutBody: z.string().optional(),

  narrativeInstruction: z.string().optional(),

});

export type TestCaseSpec = z.infer<typeof testCaseSpecSchema>;



export const videoRecordingMetaSchema = z.object({

  url: z.string(),

  testCaseId: z.string(),

  platform: testCasePlatformSchema,

  appPackage: z.string().optional(),

  label: z.string().optional(),

  warning: z.string().optional(),

});

export type VideoRecordingMeta = z.infer<typeof videoRecordingMetaSchema>;



export type ParseTestCasesResult = {

  testCases: TestCaseSpec[];

  errors: string[];

};



export type ShortcutRegistryEntry = {

  id: string;

  label: string;

  platform?: TestCasePlatform;

  appPackage?: string;

  url?: string;

  deepLink?: string;

  template: string;

  defaults: Record<string, string>;

};



export type TestCaseDraft = {

  id: string;

  title: string;

  shortcutRefs: string[];

  variables: Record<string, string>;

  platformOverride?: TestCasePlatform;

  appPackageOverride?: string;

  urlOverride?: string;

  narrativeInstruction: string;

};



const TEST_CASE_HEADING_RE = /^##\s+Test\s+Case(?:\s+(\d+))?\s*$/gim;

const PLATFORM_LINE_RE = /^Platform:\s*(browser|mobile)\s*$/i;

const APP_LINE_RE = /^App:\s*(\S+)\s*$/i;

const URL_LINE_RE = /^Url:\s*(\S+)\s*$/i;

const VARIABLE_LINE_RE = /^([a-zA-Z_][a-zA-Z0-9_]*)=(.+)$/;

const HANDOFF_LINE_RE = /^\[HANDOFF\]/i;



const SHORTCUT_REF_PATTERNS: RegExp[] = [

  /system\s+prompt\s+"([^"]+)"/gi,

  /system\s+prompt\s+'([^']+)'/gi,

  /shortcut:([a-z0-9]+(?:-[a-z0-9]+)*)/gi,

];



const SHORTCUT_REF_COMBINED_RE =

  /system\s+prompt\s+"([^"]+)"|system\s+prompt\s+'([^']+)'|shortcut:([a-z0-9]+(?:-[a-z0-9]+)*)/gi;



const URL_IN_TEXT_RE = /https?:\/\/[^\s)>\]"']+/i;



function padTestCaseId(index: number): string {

  return `tc-${String(index + 1).padStart(2, "0")}`;

}



function testCaseVideoFilename(index: number): string {

  return `${padTestCaseId(index)}.mp4`;

}



export function testCaseVideoFilenameForId(testCaseId: string): string {

  return `${testCaseId}.mp4`;

}



export function inferPlatformFromUrl(text: string): TestCasePlatform | null {

  return URL_IN_TEXT_RE.test(text) ? "browser" : null;

}



export function extractHostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/** Host for memory file; IPv4 includes port when present (`192.168.20.27:5367`). */
export function extractMemoryAppIdFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (!host) return undefined;
    if (IPV4_RE.test(host) && parsed.port) {
      return `${host}:${parsed.port}`;
    }
    return host;
  } catch {
    return undefined;
  }
}

export function resolveMemoryAppId(args: {
  platform: TestCasePlatform;
  url?: string;
  appPackage?: string;
  text?: string;
}): string | undefined {
  if (args.platform === "mobile" && args.appPackage?.trim()) {
    return args.appPackage.trim();
  }

  if (args.url?.trim()) {
    return extractMemoryAppIdFromUrl(args.url.trim());
  }

  if (args.text) {
    const match = args.text.match(URL_IN_TEXT_RE);
    if (match?.[0]) {
      return extractMemoryAppIdFromUrl(match[0]);
    }
  }

  return undefined;
}



export function extractShortcutRefsInOrder(block: string): string[] {

  const refs: string[] = [];

  SHORTCUT_REF_COMBINED_RE.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = SHORTCUT_REF_COMBINED_RE.exec(block)) !== null) {

    const ref = (match[1] ?? match[2] ?? match[3])?.trim();

    if (!ref) continue;

    const prev = refs[refs.length - 1];

    if (prev?.toLowerCase() === ref.toLowerCase()) continue;

    refs.push(ref);

  }

  return refs.slice(0, MAX_TEST_CASES);

}



function stripShortcutRefsFromText(text: string): string {

  let result = text;

  for (const pattern of SHORTCUT_REF_PATTERNS) {

    result = result.replace(pattern, "").trim();

  }

  return result.replace(/\s{2,}/g, " ").trim();

}



function findShortcutInRegistry(

  ref: string,

  shortcuts: ShortcutRegistryEntry[]

): ShortcutRegistryEntry | undefined {

  const trimmed = ref.trim();

  const byId = shortcuts.find((s) => s.id === trimmed);

  if (byId) return byId;

  const lower = trimmed.toLowerCase();

  return shortcuts.find((s) => s.label.toLowerCase() === lower);

}



function mergeShortcutDefaults(

  entries: ShortcutRegistryEntry[],

  draftVariables: Record<string, string>

): Record<string, string> {

  const merged: Record<string, string> = {};

  for (const entry of entries) {

    Object.assign(merged, entry.defaults);

  }

  return { ...merged, ...draftVariables };

}



export function parseTestCaseDrafts(prompt: string): {

  drafts: TestCaseDraft[];

  errors: string[];

} {

  const errors: string[] = [];

  const trimmed = prompt.trim();

  if (!trimmed) {

    return { drafts: [], errors: ["Prompt kosong."] };

  }



  const headings: { index: number; title: string }[] = [];

  let match: RegExpExecArray | null;

  TEST_CASE_HEADING_RE.lastIndex = 0;

  while ((match = TEST_CASE_HEADING_RE.exec(trimmed)) !== null) {

    headings.push({

      index: match.index,

      title: match[0].trim(),

    });

  }



  if (headings.length === 0) {

    return { drafts: [], errors: [] };

  }



  if (headings.length > MAX_TEST_CASES) {

    errors.push(`Maksimal ${MAX_TEST_CASES} test case per prompt.`);

  }



  const drafts: TestCaseDraft[] = [];



  for (let i = 0; i < Math.min(headings.length, MAX_TEST_CASES); i++) {

    const start = headings[i].index + headings[i].title.length;

    const end = i + 1 < headings.length ? headings[i + 1].index : trimmed.length;

    const block = trimmed.slice(start, end).trim();

    const headingTitle = headings[i].title.replace(/^##\s+/i, "");



    const shortcutRefs = extractShortcutRefsInOrder(block);

    if (extractShortcutRefsInOrder(block).length > MAX_TEST_CASES) {

      errors.push(`${headings[i].title}: maksimal ${MAX_TEST_CASES} system prompt per test case.`);

    }



    let platformOverride: TestCasePlatform | undefined;

    let appPackageOverride: string | undefined;

    let urlOverride: string | undefined;

    const variables: Record<string, string> = {};

    const narrativeLines: string[] = [];



    for (const line of block.split("\n")) {

      const trimmedLine = line.trim();

      if (!trimmedLine) continue;



      const platformMatch = trimmedLine.match(PLATFORM_LINE_RE);

      if (platformMatch) {

        platformOverride = platformMatch[1]!.toLowerCase() as TestCasePlatform;

        continue;

      }



      const appMatch = trimmedLine.match(APP_LINE_RE);

      if (appMatch) {

        appPackageOverride = appMatch[1]!.trim();

        continue;

      }



      const urlMatch = trimmedLine.match(URL_LINE_RE);

      if (urlMatch) {

        urlOverride = urlMatch[1]!.trim();

        continue;

      }



      const varMatch = trimmedLine.match(VARIABLE_LINE_RE);

      if (varMatch && !HANDOFF_LINE_RE.test(trimmedLine)) {

        variables[varMatch[1]!] = varMatch[2]!.trim();

        continue;

      }



      const withoutRefs = stripShortcutRefsFromText(trimmedLine);

      if (withoutRefs && !/^[\s.,\-–—:;!?]*$/.test(withoutRefs)) {

        narrativeLines.push(withoutRefs);

      }

    }



    drafts.push({

      id: padTestCaseId(i),

      title: headingTitle,

      shortcutRefs,

      variables,

      platformOverride,

      appPackageOverride,

      urlOverride,

      narrativeInstruction: narrativeLines.join("\n").trim(),

    });

  }



  return { drafts, errors };

}



export function resolveTestCaseDrafts(

  drafts: TestCaseDraft[],

  ctx: {

    shortcuts: ShortcutRegistryEntry[];

    mobileFallback?: MobileConfig;

  }

): ParseTestCasesResult {

  const errors: string[] = [];

  const testCases: TestCaseSpec[] = [];



  for (const draft of drafts) {

    const registryShortcuts: ShortcutRegistryEntry[] = [];

    let resolveFailed = false;



    for (const ref of draft.shortcutRefs) {

      const shortcut = findShortcutInRegistry(ref, ctx.shortcuts);

      if (!shortcut) {

        errors.push(`${draft.title}: system prompt "${ref}" tidak ditemukan.`);

        resolveFailed = true;

        break;

      }

      registryShortcuts.push(shortcut);

    }



    if (resolveFailed) continue;



    const primary = registryShortcuts[0];

    const mergedVariables = mergeShortcutDefaults(registryShortcuts, draft.variables);



    const resolvedShortcuts: ResolvedShortcut[] = registryShortcuts.map((shortcut) => ({

      shortcutId: shortcut.id,

      shortcutLabel: shortcut.label,

      resolvedBody: fillPromptTemplate(shortcut.template, mergedVariables),

    }));



    const resolvedShortcutBody = resolvedShortcuts.map((s) => s.resolvedBody).join("\n\n") || undefined;



    const combinedText = [

      resolvedShortcutBody,

      draft.narrativeInstruction,

      draft.urlOverride,

      primary?.url,

    ]

      .filter(Boolean)

      .join("\n");



    const shortcutPlatforms = [

      ...new Set(

        registryShortcuts.map((s) => s.platform).filter((p): p is TestCasePlatform => Boolean(p))

      ),

    ];



    if (shortcutPlatforms.length > 1 && !draft.platformOverride) {

      errors.push(

        `${draft.title}: system prompt bertentangan platform (browser + mobile). Tambahkan baris Platform: untuk override.`

      );

      continue;

    }



    let platform: TestCasePlatform =

      draft.platformOverride ??

      primary?.platform ??

      inferPlatformFromUrl(combinedText) ??

      "browser";



    if (

      draft.platformOverride &&

      primary?.platform &&

      draft.platformOverride !== primary.platform

    ) {

      platform = draft.platformOverride;

    }



    const appPackage =

      draft.appPackageOverride?.trim() ||

      registryShortcuts.map((s) => s.appPackage?.trim()).find(Boolean) ||

      ctx.mobileFallback?.appPackage?.trim() ||

      undefined;



    const deepLink =

      registryShortcuts.map((s) => s.deepLink).find(Boolean) ?? ctx.mobileFallback?.deepLink;

    const udid = ctx.mobileFallback?.udid;



    if (platform === "mobile" && !appPackage) {

      errors.push(

        `${draft.title}: TC mobile membutuhkan App: <package>, appPackage di shortcut, atau package fallback di composer.`

      );

      continue;

    }



    const url = draft.urlOverride ?? primary?.url;

    const memoryAppId = resolveMemoryAppId({

      platform,

      url,

      appPackage,

      text: combinedText,

    });



    const instructionParts: string[] = [];

    if (resolvedShortcutBody) {

      instructionParts.push(resolvedShortcutBody);

    }

    if (draft.narrativeInstruction) {

      instructionParts.push(draft.narrativeInstruction);

    }

    if (!resolvedShortcutBody && !draft.narrativeInstruction) {

      errors.push(`${draft.title}: instruksi test case kosong.`);

      continue;

    }



    testCases.push({

      id: draft.id,

      platform,

      instruction: instructionParts.join("\n\n").trim(),

      appPackage: platform === "mobile" ? appPackage : undefined,

      udid,

      deepLink,

      title: draft.title,

      shortcutId: primary?.id,

      shortcutLabel: primary?.label,

      shortcuts: resolvedShortcuts.length ? resolvedShortcuts : undefined,

      variables: Object.keys(draft.variables).length ? draft.variables : undefined,

      memoryAppId,

      resolvedShortcutBody: resolvedShortcuts[0]?.resolvedBody,

      narrativeInstruction: draft.narrativeInstruction || undefined,

    });

  }



  return { testCases, errors };

}



export function parseTestCasesFromPrompt(

  prompt: string,

  fallbackMobileConfig?: MobileConfig,

  shortcuts: ShortcutRegistryEntry[] = []

): ParseTestCasesResult {

  const { drafts, errors: draftErrors } = parseTestCaseDrafts(prompt);

  if (drafts.length === 0) {

    return { testCases: [], errors: draftErrors };

  }



  const resolved = resolveTestCaseDrafts(drafts, {

    shortcuts,

    mobileFallback: fallbackMobileConfig,

  });



  return {

    testCases: resolved.testCases,

    errors: [...draftErrors, ...resolved.errors],

  };

}



export function validateHybridPrompt(

  prompt: string,

  fallbackMobileConfig?: MobileConfig,

  shortcuts: ShortcutRegistryEntry[] = []

): ParseTestCasesResult {

  const result = parseTestCasesFromPrompt(prompt, fallbackMobileConfig, shortcuts);

  if (result.testCases.length === 0) {

    return {

      testCases: [],

      errors: [

        "Prompt hybrid membutuhkan minimal satu heading ## Test Case.",

        ...result.errors,

      ],

    };

  }

  return result;

}



export function countTestCasesByPlatform(testCases: TestCaseSpec[]): {

  total: number;

  browser: number;

  mobile: number;

} {

  return {

    total: testCases.length,

    browser: testCases.filter((tc) => tc.platform === "browser").length,

    mobile: testCases.filter((tc) => tc.platform === "mobile").length,

  };

}



export function shortcutToRegistryEntry(shortcut: {

  id: string;

  label: string;

  platform?: string;

  appPackage?: string;

  url?: string;

  deepLink?: string;

  template: string;

  defaults: Record<string, string>;

}): ShortcutRegistryEntry {

  const platform =

    shortcut.platform === "mobile" || shortcut.platform === "browser"

      ? shortcut.platform

      : undefined;

  return {

    id: shortcut.id,

    label: shortcut.label,

    platform,

    appPackage: shortcut.appPackage,

    url: shortcut.url,

    deepLink: shortcut.deepLink,

    template: shortcut.template,

    defaults: shortcut.defaults,

  };

}



export function formatTestCaseShortcutSummary(tc: TestCaseSpec): string {
  if (tc.shortcuts?.length) {
    return tc.shortcuts.map((s) => s.shortcutLabel).join(" → ");
  }
  return tc.shortcutLabel ?? "";
}

export { testCaseVideoFilename, padTestCaseId };


