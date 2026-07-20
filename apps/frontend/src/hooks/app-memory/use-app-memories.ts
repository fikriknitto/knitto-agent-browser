import { useCallback, useEffect, useState } from "react";
import type { AppMemory, AppMemorySummary } from "@/lib/app-memory/types";
import {
  createAppMemory,
  deleteAppMemory,
  getAppMemory,
  listAppMemories,
  updateAppMemory,
} from "@/lib/api/app-memory-api";
import {
  createMobileAppMemory,
  deleteMobileAppMemory,
  getMobileAppMemory,
  listMobileAppMemories,
  updateMobileAppMemory,
} from "@/lib/api/mobile-app-memory-api";

export type MemoryKind = "browser" | "mobile";

export function useAppMemoryList(kind: MemoryKind) {
  const [data, setData] = useState<AppMemorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows =
        kind === "mobile" ? await listMobileAppMemories() : await listAppMemories();
      setData(rows);
    } catch (err) {
      setData([]);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, isError: Boolean(error), refetch };
}

export function useAppMemoryDetail(kind: MemoryKind, appId: string | null) {
  const [data, setData] = useState<AppMemory | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!appId) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const row =
          kind === "mobile"
            ? await getMobileAppMemory(appId)
            : await getAppMemory(appId);
        if (!cancelled) setData(row);
      } catch (err) {
        if (!cancelled) {
          setData(undefined);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, appId]);

  return { data, isLoading, error, isError: Boolean(error) };
}

export async function saveAppMemory(
  kind: MemoryKind,
  mode: "create" | "edit",
  appId: string,
  content: string
): Promise<AppMemory> {
  if (mode === "create") {
    return kind === "mobile"
      ? createMobileAppMemory({ appId, content })
      : createAppMemory({ appId, content });
  }
  return kind === "mobile"
    ? updateMobileAppMemory(appId, { content })
    : updateAppMemory(appId, { content });
}

export async function removeAppMemory(kind: MemoryKind, appId: string): Promise<void> {
  if (kind === "mobile") return deleteMobileAppMemory(appId);
  return deleteAppMemory(appId);
}
