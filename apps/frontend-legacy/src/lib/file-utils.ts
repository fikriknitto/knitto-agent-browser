export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const digits = index === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export function formatItemCount(count: number): string {
  return count === 1 ? "1 Item" : `${count} Items`;
}

export function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function parentPath(path: string): string {
  const parts = splitPath(path);
  parts.pop();
  return parts.join("/");
}

export type EntryIconKind = "folder" | "image" | "video" | "audio" | "document" | "archive" | "file";

export function resolveEntryIcon(type: "file" | "folder", extension?: string): EntryIconKind {
  if (type === "folder") return "folder";
  const ext = (extension ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (["pdf", "doc", "docx", "txt", "csv", "xls", "xlsx", "md", "markdown", "json", "yaml", "yml", "xml", "html", "htm"].includes(ext)) return "document";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  return "file";
}

export const ENTRY_ICON_LABEL: Record<EntryIconKind, string> = {
  folder: "📁",
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  document: "📄",
  archive: "🗜️",
  file: "📎",
};
