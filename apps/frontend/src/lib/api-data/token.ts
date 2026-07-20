import { env } from "@/lib/variables/env";
import { COOKIES_NAME } from "@/lib/variables/example";
import Cookies from "js-cookie";

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

/** Prefer js-cookie (template pattern); fall back to legacy localStorage key. */
export function getApiDataToken(): string | null {
  const fromCookie = Cookies.get(COOKIES_NAME.Token);
  if (fromCookie) return fromCookie;
  try {
    return localStorage.getItem("knitto.apiData.token");
  } catch {
    return null;
  }
}

export function setApiDataToken(token: string | null, username?: string): void {
  try {
    if (token) {
      Cookies.set(COOKIES_NAME.Token, token, { expires: 7 });
      localStorage.setItem("knitto.apiData.token", token);
      if (username) localStorage.setItem("knitto.apiData.username", username);
    } else {
      Cookies.remove(COOKIES_NAME.Token);
      localStorage.removeItem("knitto.apiData.token");
      localStorage.removeItem("knitto.apiData.username");
    }
  } catch {
    // ignore
  }
}

export function getApiDataUsername(): string {
  try {
    return localStorage.getItem("knitto.apiData.username") ?? "";
  } catch {
    return "";
  }
}
