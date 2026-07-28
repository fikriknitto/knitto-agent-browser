import { useCallback, useState } from "react";
import {
  createLibraryFolder,
  deleteLibraryEntry,
  renameLibraryEntry,
  uploadLibraryFiles,
} from "@/lib/api/api-data-library-api";
import { invalidateMediaLibraryEntries } from "@/query/invalidate-media-library";

export function useLibraryMutations(currentPath: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsUploading(true);
      setIsMutating(true);
      try {
        const result = await uploadLibraryFiles(currentPath, Array.from(files));
        await invalidateMediaLibraryEntries(currentPath);
        return result;
      } finally {
        setIsUploading(false);
        setIsMutating(false);
      }
    },
    [currentPath]
  );

  const createFolder = useCallback(
    async (name: string) => {
      setIsMutating(true);
      try {
        const result = await createLibraryFolder(currentPath, name);
        await invalidateMediaLibraryEntries(currentPath);
        return result;
      } finally {
        setIsMutating(false);
      }
    },
    [currentPath]
  );

  const renameEntry = useCallback(async (path: string, name: string) => {
    setIsMutating(true);
    try {
      const result = await renameLibraryEntry(path, name);
      await invalidateMediaLibraryEntries();
      return result;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const deleteEntry = useCallback(async (path: string) => {
    setIsMutating(true);
    try {
      await deleteLibraryEntry(path);
      await invalidateMediaLibraryEntries();
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    uploadFiles,
    createFolder,
    renameEntry,
    deleteEntry,
    isUploading,
    isMutating,
  };
}
