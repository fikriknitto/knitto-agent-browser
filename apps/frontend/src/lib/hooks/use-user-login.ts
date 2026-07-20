import { getApiDataToken, getApiDataUsername } from "@/lib/api-data/token";
import { useAuthMeQuery } from "@/redux/api/auth";

/**
 * API Data session gate.
 * Token in cookie/localStorage is the source of truth (legacy parity).
 * Optional /auth/me enriches username when the endpoint exists.
 */
export function useUserLogin() {
  const token = getApiDataToken();
  const storedUsername = getApiDataUsername();

  const { data } = useAuthMeQuery(undefined, {
    skip: !token,
  });

  if (!token) {
    return { data: undefined, authorized: false as const, unauthorized: true as const };
  }

  return {
    data: data ?? { id: 0, username: storedUsername || "user" },
    authorized: true as const,
    unauthorized: false as const,
  };
}
