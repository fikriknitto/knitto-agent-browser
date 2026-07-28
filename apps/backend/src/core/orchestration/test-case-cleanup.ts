import type { MobileConfig, TestCaseSpec } from "@knitto/shared";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createLogger } from "../logging.js";
import { setAutomationJobId } from "../job-context.js";
import { callCursorSubprocessTool } from "../mcp/cursor-mcp-tool-runner.js";
import { closeBrowserFromStateFile, closeBrowser } from "../../platforms/browser/driver/session.js";

const logger = createLogger("test-case-cleanup");

export type TestCaseCleanupMode = "in-process" | "cursor-subprocess";

async function callInProcessTool(
  mcpClient: Client,
  toolName: string
): Promise<void> {
  try {
    await mcpClient.callTool({ name: toolName, arguments: {} });
    logger.info(`In-process MCP tool ok: ${toolName}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`In-process MCP tool failed: ${toolName}: ${msg}`);
  }
}

/** Close platforms once at end of multi-TC job via MCP tools (platform-aware). */
export async function cleanupJobPlatforms(args: {
  mcpClient: Client;
  jobId: string;
  testCases: TestCaseSpec[];
  mobileConfig?: MobileConfig;
  cleanupMode?: TestCaseCleanupMode;
}): Promise<void> {
  const { mcpClient, jobId, testCases, mobileConfig } = args;
  const cleanupMode = args.cleanupMode ?? "in-process";
  setAutomationJobId(jobId);

  const usedBrowser = testCases.some((tc) => tc.platform === "browser");
  const usedMobile = testCases.some((tc) => tc.platform === "mobile");

  if (!usedBrowser && !usedMobile) return;

  if (cleanupMode === "cursor-subprocess") {
    if (usedBrowser) {
      const closeResult = await callCursorSubprocessTool({
        jobId,
        server: "browser",
        toolName: "browser_close_browser",
        segmentManaged: false,
        forceClose: true,
      });
      if (closeResult.warning) {
        logger.warn(
          `Cursor subprocess browser_close_browser warning job=${jobId}: ${closeResult.warning}`
        );
      }
      setAutomationJobId(jobId);
      const closedViaState = await closeBrowserFromStateFile();
      if (closedViaState) {
        logger.info(`Browser closed via state file fallback: job=${jobId}`);
      } else if (closeResult.warning) {
        logger.warn(`Browser may still be open after cleanup: job=${jobId}`);
      }
    }
    if (usedMobile) {
      await callCursorSubprocessTool({
        jobId,
        server: "mobile",
        toolName: "mobile_close_app",
        mobileConfig,
        segmentManaged: false,
        forceClose: true,
      });
      await callCursorSubprocessTool({
        jobId,
        server: "mobile",
        toolName: "mobile_close_session",
        mobileConfig,
        segmentManaged: false,
        forceClose: true,
      });
    }
    logger.info(`Job platforms closed via Cursor MCP tools: job=${jobId}`);
    return;
  }

  if (usedBrowser) {
    await callInProcessTool(mcpClient, "browser_close_browser");
    setAutomationJobId(jobId);
    let closed = false;
    try {
      await closeBrowser();
      closed = true;
      logger.info(`Browser closed via in-process session: job=${jobId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`In-process closeBrowser failed: ${msg}`);
    }
    if (!closed) {
      const closedViaState = await closeBrowserFromStateFile();
      if (closedViaState) {
        logger.info(`Browser closed via state file fallback: job=${jobId}`);
      } else {
        logger.warn(`Browser may still be open after cleanup: job=${jobId}`);
      }
    }
  }
  if (usedMobile) {
    await callInProcessTool(mcpClient, "mobile_close_app");
    await callInProcessTool(mcpClient, "mobile_close_session");
  }
  logger.info(`Job platforms closed via in-process MCP tools: job=${jobId}`);
}
