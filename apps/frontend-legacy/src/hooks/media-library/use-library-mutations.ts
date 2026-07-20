import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLibraryFolder,
  deleteLibraryEntry,
  renameLibraryEntry,
  uploadLibraryFiles,
} from "@/lib/api/api-data-library-api";
import { queryKeys } from "@/query/keys";

export function useUploadLibraryFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, files }: { path: string; files: File[] }) =>
      uploadLibraryFiles(path, files),
    onSuccess: async (_data, { path }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.entries(path) });
    },
  });
}

export function useCreateLibraryFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, name }: { path: string; name: string }) =>
      createLibraryFolder(path, name),
    onSuccess: async (_data, { path }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.entries(path) });
    },
  });
}

export function useRenameLibraryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, name }: { path: string; name: string }) =>
      renameLibraryEntry(path, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.all });
    },
  });
}

export function useDeleteLibraryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => deleteLibraryEntry(path),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.all });
    },
  });
}

export function useLibraryMutations(currentPath: string) {
  const upload = useUploadLibraryFiles();
  const createFolder = useCreateLibraryFolder();
  const renameEntry = useRenameLibraryEntry();
  const deleteEntry = useDeleteLibraryEntry();

  return {
    uploadFiles: (files: FileList | File[]) =>
      upload.mutateAsync({ path: currentPath, files: Array.from(files) }),
    createFolder: (name: string) => createFolder.mutateAsync({ path: currentPath, name }),
    renameEntry: (path: string, name: string) => renameEntry.mutateAsync({ path, name }),
    deleteEntry: (path: string) => deleteEntry.mutateAsync(path),
    isUploading: upload.isPending,
    isMutating:
      upload.isPending ||
      createFolder.isPending ||
      renameEntry.isPending ||
      deleteEntry.isPending,
  };
}
