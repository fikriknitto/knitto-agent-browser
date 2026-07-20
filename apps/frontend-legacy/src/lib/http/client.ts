import { resolveApiUrl } from "../api/config";

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string | Record<string, unknown> };
    if (typeof data.error === "string") return data.error;
    if (data.error) return JSON.stringify(data.error);
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
}

function resolveRequestUrl(input: RequestInfo): RequestInfo {
  if (typeof input === "string" && input.startsWith("/")) {
    return resolveApiUrl(input);
  }
  return input;
}

export async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveRequestUrl(input), init);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function requestVoid(input: RequestInfo, init?: RequestInit): Promise<void> {
  const response = await fetch(resolveRequestUrl(input), init);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}
