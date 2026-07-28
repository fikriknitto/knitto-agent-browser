import { defineTool } from "../../mcp-kit/core/index.js";
import { saveStorageState } from "../driver/page-state.js";
import { saveStorageStateInputSchema, saveStorageStateOutputShape } from "../schema.js";

export const automation_save_storage_state = defineTool({
  name: "browser_save_storage_state",
  description:
    "Persist the current context's cookies + localStorage to a JSON file (returns its path). Save once after login, then reuse with browser_load_storage_state to skip login in later runs.",
  inputSchema: saveStorageStateInputSchema,
  outputSchema: saveStorageStateOutputShape,
  handler: async (args) => {
    return saveStorageState(args.path);
  },
});
