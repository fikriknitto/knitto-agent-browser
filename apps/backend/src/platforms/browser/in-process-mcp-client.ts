import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  createInProcessClient,
  type AnyToolDefinition,
} from "../mcp-kit/in-process-client.js";
import {
  automation_get_app_memory,
  automation_update_app_memory,
  automation_navigate,
  automation_get_page_snapshot,
  automation_click,
  automation_click_at,
  automation_fill,
  automation_assert_text,
  automation_assert_visible,
  automation_take_screenshot,
  automation_scroll,
  automation_press_key,
  automation_hover,
  automation_select_option,
  automation_wait_for,
  automation_go_back,
  automation_go_forward,
  automation_upload_file,
  automation_close_browser,
  automation_stop_test_case_segment,
  automation_evaluate,
  automation_get_console_logs,
  automation_wait_for_response,
  automation_get_requests,
  automation_get_cookies,
  automation_set_cookies,
  automation_save_storage_state,
  automation_load_storage_state,
} from "./registry.js";

/** Browser MCP tools — names are `browser_*` (W6 cutover). */
const ALL_TOOLS = [
  automation_get_app_memory,
  automation_update_app_memory,
  automation_navigate,
  automation_get_page_snapshot,
  automation_click,
  automation_click_at,
  automation_fill,
  automation_assert_text,
  automation_assert_visible,
  automation_take_screenshot,
  automation_scroll,
  automation_press_key,
  automation_hover,
  automation_select_option,
  automation_wait_for,
  automation_go_back,
  automation_go_forward,
  automation_upload_file,
  automation_close_browser,
  automation_stop_test_case_segment,
  automation_evaluate,
  automation_get_console_logs,
  automation_wait_for_response,
  automation_get_requests,
  automation_get_cookies,
  automation_set_cookies,
  automation_save_storage_state,
  automation_load_storage_state,
] as const;

export function createInProcessMcpClient(): Client {
  return createInProcessClient(ALL_TOOLS as unknown as readonly AnyToolDefinition[]);
}

export { ALL_TOOLS };
