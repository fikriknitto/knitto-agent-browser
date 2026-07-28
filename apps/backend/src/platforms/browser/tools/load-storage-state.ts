import { defineTool } from "../../mcp-kit/core/index.js";
import { loadStorageState } from "../driver/page-state.js";
import { loadStorageStateInputSchema, loadStorageStateOutputShape } from "../schema.js";

export const automation_load_storage_state = defineTool({
  name: "browser_load_storage_state",
  description:
    "Restore cookies (immediately) + localStorage (on next navigation) from a saved storage-state file. Call BEFORE browser_navigate to skip login. Pair with browser_save_storage_state.",
  inputSchema: loadStorageStateInputSchema,
  outputSchema: loadStorageStateOutputShape,
  handler: async (args) => {
    return loadStorageState(args.path);
  },
});
