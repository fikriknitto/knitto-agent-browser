/**
 * Unit-test setup (node/forks pool).
 * Browser-mode MSW setup is deferred until vitest browser mode is re-enabled.
 */
import { afterEach } from "vitest";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
