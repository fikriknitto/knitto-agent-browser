function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiDataBaseUrl(): string {
  const base = import.meta.env.VITE_API_DATA_BASE_URL;
  if (typeof base === "string" && base.trim()) {
    return trimTrailingSlash(base.trim());
  }
  return "http://localhost:8009";
}

export function apiDataUrl(path: string): string {
  const base = getApiDataBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

const TOKEN_KEY = "knitto.apiData.token";
const USER_KEY = "knitto.apiData.username";

export function getStoredApiDataToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiDataToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getStoredApiDataUsername(): string {
  try {
    return localStorage.getItem(USER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredApiDataUsername(username: string): void {
  try {
    localStorage.setItem(USER_KEY, username);
  } catch {
    // ignore
  }
}

type Envelope<T> = { message?: string; result?: T };

export async function apiDataRequest<T>(
  path: string,
  opts: {
    method: string
    token?: string | null
    body?: unknown
    formData?: FormData
  }
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(apiDataUrl(path), {
    method: opts.method,
    headers,
    body,
  });

  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok) {
    throw new Error(json.message || `API Data error HTTP ${res.status}`);
  }
  return json.result as T;
}

/** Authenticated JSON/Form helper using stored JWT. */
export async function apiDataJsonAuthed<T>(
  path: string,
  opts: { method?: string; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const token = getStoredApiDataToken();
  if (!token) throw new Error("Login API Data dulu.");
  return apiDataRequest<T>(path, {
    method: opts.method ?? "GET",
    token,
    body: opts.body,
    formData: opts.formData,
  });
}
