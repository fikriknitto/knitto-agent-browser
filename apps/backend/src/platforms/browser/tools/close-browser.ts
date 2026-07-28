import { defineTool, ToolError } from "../../mcp-kit/core/index.js";
import { getAutomationJobId } from "../../../core/job-context.js";
import { isMultiTcCloseBlocked } from "../../../core/evidence/segment-context.js";
import { createLogger } from "../../mcp-kit/core/index.js";
import { closeBrowser } from "../driver/session.js";
import { closeBrowserOutputShape } from "../schema.js";

const logger = createLogger("browser-close-tool");

const MULTI_TC_CLOSE_MSG =
  "Multi-TC job — orchestrator menutup platform setelah semua TC selesai.";

export const automation_close_browser = defineTool({
  name: "browser_close_browser",
  description: "Close the Puppeteer browser session and all open pages.",
  inputSchema: {},
  outputSchema: closeBrowserOutputShape,
  handler: async () => {
    const jobId = getAutomationJobId();
    if (jobId && isMultiTcCloseBlocked(jobId)) {
      logger.warn(`browser_close_browser blocked by multi-TC guard (job=${jobId})`);
      throw new ToolError(MULTI_TC_CLOSE_MSG);
    }
    await closeBrowser();
    logger.info(`browser_close_browser: closed (job=${jobId ?? "unknown"})`);
    return { closed: true };
  },
});
