import type { StorageEntry } from "@knitto/shared";

type MediaLibraryModalProps = {
  open: boolean;
  slotsLeft: number;
  attachedPaths: string[];
  onClose: () => void;
  onApply: (entries: StorageEntry[]) => void | Promise<void>;
  onEntryDeleted?: (path: string) => void;
  onEntryRenamed?: (oldPath: string, newPath: string) => void;
};

/** Stub — full media library modal not ported yet. */
export function MediaLibraryModal({ open }: MediaLibraryModalProps) {
  if (!open) return null;
  return null;
}
