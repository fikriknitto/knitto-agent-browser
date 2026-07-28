import { getApiDataToken, getApiDataUsername } from "@/lib/api-data/token";
import { useAuthMeQuery } from "@/redux/api/auth";
import { useMemo, useSyncExternalStore } from "react";

function subscribeToken(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("knitto-api-data-token", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("knitto-api-data-token", onStoreChange);
  };
}

function readTokenSnapshot(): string | null {
  return getApiDataToken();
}

/**
 * API Data session gate.
 * localStorage `knitto.apiData.token` is the source of truth (stable on refresh).
 */
export function useUserLogin() {
  const token = useSyncExternalStore(subscribeToken, readTokenSnapshot, () => null);
  const storedUsername = getApiDataUsername();

  const { data } = useAuthMeQuery(undefined, {
    skip: !token,
  });

  return useMemo(() => {
    if (!token) {
      return { data: undefined, authorized: false as const, unauthorized: true as const };
    }
    return {
      data: data ?? { id: 0, username: storedUsername || "user" },
      authorized: true as const,
      unauthorized: false as const,
    };
  }, [token, data, storedUsername]);
}
