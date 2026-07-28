import type { StorageEntry } from "@knitto/shared";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import {
  ENTRY_ICON_LABEL,
  formatBytes,
  resolveEntryIcon,
  type EntryIconKind,
} from "@/lib/file-utils";
import {
  ensureLibraryEntryImageSrc,
  isAcceptedStorageEntry,
} from "@/lib/utils/prompt-attachment";
import { Button } from "@/components/chat/ui";

export type FileSelectModifiers = {
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

type FileCardProps = {
  entry: StorageEntry;
  viewMode: "grid" | "list";
  selected: boolean;
  managed?: boolean;
  alreadyAttached: boolean;
  /** `attach` = hanya file yang boleh dilampirkan; `manage` = semua file bisa dipilih. */
  selectionMode?: "attach" | "manage";
  onOpen: (entry: StorageEntry) => void;
  onSelect: (entry: StorageEntry, modifiers: FileSelectModifiers) => void;
  onRename?: (entry: StorageEntry) => void;
  onDelete?: (entry: StorageEntry) => void;
  onManage?: (entry: StorageEntry) => void;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function emptyModifiers(): FileSelectModifiers {
  return { ctrlKey: false, shiftKey: false, metaKey: false };
}

const selectedMark =
  "absolute right-1.5 top-1.5 z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[0.7rem] font-bold text-white shadow-sm";

function FileEntryIcon({
  entry,
  iconKind,
  icon,
  variant,
}: {
  entry: StorageEntry;
  iconKind: EntryIconKind;
  icon: string;
  variant: "grid" | "list";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const showImage = entry.type === "file" && iconKind === "image" && !imageFailed;

  useEffect(() => {
    if (!showImage) {
      setImageSrc("");
      return;
    }
    let cancelled = false;
    void ensureLibraryEntryImageSrc(entry.path).then((url) => {
      if (!cancelled) setImageSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [entry.path, showImage]);

  if (variant === "list") {
    if (!showImage || !imageSrc) {
      return (
        <div
          className="flex h-8 w-8 items-center justify-center text-[1.15rem] leading-none"
          aria-hidden="true"
        >
          {icon}
        </div>
      );
    }
    return (
      <div
        className="h-8 w-8 overflow-hidden rounded-md border border-black/10 bg-black/5 dark:border-white/10 dark:bg-black/40"
        aria-hidden="true"
      >
        <img
          className="h-full w-full object-cover"
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  // Gallery tile preview
  if (showImage && imageSrc) {
    return (
      <div className="aspect-square w-full overflow-hidden bg-black/5 dark:bg-black/40" aria-hidden="true">
        <img
          className="h-full w-full object-cover"
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex aspect-square w-full items-center justify-center bg-black/[0.04] text-[2.5rem] leading-none dark:bg-white/[0.04]"
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

function EntryActions({
  entry,
  variant,
  onRename,
  onDelete,
}: {
  entry: StorageEntry;
  variant: "grid" | "list";
  onRename?: (entry: StorageEntry) => void;
  onDelete?: (entry: StorageEntry) => void;
}) {
  if (!onRename && !onDelete) return null;

  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const positionClass =
    variant === "list" ? "right-10 top-1/2 -translate-y-1/2" : "left-1.5 top-1.5";

  return (
    <div
      className={cn(
        "absolute z-[2] flex gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100",
        positionClass
      )}
      onClick={stop}
      onMouseDown={stop}
    >
      {onRename && (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="border-black/10 bg-white/95 text-black-80 hover:bg-black/5 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={`Ubah nama ${entry.name}`}
          title="Ubah nama"
          onClick={() => onRename(entry)}
        >
          <PencilIcon className="h-3.5 w-3.5" aria-hidden />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="border-black/10 bg-white/95 text-red-600 hover:bg-red-50 dark:border-white/10 dark:bg-slate-900/90 dark:text-red-300 dark:hover:bg-red-950/80"
          aria-label={`Hapus ${entry.name}`}
          title="Hapus"
          onClick={() => onDelete(entry)}
        >
          <Trash2Icon className="h-3.5 w-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );
}

export function FileCard({
  entry,
  viewMode,
  selected,
  managed = false,
  alreadyAttached,
  selectionMode = "attach",
  onOpen,
  onSelect,
  onRename,
  onDelete,
  onManage,
}: FileCardProps) {
  const iconKind = resolveEntryIcon(entry.type, entry.extension);
  const icon = ENTRY_ICON_LABEL[iconKind];
  const isFolder = entry.type === "folder";
  const attachable = !isFolder && isAcceptedStorageEntry(entry.name, entry.mimeType);
  const canSelect =
    !isFolder &&
    !alreadyAttached &&
    (selectionMode === "manage" || attachable);
  const metaLine = isFolder
    ? "Folder"
    : `${formatBytes(entry.size ?? 0)} · ${formatDate(entry.updatedAt)}`;

  const handleMouseDown = (event: MouseEvent) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (isFolder) {
      onOpen(entry);
      return;
    }
    if (!canSelect) return;
    onSelect(entry, {
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isFolder) {
      onOpen(entry);
      return;
    }
    if (canSelect) onSelect(entry, emptyModifiers());
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onManage?.(entry);
  };

  const title = isFolder
    ? `Buka folder ${entry.name}`
    : alreadyAttached
      ? `${entry.name} — sudah dilampirkan`
      : canSelect
        ? `${entry.name} — ${metaLine}`
        : `${entry.name} — tipe tidak didukung (executable / tanpa ekstensi)`;

  const managedRing = managed && "ring-1 ring-blue-500/50";

  const listClass = cn(
    "group relative grid select-none grid-cols-[2rem_1fr_5.5rem_6.5rem] items-center gap-3 border-b border-black/5 px-4 py-2 text-[0.82rem] outline-none transition dark:border-white/4",
    isFolder &&
      "cursor-pointer hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-slate-800/55 dark:focus-visible:bg-slate-800/55",
    canSelect &&
      "cursor-pointer hover:bg-emerald-500/10 focus-visible:bg-emerald-500/10 dark:hover:bg-emerald-900/20 dark:focus-visible:bg-emerald-900/20",
    selected && "bg-emerald-500/15 dark:bg-emerald-900/35",
    (alreadyAttached || (!canSelect && !isFolder)) && "cursor-not-allowed opacity-50",
    managedRing
  );

  const gridClass = cn(
    "group relative flex select-none flex-col overflow-hidden rounded-xl border border-black/10 bg-white outline-none transition dark:border-white/10 dark:bg-[rgba(20,24,36,0.55)]",
    isFolder &&
      "cursor-pointer hover:border-blue-500/40 hover:shadow-sm focus-visible:border-blue-500/40 dark:hover:border-blue-500/35 dark:hover:bg-slate-800/65",
    canSelect &&
      "cursor-pointer hover:border-emerald-500/45 hover:shadow-sm focus-visible:border-emerald-500/45 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-900/20",
    selected &&
      "border-emerald-500/70 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)] dark:border-emerald-500/65 dark:bg-emerald-900/35",
    (alreadyAttached || (!canSelect && !isFolder)) && "cursor-not-allowed opacity-50",
    managedRing
  );

  if (viewMode === "list") {
    return (
      <div
        className={listClass}
        role="button"
        tabIndex={0}
        title={title}
        aria-pressed={!isFolder && canSelect ? selected : undefined}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onContextMenu={onManage ? handleContextMenu : undefined}
      >
        <EntryActions entry={entry} variant="list" onRename={onRename} onDelete={onDelete} />
        <FileEntryIcon entry={entry} iconKind={iconKind} icon={icon} variant="list" />
        <span className="truncate text-black-100 dark:text-slate-100">{entry.name}</span>
        <span className="text-[0.78rem] text-black-40 dark:text-slate-500">
          {isFolder ? "Folder" : formatBytes(entry.size ?? 0)}
        </span>
        <span className="text-[0.78rem] text-black-40 dark:text-slate-500">
          {formatDate(entry.updatedAt)}
        </span>
        {selected && (
          <span className={selectedMark} aria-hidden="true">
            ✓
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={gridClass}
      role="button"
      tabIndex={0}
      title={title}
      aria-pressed={!isFolder && canSelect ? selected : undefined}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      onContextMenu={onManage ? handleContextMenu : undefined}
    >
      <EntryActions entry={entry} variant="grid" onRename={onRename} onDelete={onDelete} />
      {selected && (
        <span className={selectedMark} aria-hidden="true">
          ✓
        </span>
      )}
      <FileEntryIcon entry={entry} iconKind={iconKind} icon={icon} variant="grid" />
      <div className="border-t border-black/5 px-2 py-1.5 dark:border-white/8">
        <p className="m-0 w-full truncate text-left text-[0.75rem] font-medium text-black-100 dark:text-slate-100">
          {entry.name}
        </p>
      </div>
    </div>
  );
}
