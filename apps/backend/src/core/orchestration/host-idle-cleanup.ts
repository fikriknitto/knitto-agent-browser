import { createLogger } from "../logging.js";
import { setAutomationJobId } from "../job-context.js";
import { closeBrowser } from "../../platforms/browser/driver/session.js";
import { cleanupMobileJob } from "./mobile-job-cleanup.js";
import { hostJobGate } from "./host-job-gate.js";

const logger = createLogger("host-idle-cleanup");

const IDLE_DEBOUNCE_MS = 500;

let idleTimer: NodeJS.Timeout | null = null;

/**
 * Closes browser/mobile session once the host job queue is truly idle
 * (no active job, nothing waiting for the slot). Debounced so a job
 * enqueued right after another finishes doesn't get its session closed
 * out from under it. Safe to call unconditionally — closeBrowser() and
 * cleanupMobileJob() are no-ops when there is nothing open.
 */
export function scheduleIdleCleanup(lastJobId: string): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (!hostJobGate.isIdle()) return;

    void (async () => {
      setAutomationJobId(lastJobId);
      try {
        await closeBrowser();
      } catch (error) {
        logger.warn(
          `Idle browser close failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      try {
        await cleanupMobileJob(lastJobId);
      } catch (error) {
        logger.warn(
          `Idle mobile cleanup failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })();
  }, IDLE_DEBOUNCE_MS);
}
