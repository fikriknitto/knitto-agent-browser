import {
  apiDataUrl,
  getApiDataBaseUrl,
  getApiDataToken,
  getApiDataUsername,
  setApiDataToken,
} from "@/lib/api-data/token";

export {
  apiDataUrl,
  getApiDataBaseUrl,
  getApiDataToken,
  getApiDataUsername,
  setApiDataToken,
};

/** Alias used by ported legacy helpers. */
export const getStoredApiDataToken = getApiDataToken;
export const getStoredApiDataUsername = getApiDataUsername;
export const setStoredApiDataToken = (token: string | null) => setApiDataToken(token);

type Envelope<T> = { message?: string; result?: T };

export async function apiDataRequest<T>(
  path: string,
  opts: {
    method: string;
    token?: string | null;
    body?: unknown;
    formData?: FormData;
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

/** Authenticated JSON/Form helper using cookie/localStorage JWT. */
export async function apiDataJsonAuthed<T>(
  path: string,
  opts: { method?: string; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const token = getApiDataToken();
  if (!token) throw new Error("Login API Data dulu.");
  return apiDataRequest<T>(path, {
    method: opts.method ?? "GET",
    token,
    body: opts.body,
    formData: opts.formData,
  });
}
