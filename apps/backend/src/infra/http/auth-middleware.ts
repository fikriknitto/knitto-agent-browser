import type { NextFunction, Request, Response } from "express";
import { getApiDataBaseUrl } from "../api-data/agent-runs-client.js";

type ApiDataEnvelope<T> = {
  message?: string;
  result?: T;
};

type ApiDataUser = {
  id: number;
  username: string;
};

/**
 * Verifies `Authorization: Bearer <jwt>` against API Data's `GET /auth/me`
 * and attaches the resolved user id as `req.userId`.
 *
 * NOTE: this middleware is not wired into any route today — the Worker's
 * only user-scoped flow (`bridge_credentials` over WebSocket) doesn't go
 * through Express HTTP routing. It's ready to `router.use(...)` on future
 * user-scoped HTTP routes (e.g. `ai-provider-credentials` proxy endpoints)
 * without touching unauthenticated existing routes.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.header("authorization") ?? req.header("Authorization");
  const token = header?.trim().match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) {
    // No token supplied — many Worker routes/WS flows are not user-scoped
    // yet, so we don't reject here. Routes that truly need req.userId
    // should check for its presence themselves, or a stricter variant
    // should be built when that need arises.
    next();
    return;
  }

  try {
    const url = `${getApiDataBaseUrl()}/auth/me`;
    const apiRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!apiRes.ok) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const json = (await apiRes.json().catch(() => ({}))) as ApiDataEnvelope<ApiDataUser>;
    if (!json.result?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.userId = json.result.id;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}
