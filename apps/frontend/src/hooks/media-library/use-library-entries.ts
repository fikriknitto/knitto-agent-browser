import type { ListEntriesResponse } from "@knitto/shared";
import { useCallback, useEffect, useState } from "react";
import { listLibraryEntries } from "@/lib/api/api-data-library-api";
import { subscribeMediaLibraryInvalidate } from "@/query/invalidate-media-library";

type UseLibraryEntriesOptions = {
  enabled?: boolean;
};

export function useLibraryEntries(path: string, options: UseLibraryEntriesOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<ListEntriesResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => subscribeMediaLibraryInvalidate(refetch), [refetch]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    void listLibraryEntries(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, enabled, tick]);

  return { data, isLoading, isError, error, refetch };
}
