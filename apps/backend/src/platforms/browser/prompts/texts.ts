export const AUTOMATION_PROMPT_STRATEGIES = {
  // browser_e2e_strategy: {
  //   label: "E2E test",
  //   body: `Execute an end-to-end web test like a human: navigate, snapshot (prefer inViewport refs), scroll when needed, wait for SPA loads, interact via semantic locators, assert outcomes, screenshot for evidence, update memory.`,
  // },
  // browser_explore_strategy: {
  //   label: "Explore site",
  //   body: `Explore the site structure: snapshot pages, scroll to discover content, note navigation patterns and key locators, take screenshots of important views, update app memory without destructive actions.`,
  // },
  browser_human_strategy: {
    label: "Human-like browse",
    body: `Browse like a real user: prefer browser_get_page_snapshot (not screenshots) to understand UI; use assert_* / wait_for instead of snapshot spam. Screenshot only for evidence. Scroll naturally, hover menus, keyboard for forms/dropdowns. Submit modals via Simpan/Save/Submit; dismiss via Batal/Cancel, X/Close, or backdrop — never Escape. Menu: click hamburger if present, then the item; retry up to 3× with parent wrapper or click_at on bbox center.`,
  },
} as const;

export type AutomationStrategyKey = keyof typeof AUTOMATION_PROMPT_STRATEGIES;
