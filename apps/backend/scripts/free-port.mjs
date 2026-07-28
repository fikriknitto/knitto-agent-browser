/**
 * Dev-only: free BACKEND_PORT if a stale listener is left from a crashed watch session.
 * Runs as `predev` before nodemon on Windows where orphan node processes are common.
 */
import { execSync } from "node:child_process";
import { platform } from "node:os";

const port = Number(process.env.BACKEND_PORT || 3080);

function freePortWindows(targetPort) {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: "utf8" });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[free-port] Freed :${targetPort} (PID ${pid})`);
    } catch {
      // ignore
    }
  }
}

if (platform() === "win32") {
  freePortWindows(port);
}
