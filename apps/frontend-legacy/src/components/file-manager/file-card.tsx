import type { StorageEntry } from "@knitto/shared";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "../../lib/cn";
import {
  ENTRY_ICON_LABEL,
  formatBytes,
  resolveEntryIcon,
  type EntryIconKind,
} from "../../lib/file-utils";
import {
  ensureLibraryEntryImageSrc,
  isAcceptedStorageEntry,
} from "../../lib/prompt-attachment";
import { Button } from "../ui";

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
  "absolute right-1.5 top-1.5 h-[1.2rem] w-[1.2rem] rounded-full bg-emerald-400/95 text-center text-[0.72rem] font-bold leading-[1.2rem] text-emerald-950";

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

  const isList = variant === "list";
  const emojiBoxClass = isList
    ? "flex h-8 w-8 items-center justify-center text-[1.15rem] leading-none"
    : "flex h-14 w-14 items-center justify-center text-[2rem] leading-none";
  const imageBoxClass = isList
    ? "h-8 w-8 overflow-hidden rounded-md border border-white/8 bg-black/25"
    : "h-14 w-14 overflow-hidden rounded-lg border border-white/8 bg-black/25";

  if (!showImage || !imageSrc) {
    return (
      <div className={emojiBoxClass} aria-hidden="true">
        {icon}
      </div>
    );
  }

  return (
    <div className={imageBoxClass} aria-hidden="true">
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
          className="border-white/10 bg-slate-900/90 text-slate-200 hover:bg-slate-700"
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
          className="border-white/10 bg-slate-900/90 text-red-300 hover:bg-red-950/80"
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
    if (!attachable || alreadyAttached) return;
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
    if (attachable && !alreadyAttached) onSelect(entry, emptyModifiers());
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onManage?.(entry);
  };

  const title = isFolder
    ? `Buka folder ${entry.name}`
    : alreadyAttached
      ? `${entry.name} — sudah dilampirkan`
      : attachable
        ? `${entry.name} — klik pilih, Ctrl+klik toggle, Shift+klik rentang`
        : `${entry.name} — tipe tidak didukung (executable / tanpa ekstensi)`;

  const managedRing = managed && "ring-1 ring-blue-500/50";

  const listClass = cn(
    "group relative grid select-none grid-cols-[2rem_1fr_5.5rem_6.5rem] items-center gap-3 border-b border-white/4 px-4 py-2 text-[0.82rem] outline-none transition",
    isFolder && "cursor-pointer hover:bg-slate-800/55 focus-visible:bg-slate-800/55",
    !isFolder && attachable && !alreadyAttached && "cursor-pointer hover:bg-emerald-900/20 focus-visible:bg-emerald-900/20",
    selected && "bg-emerald-900/35",
    (alreadyAttached || (!attachable && !isFolder)) && "cursor-not-allowed opacity-50",
    managedRing
  );

  const gridClass = cn(
    "group relative flex select-none flex-col items-center gap-2 rounded-[10px] border border-transparent bg-[rgba(20,24,36,0.45)] p-3.5 text-center outline-none transition",
    isFolder && "cursor-pointer hover:border-blue-500/35 hover:bg-slate-800/65 focus-visible:border-blue-500/35 focus-visible:bg-slate-800/65",
    !isFolder && attachable && !alreadyAttached && "cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-900/20 focus-visible:border-emerald-500/40 focus-visible:bg-emerald-900/20",
    selected && "border-emerald-500/65 bg-emerald-900/35 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.25)]",
    (alreadyAttached || (!attachable && !isFolder)) && "cursor-not-allowed opacity-50",
    managedRing
  );

  if (viewMode === "list") {
    return (
      <div
        className={listClass}
        role="button"
        tabIndex={0}
        title={title}
        aria-pressed={!isFolder && attachable ? selected : undefined}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onContextMenu={onManage ? handleContextMenu : undefined}
      >
        <EntryActions entry={entry} variant="list" onRename={onRename} onDelete={onDelete} />
        <FileEntryIcon entry={entry} iconKind={iconKind} icon={icon} variant="list" />
        <span className="truncate text-slate-100">{entry.name}</span>
        <span className="text-[0.78rem] text-slate-500">
          {isFolder ? "Folder" : formatBytes(entry.size ?? 0)}
        </span>
        <span className="text-[0.78rem] text-slate-500">{formatDate(entry.updatedAt)}</span>
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
      aria-pressed={!isFolder && attachable ? selected : undefined}
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
      <p className="m-0 w-full truncate text-[0.82rem] font-medium text-slate-100">{entry.name}</p>
      <p className="m-0 text-[0.72rem] text-slate-500">
        {isFolder
          ? "Folder"
          : `${formatBytes(entry.size ?? 0)} · ${formatDate(entry.updatedAt)}`}
      </p>
    </div>
  );
}
