import { createLogger } from "../logging.js";

const logger = createLogger("host-job-gate");

type Waiter = {
  agentJobId: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

/**
 * Host-wide serial gate: only one automation job runs at a time across
 * Cursor and OpenAI-compatible agent runtimes on this Worker process.
 */
class HostJobGate {
  private activeJobId: string | null = null;
  private readonly waiters: Waiter[] = [];

  getActiveJobId(): string | null {
    return this.activeJobId;
  }

  isBusy(): boolean {
    return this.activeJobId != null;
  }

  /** True when no job holds the slot and nothing is waiting for it. */
  isIdle(): boolean {
    return this.activeJobId == null && this.waiters.length === 0;
  }

  /**
   * Acquire the host slot. If another job holds it, waits until released.
   * AbortSignal cancels the wait (e.g. user cancel while queued on host).
   */
  async acquire(agentJobId: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    if (this.activeJobId === agentJobId) {
      return;
    }

    if (!this.activeJobId) {
      this.activeJobId = agentJobId;
      logger.child({ agentJobId }).info("Host job slot acquired");
      return;
    }

    logger
      .child({ agentJobId })
      .info(`Host job slot busy (held by ${this.activeJobId}) — waiting`);

    await new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        agentJobId,
        resolve: () => {
          cleanup();
          resolve();
        },
        reject: (error) => {
          cleanup();
          reject(error);
        },
      };

      const onAbort = (): void => {
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) this.waiters.splice(idx, 1);
        cleanup();
        reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      };

      const cleanup = (): void => {
        signal?.removeEventListener("abort", onAbort);
      };

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }

      this.waiters.push(waiter);
    });

    this.activeJobId = agentJobId;
    logger.child({ agentJobId }).info("Host job slot acquired after wait");
  }

  release(agentJobId: string): void {
    if (this.activeJobId !== agentJobId) {
      return;
    }
    this.activeJobId = null;
    logger.child({ agentJobId }).info("Host job slot released");

    const next = this.waiters.shift();
    if (next) {
      next.resolve();
    }
  }
}

export const hostJobGate = new HostJobGate();
