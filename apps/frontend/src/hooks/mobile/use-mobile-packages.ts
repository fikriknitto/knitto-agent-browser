import { useEffect, useState } from "react";
import { listMobilePackages, type MobilePackage } from "@/lib/api/mobile-device-api";

export type { MobilePackage };

export function useMobilePackages(
  udid: string | null | undefined,
  query?: string
): {
  data: MobilePackage[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<MobilePackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const id = udid?.trim();
    if (!id) {
      setData([]);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    void listMobilePackages(id, query)
      .then((packages) => {
        if (!cancelled) setData(packages);
      })
      .catch((err) => {
        if (cancelled) return;
        setData([]);
        setIsError(true);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [udid, query]);

  return { data, isLoading, isError, error };
}
