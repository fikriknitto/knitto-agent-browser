export const AUTOMATION_PROMPT_STRATEGIES = {
  // automation_e2e_strategy: {
  //   label: "E2E test",
  //   body: `Execute an end-to-end web test like a human: navigate, snapshot (prefer inViewport refs), scroll when needed, wait for SPA loads, interact via semantic locators, assert outcomes, screenshot for evidence, update memory.`,
  // },
  // automation_explore_strategy: {
  //   label: "Explore site",
  //   body: `Explore the site structure: snapshot pages, scroll to discover content, note navigation patterns and key locators, take screenshots of important views, update app memory without destructive actions.`,
  // },
  automation_human_strategy: {
    label: "Human-like browse",
    body: `Browse the site like a real user: observe snapshot + screenshot when unsure, scroll naturally, hover menus, use keyboard (Enter/Tab/ArrowUp/ArrowDown) for forms and open dropdown lists, wait for dynamic content, verify visually and with assertions, save learnings to app memory. Submit modal forms via Simpan/Save/Submit button clicks; dismiss modals only via Batal/Cancel, X/Close, or backdrop click — never Escape. In open dropdown menus, find the option whose text matches or contains the target value, click it to select (or use ArrowUp/ArrowDown + Enter). To navigate via menu: if a hamburger icon is in the top-right header, automation_click it, find the matching menu item, then automation_click it; if navigation fails, retry up to 3 times — click parent wrapper, then automation_click_at on bbox center — waiting and verifying after each attempt.`,
  },
} as const;

export type AutomationStrategyKey = keyof typeof AUTOMATION_PROMPT_STRATEGIES;
