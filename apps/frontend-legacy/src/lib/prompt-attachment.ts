import type { PromptAttachment } from "@knitto/shared";
import {
  getLibraryMediaPresignedUrl,
  mediaNavPath,
  parseMediaNavPath,
  uploadLibraryFiles,
} from "./api/api-data-library-api";
export type { PromptAttachment } from "@knitto/shared";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "msi",
  "dll",
  "ps1",
  "com",
  "scr",
  "vbs",
  "js",
  "mjs",
  "cjs",
  "jar",
  "app",
  "deb",
  "rpm",
]);

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  yaml: "text/yaml",
  yml: "text/yaml",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export const ACCEPTED_FILE_INPUT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml," +
  "application/pdf,text/csv,text/plain,text/markdown,application/json," +
  "text/yaml,application/xml,text/html," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/zip," +
  ".pdf,.csv,.txt,.md,.markdown,.json,.yaml,.yml,.xml,.html,.htm," +
  ".doc,.docx,.xls,.xlsx,.zip";

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function isBlockedExtension(name: string): boolean {
  const ext = fileExtension(name);
  return ext ? BLOCKED_EXTENSIONS.has(ext) : false;
}

function resolveKindFromMeta(name: string, mimeType?: string): "image" | "file" | null {
  if (isBlockedExtension(name)) return null;

  if (mimeType && IMAGE_TYPES.has(mimeType)) return "image";
  if (mimeType?.startsWith("image/")) return "image";

  const ext = fileExtension(name);
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) return "image";
  if (ext) return "file";

  if (mimeType && mimeType !== "application/octet-stream") return "file";

  return null;
}

function resolveKind(file: File): "image" | "file" | null {
  if (isBlockedExtension(file.name)) return null;
  if (file.type && IMAGE_TYPES.has(file.type)) return "image";
  if (file.type?.startsWith("image/")) return "image";
  return resolveKindFromMeta(file.name, file.type);
}

function resolveMimeType(file: File, kind: "image" | "file"): string {
  const ext = fileExtension(file.name);
  return (
    file.type ||
    (ext ? EXT_TO_MIME[ext] : undefined) ||
    (kind === "image" ? "image/png" : "application/octet-stream")
  );
}

export function isAcceptedStorageEntry(name: string, mimeType?: string): boolean {
  return resolveKindFromMeta(name, mimeType) !== null;
}

export function isAcceptedAttachment(file: File): boolean {
  return resolveKind(file) !== null;
}

export function isPasteableImage(file: File): boolean {
  return resolveKind(file) === "image";
}

export function storageEntryToPromptAttachment(entry: {
  path: string;
  name: string;
  mimeType?: string;
  size?: number;
}): PromptAttachment {
  const kind = resolveKindFromMeta(entry.name, entry.mimeType);
  if (!kind) {
    throw new Error("Tipe file tidak didukung. File executable atau tanpa ekstensi tidak diizinkan.");
  }

  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (entry.size != null && entry.size > maxBytes) {
    const limitMb = maxBytes / (1024 * 1024);
    throw new Error(`Ukuran file maksimal ${limitMb} MB (${kind === "image" ? "gambar" : "dokumen"}).`);
  }

  const ext = fileExtension(entry.name);
  const mimeType =
    entry.mimeType ||
    (ext ? EXT_TO_MIME[ext] : undefined) ||
    (kind === "image" ? "image/png" : "application/octet-stream");

  const mediaId = parseMediaNavPath(entry.path);
  return {
    storagePath: mediaId != null ? "" : entry.path,
    mediaId: mediaId ?? undefined,
    mimeType,
    name: entry.name,
    kind,
  };
}

export async function fileToPromptAttachment(file: File): Promise<PromptAttachment> {
  const kind = resolveKind(file);
  if (!kind) {
    throw new Error("Tipe file tidak didukung. File executable atau tanpa ekstensi tidak diizinkan.");
  }

  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (file.size > maxBytes) {
    const limitMb = maxBytes / (1024 * 1024);
    throw new Error(`Ukuran file maksimal ${limitMb} MB (${kind === "image" ? "gambar" : "dokumen"}).`);
  }

  const entries = await uploadLibraryFiles("", [file]);
  const entry = entries[0];
  if (!entry) throw new Error("Gagal mengunggah file ke API Data library");

  return storageEntryToPromptAttachment({
    path: entry.path,
    name: entry.name,
    mimeType: resolveMimeType(file, kind),
    size: file.size,
  });
}

export async function filesToPromptAttachments(
  files: FileList | File[]
): Promise<PromptAttachment[]> {
  const list = Array.from(files).filter(isAcceptedAttachment);
  return Promise.all(list.map(fileToPromptAttachment));
}

