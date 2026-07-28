import type { ListEntriesResponse, StorageEntry } from "@knitto/shared";
import {
  apiDataJsonAuthed,
  apiDataUrl,
  getStoredApiDataToken,
} from "./api-data-client";

export type ApiMediaFolder = {
  folderId: number
  parentId: number | null
  name: string
  path: string
  createdAt: string
};

export type ApiMediaItem = {
  mediaId: number
  folderId: number | null
  name: string
  kind: string
  contentType: string | null
  bytes: number | null
  createdAt: string
};

const LIBRARY_SOURCES = ["upload_ui", "attachment"] as const;

function requireLibraryToken(): string {
  const token = getStoredApiDataToken();
  if (!token) throw new Error("Login API Data dulu untuk media library.");
  return token;
}

async function libraryJson<T>(
  path: string,
  opts: { method?: string; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  requireLibraryToken();
  try {
    return await apiDataJsonAuthed<T>(path, opts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Login API Data dulu")) {
      throw new Error("Login API Data dulu untuk media library.");
    }
    throw e;
  }
}

export function folderNavPath(folderId: number | null): string {
  return folderId == null ? "" : `folder:${folderId}`;
}

export function parseFolderNavPath(navPath: string): number | null {
  const trimmed = navPath.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^folder:(\d+)$/);
  if (!m) return null;
  return Number(m[1]);
}

export function mediaNavPath(mediaId: number): string {
  return `media:${mediaId}`;
}

export function parseMediaNavPath(navPath: string): number | null {
  const m = navPath.trim().match(/^media:(\d+)$/);
  return m ? Number(m[1]) : null;
}

function folderToEntry(f: ApiMediaFolder): StorageEntry {
  return {
    id: `folder-${f.folderId}`,
    name: f.name,
    type: "folder",
    path: folderNavPath(f.folderId),
    updatedAt: f.createdAt,
  };
}

function mediaToEntry(m: ApiMediaItem): StorageEntry {
  const ext = m.name.includes(".") ? m.name.split(".").pop() : undefined;
  return {
    id: `media-${m.mediaId}`,
    name: m.name,
    type: "file",
    path: mediaNavPath(m.mediaId),
    mimeType: m.contentType ?? undefined,
    extension: ext,
    size: m.bytes ?? undefined,
    updatedAt: m.createdAt,
  };
}

function dedupeMediaById(items: ApiMediaItem[]): ApiMediaItem[] {
  const seen = new Set<number>();
  const out: ApiMediaItem[] = [];
  for (const item of items) {
    if (seen.has(item.mediaId)) continue;
    seen.add(item.mediaId);
    out.push(item);
  }
  return out;
}

/** List folders + library media (upload_ui + attachment). Excludes worker_evidence. */
export async function listLibraryEntries(navPath: string): Promise<ListEntriesResponse> {
  const folderId = parseFolderNavPath(navPath);
  const parentQuery = folderId == null ? "parentId=" : `parentId=${folderId}`;
  const folderPart = folderId == null ? "folderId=" : `folderId=${folderId}`;

  const [folders, ...mediaLists] = await Promise.all([
    libraryJson<ApiMediaFolder[]>(`/agent/media/folders?${parentQuery}`),
    ...LIBRARY_SOURCES.map((source) =>
      libraryJson<ApiMediaItem[]>(
        `/agent/media?${folderPart}&source=${source}&limit=200`
      )
    ),
  ]);

  const media = dedupeMediaById(mediaLists.flatMap((list) => list ?? []));
  const folderEntries = (folders ?? []).map(folderToEntry);
  const mediaEntries = media.map(mediaToEntry);
  const entries = [...folderEntries, ...mediaEntries];
  const totalBytes = mediaEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

  return {
    path: navPath,
    entries,
    summary: { itemCount: entries.length, totalBytes },
  };
}

export async function createLibraryFolder(
  parentNavPath: string,
  name: string
): Promise<StorageEntry> {
  const parentId = parseFolderNavPath(parentNavPath);
  const folder = await libraryJson<ApiMediaFolder>("/agent/media/folders", {
    method: "POST",
    body: { name, parentId },
  });
  return folderToEntry(folder);
}

export async function renameLibraryEntry(
  navPath: string,
  name: string
): Promise<StorageEntry> {
  const folderId = parseFolderNavPath(navPath);
  if (folderId != null) {
    const folder = await libraryJson<ApiMediaFolder>(
      `/agent/media/folders/${folderId}`,
      { method: "PATCH", body: { name } }
    );
    return folderToEntry(folder);
  }
  throw new Error("Rename file di library belum didukung — hapus lalu upload ulang.");
}

export async function deleteLibraryEntry(navPath: string): Promise<void> {
  const folderId = parseFolderNavPath(navPath);
  if (folderId != null) {
    await libraryJson(`/agent/media/folders/${folderId}`, { method: "DELETE" });
    return;
  }
  const mediaId = parseMediaNavPath(navPath);
  if (mediaId != null) {
    await libraryJson(`/agent/media/${mediaId}`, { method: "DELETE" });
    return;
  }
  throw new Error("Path library tidak valid");
}

export async function uploadLibraryFiles(
  parentNavPath: string,
  files: File[]
): Promise<StorageEntry[]> {
  const folderId = parseFolderNavPath(parentNavPath);
  const out: StorageEntry[] = [];
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    form.append("source", "upload_ui");
    if (folderId != null) form.append("folderId", String(folderId));
    const media = await libraryJson<ApiMediaItem>("/agent/media/upload", {
      method: "POST",
      formData: form,
    });
    out.push(mediaToEntry(media));
  }
  return out;
}

export async function getLibraryMediaPresignedUrl(mediaId: number): Promise<string> {
  const result = await libraryJson<{ url: string }>(`/agent/media/${mediaId}/url`);
  return result.url;
}

export function libraryMediaContentUrl(mediaId: number): string {
  return apiDataUrl(`/agent/media/${mediaId}/content`);
}
