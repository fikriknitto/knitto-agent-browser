import { useCallback, useEffect, useMemo, useState } from "react";
import type { StorageEntry, StorageSummary } from "@knitto/shared";
import {
  createStorageFolder,
  deleteStorageEntry,
  listStorageEntries,
  renameStorageEntry,
  uploadStorageFiles,
} from "@/lib/api/file-manager-api";
import { formatBytes, formatItemCount, splitPath } from "@/lib/file-utils";
import { Button, Input } from "@/components/chat/ui";

type SortField = "name" | "date" | "size";

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [summary, setSummary] = useState<StorageSummary>({ itemCount: 0, totalBytes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [busy, setBusy] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const reload = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStorageEntries(path);
      setEntries(data.entries ?? []);
      setSummary(data.summary ?? { itemCount: 0, totalBytes: 0 });
    } catch (err) {
      setEntries([]);
      setSummary({ itemCount: 0, totalBytes: 0 });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(currentPath);
  }, [currentPath, reload]);

  const crumbs = useMemo(() => {
    const parts = splitPath(currentPath);
    const items: { label: string; path: string }[] = [{ label: "Root", path: "" }];
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      items.push({ label: part, path: acc });
    }
    return items;
  }, [currentPath]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? entries.filter((e) => e.name.toLowerCase().includes(q))
      : [...entries];
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      if (sortField === "size") return (a.size ?? 0) - (b.size ?? 0);
      if (sortField === "date") {
        return String(a.updatedAt ?? "").localeCompare(String(b.updatedAt ?? ""));
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [entries, searchQuery, sortField]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      await uploadStorageFiles(currentPath, Array.from(files));
      await reload(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await createStorageFolder(currentPath, name);
      setNewFolderName("");
      await reload(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat folder");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (entry: StorageEntry) => {
    const name = window.prompt("Nama baru", entry.name)?.trim();
    if (!name || name === entry.name) return;
    setBusy(true);
    setError(null);
    try {
      await renameStorageEntry(entry.path, name);
      await reload(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (entry: StorageEntry) => {
    if (!window.confirm(`Hapus ${entry.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStorageEntry(entry.path);
      await reload(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">File Manager</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Browse storage worker (`/api/file-manager`). Media library API Data masih stub di chat
          modal.
        </p>
      </div>

      <div className="flex min-h-[70vh] flex-col gap-3 rounded-xl border border-white/8 bg-[rgba(12,14,22,0.6)] p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>
            {formatItemCount(summary.itemCount)} · {formatBytes(summary.totalBytes)} Total
          </span>
          {busy || loading ? <span className="text-slate-500">Memuat…</span> : null}
        </div>

        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((c, i) => (
            <span key={c.path || "root"} className="flex items-center gap-1">
              {i > 0 ? <span className="text-slate-600">/</span> : null}
              <button
                type="button"
                className="text-blue-300 hover:underline"
                onClick={() => setCurrentPath(c.path)}
              >
                {c.label}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder="Cari…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-slate-200"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="size">Size</option>
          </select>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <span className="rounded-md border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700/80">
              Upload
            </span>
          </label>
          <Input
            className="max-w-[160px]"
            placeholder="Folder baru"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={busy}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !newFolderName.trim()}
            onClick={() => void handleCreateFolder()}
          >
            Buat folder
          </Button>
        </div>

        {error ? (
          <p className="m-0 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {visible.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Folder kosong.</p>
          ) : (
            <ul className="m-0 divide-y divide-white/5 p-0">
              {visible.map((entry) => (
                <li
                  key={entry.path}
                  className="flex items-center justify-between gap-3 px-1 py-2.5 text-sm"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-slate-100 hover:text-blue-300"
                    onClick={() => {
                      if (entry.type === "folder") setCurrentPath(entry.path);
                    }}
                  >
                    <span className="mr-2 text-xs text-slate-500">
                      {entry.type === "folder" ? "DIR" : "FILE"}
                    </span>
                    {entry.name}
                    {entry.type === "file" ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {formatBytes(entry.size ?? 0)}
                      </span>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void handleRename(entry)}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-red-400"
                      disabled={busy}
                      onClick={() => void handleDelete(entry)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