export function attachmentKey(attachment: PromptAttachment): string {
  if (attachment.mediaId != null) return mediaNavPath(attachment.mediaId);
  return (attachment.storagePath ?? "").trim();
}

export function isSameAttachment(
  attachment: PromptAttachment,
  entryPath: string
): boolean {
  const mediaId = parseMediaNavPath(entryPath);
  if (mediaId != null) return attachment.mediaId === mediaId;
  return (attachment.storagePath ?? "") === entryPath;
}

export function storageEntryImageSrc(_storagePath: string): string {
  return "";
}

const mediaUrlCache = new Map<number, string>();

export async function ensureLibraryEntryImageSrc(navPath: string): Promise<string> {
  const mediaId = parseMediaNavPath(navPath);
  if (mediaId == null) return "";
  const cached = mediaUrlCache.get(mediaId);
  if (cached) return cached;
  const url = await getLibraryMediaPresignedUrl(mediaId);
  mediaUrlCache.set(mediaId, url);
  return url;
}

export function promptAttachmentImageSrc(attachment: PromptAttachment): string {
  if (attachment.kind !== "image") return "";
  if (attachment.mediaId != null) {
    return mediaUrlCache.get(attachment.mediaId) ?? "";
  }
  return "";
}

/** Resolve/cache presigned URL for image preview chips. */
export async function ensurePromptAttachmentImageSrc(
  attachment: PromptAttachment
): Promise<string> {
  if (attachment.kind !== "image" || attachment.mediaId == null) return "";
  return ensureLibraryEntryImageSrc(mediaNavPath(attachment.mediaId));
}

export function promptAttachmentTitle(attachment: PromptAttachment): string {
  if (attachment.mediaId != null) {
    return `${attachment.name} (mediaId ${attachment.mediaId})`;
  }
  return `${attachment.name} (storage/${attachment.storagePath})`;
}

export function attachmentExtension(name: string): string {
  const ext = fileExtension(name);
  return ext ? ext.toUpperCase() : "FILE";
}

export function formatAttachmentSummary(attachments: PromptAttachment[]): string {
  if (!attachments.length) return "";
  const images = attachments.filter((a) => a.kind === "image").length;
  const files = attachments.filter((a) => a.kind === "file").length;
  const parts: string[] = [];
  if (images) parts.push(`${images} gambar`);
  if (files) parts.push(`${files} file`);
  return `[${attachments.length} lampiran: ${parts.join(", ")}]`;
}

function pathPrefix(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export function storagePathAffectsAttachments(
  storagePath: string,
  attachments: PromptAttachment[]
): boolean {
  const mediaId = parseMediaNavPath(storagePath);
  if (mediaId != null) {
    return attachments.some((item) => item.mediaId === mediaId);
  }
  const prefix = pathPrefix(storagePath);
  return attachments.some(
    (item) =>
      item.storagePath === storagePath ||
      (item.storagePath?.startsWith(prefix) ?? false)
  );
}

export function storagePathAffectsPaths(storagePath: string, paths: string[]): boolean {
  const prefix = pathPrefix(storagePath);
  return paths.some((item) => item === storagePath || item.startsWith(prefix));
}

export function syncAttachmentsAfterDelete(
  attachments: PromptAttachment[],
  deletedPath: string
): PromptAttachment[] {
  const mediaId = parseMediaNavPath(deletedPath);
  if (mediaId != null) {
    return attachments.filter((item) => item.mediaId !== mediaId);
  }
  const prefix = pathPrefix(deletedPath);
  return attachments.filter(
    (item) =>
      item.storagePath !== deletedPath &&
      !(item.storagePath?.startsWith(prefix) ?? false)
  );
}

export function syncAttachmentsAfterRename(
  attachments: PromptAttachment[],
  oldPath: string,
  newPath: string
): PromptAttachment[] {
  const oldMedia = parseMediaNavPath(oldPath);
  if (oldMedia != null) {
    const newMedia = parseMediaNavPath(newPath);
    return attachments.map((item) =>
      item.mediaId === oldMedia
        ? {
            ...item,
            mediaId: newMedia ?? item.mediaId,
            name: newPath.split("/").pop() ?? item.name,
            storagePath: newMedia != null ? "" : item.storagePath,
          }
        : item
    );
  }
  const oldPrefix = pathPrefix(oldPath);
  return attachments.map((item) => {
    if (item.storagePath === oldPath) {
      const name = newPath.split("/").pop() ?? item.name;
      return { ...item, storagePath: newPath, name };
    }
    if (item.storagePath?.startsWith(oldPrefix)) {
      const suffix = item.storagePath.slice(oldPath.length);
      const updatedPath = `${newPath}${suffix}`;
      const name = updatedPath.split("/").pop() ?? item.name;
      return { ...item, storagePath: updatedPath, name };
    }
    return item;
  });
}

export { mediaNavPath, parseMediaNavPath };
