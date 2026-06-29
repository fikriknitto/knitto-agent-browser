function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Backend origin in dev; empty = same-origin (nginx /api proxy in production). */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_BASE_URL_BACKEND;
  if (base !== undefined) {
    const trimmed = base.trim();
    if (trimmed === "" || trimmed === "/") return "";
    return trimTrailingSlash(trimmed);
  }

  if (import.meta.env.PROD) return "";
  return "http://localhost:3080";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}

export function resolveApiUrl(pathOrUrl: string): string {
  const value = pathOrUrl.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return apiUrl(value.startsWith("/") ? value : `/${value}`);
}
