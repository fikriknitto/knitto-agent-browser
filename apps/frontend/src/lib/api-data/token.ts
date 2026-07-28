import { env } from "@/lib/variables/env";
import { COOKIES_NAME } from "@/lib/variables/example";
import Cookies from "js-cookie";

const LS_TOKEN = "knitto.apiData.token";
const LS_USERNAME = "knitto.apiData.username";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiDataBaseUrl(): string {
  const base = env.VITE_API_DATA_BASE_URL;
  if (base?.trim()) return trimTrailingSlash(base.trim());
  return "http://localhost:8009";
}

export function apiDataUrl(path: string): string {
  const base = getApiDataBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * API Data JWT — prefer app-specific localStorage (stable across routes),
 * then cookie. Cookie alone is unreliable on localhost (generic name `token`,
 * default path scoped to /login).
 */
export function getApiDataToken(): string | null {
  try {
    const fromLs = localStorage.getItem(LS_TOKEN);
    if (fromLs?.trim()) return fromLs.trim();
  } catch {
    // ignore
  }
  const fromCookie = Cookies.get(COOKIES_NAME.Token);
  if (fromCookie?.trim()) return fromCookie.trim();
  return null;
}

export function setApiDataToken(token: string | null, username?: string): void {
  try {
    if (token) {
      localStorage.setItem(LS_TOKEN, token);
      if (username) localStorage.setItem(LS_USERNAME, username);
      // Always site-wide path so / and /login share the same cookie.
      Cookies.set(COOKIES_NAME.Token, token, { expires: 7, path: "/" });
    } else {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USERNAME);
      Cookies.remove(COOKIES_NAME.Token, { path: "/" });
      Cookies.remove(COOKIES_NAME.Token);
    }
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("knitto-api-data-token"));
  }
}

export function getApiDataUsername(): string {
  try {
    return localStorage.getItem(LS_USERNAME) ?? "";
  } catch {
    return "";
  }
}
