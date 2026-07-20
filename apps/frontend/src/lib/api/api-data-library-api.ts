import type { StorageEntry } from "@knitto/shared";

export function mediaNavPath(mediaId: number): string {
  return `media:${mediaId}`;
}

export function parseMediaNavPath(navPath: string): number | null {
  const m = navPath.trim().match(/^media:(\d+)$/);
  return m ? Number(m[1]) : null;
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

/** Stub — media library upload not ported yet. */
export async function uploadLibraryFiles(
  _folderNav: string,
  _files: File[]
): Promise<StorageEntry[]> {
  throw new Error("Media library API not ported yet — attach via library UI later.");
}

export async function getLibraryMediaPresignedUrl(_mediaId: number): Promise<string> {
  throw new Error("Media library API not ported yet");
}
