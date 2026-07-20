import { useCallback, useMemo, useState } from "react";
import type { StorageEntry, StorageSummary } from "@knitto/shared";
import { useLibraryEntries } from "./media-library/use-library-entries";
import { useLibraryMutations } from "./media-library/use-library-mutations";

export type SortField = "name" | "date" | "size";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list";

type UseMediaLibraryOptions = {
  enabled: boolean;
};

export function useMediaLibrary({ enabled }: UseMediaLibraryOptions) {
  const [currentPath, setCurrentPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useLibraryEntries(currentPath, { enabled });

  const mutations = useLibraryMutations(currentPath);

  const entries = data?.entries ?? [];
  const summary: StorageSummary = data?.summary ?? { itemCount: 0, totalBytes: 0 };
  const loading = isLoading;
  const error =
    mutationError ??
    (isError
      ? queryError instanceof Error
        ? queryError.message
        : "Gagal memuat media library"
      : null);

  const navigate = useCallback((path: string) => {
    setSearchQuery("");
    setCurrentPath(path);
    setMutationError(null);
  }, []);

  const openFolder = useCallback(
    (entry: StorageEntry) => {
      if (entry.type !== "folder") return;
      navigate(entry.path);
    },
    [navigate]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setMutationError(null);
      try {
        await mutations.uploadFiles(list);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Gagal mengunggah file");
      }
    },
    [mutations]
  );

  const createFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setMutationError(null);
      try {
        await mutations.createFolder(trimmed);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Gagal membuat folder");
        throw err;
      }
    },
    [mutations]
  );

  const renameEntry = useCallback(
    async (path: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      setMutationError(null);
      try {
        return await mutations.renameEntry(path, trimmed);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Gagal mengubah nama");
        throw err;
      }
    },
    [mutations]
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      setMutationError(null);
      try {
        await mutations.deleteEntry(path);
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : "Gagal menghapus");
        throw err;
      }
    },
    [mutations]
  );

  const visibleEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = query
      ? entries.filter((entry) => entry.name.toLowerCase().includes(query))
      : [...entries];

    const dir = sortDirection === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      if (sortField === "date") {
        return dir * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
      }
      if (sortField === "size") {
        const aSize = a.size ?? 0;
        const bSize = b.size ?? 0;
        return dir * (aSize - bSize);
      }
      return dir * a.name.localeCompare(b.name);
    });

    return list;
  }, [entries, searchQuery, sortField, sortDirection]);

  return {
    currentPath,
    entries: visibleEntries,
    summary,
    loading,
    uploading: mutations.isUploading,
    error,
    searchQuery,
    sortField,
    sortDirection,
    viewMode,
    setSearchQuery,
    setSortField,
    setSortDirection,
    setViewMode,
    navigate,
    openFolder,
    uploadFiles,
    createFolder,
    renameEntry,
    deleteEntry,
    refresh: () => void refetch(),
    setError: setMutationError,
  };
}

/** @deprecated Use useMediaLibrary */
export const useFileManager = useMediaLibrary;
