import type {
  CreateFolderBody,
  FileContentResponse,
  ListEntriesResponse,
  StorageEntry,
  UploadResponse,
} from "@knitto/shared";
import { request, requestVoid } from "../http/client";

export async function listStorageEntries(path = ""): Promise<ListEntriesResponse> {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  const query = params.toString();
  return request<ListEntriesResponse>(
    `/api/file-manager/entries${query ? `?${query}` : ""}`
  );
}

export async function uploadStorageFiles(path: string, files: File[]): Promise<StorageEntry[]> {
  const form = new FormData();
  form.set("path", path);
  for (const file of files) {
    form.append("files", file);
  }

  const data = await request<UploadResponse>("/api/file-manager/upload", {
    method: "POST",
    body: form,
  });
  return data.entries;
}

export async function fetchStorageFileContent(path: string): Promise<FileContentResponse> {
  const params = new URLSearchParams({ path });
  return request<FileContentResponse>(`/api/file-manager/files/content?${params}`);
}

export async function createStorageFolder(path: string, name: string): Promise<StorageEntry> {
  const body: CreateFolderBody = { path, name };
  const data = await request<{ entry: StorageEntry }>("/api/file-manager/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.entry;
}

export async function renameStorageEntry(path: string, name: string): Promise<StorageEntry> {
  const data = await request<{ entry: StorageEntry }>("/api/file-manager/entries", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name }),
  });
  return data.entry;
}

export async function deleteStorageEntry(path: string): Promise<void> {
  await requestVoid("/api/file-manager/entries", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}
