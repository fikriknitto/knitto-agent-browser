import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { AutomationPlatform } from "@knitto/shared";
import { createLogger } from "../logging.js";
import { cleanupMobileJob } from "../orchestration/mobile-job-cleanup.js";

const logger = createLogger("mcp-session-cleanup");

function logCloseFailure(toolName: string, jobId: string | undefined, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  logger.warn(`${toolName} failed during job cleanup${jobId ? ` (job=${jobId})` : ""}: ${msg}`);
}

export async function closeMcpSession(
  client: Client,
  platform: AutomationPlatform = "browser",
  jobId?: string
): Promise<void> {
  if ((platform === "mobile" || platform === "hybrid") && jobId) {
    await cleanupMobileJob(jobId);
    if (platform === "hybrid") {
      try {
        await client.callTool({ name: "browser_close_browser", arguments: {} });
      } catch (error) {
        logCloseFailure("browser_close_browser", jobId, error);
      }
    }
    return;
  }

  const toolName =
    platform === "mobile" ? "mobile_close_session" : "browser_close_browser";
  try {
    await client.callTool({ name: toolName, arguments: {} });
  } catch (error) {
    logCloseFailure(toolName, jobId, error);
  }
}
