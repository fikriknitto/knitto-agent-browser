import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/query/keys";

export async function invalidateMediaLibraryEntries(
  queryClient: QueryClient,
  path?: string
): Promise<void> {
  if (path !== undefined) {
    await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.entries(path) });
    return;
  }
  await queryClient.invalidateQueries({ queryKey: queryKeys.mediaLibrary.all });
}

/** @deprecated Use invalidateMediaLibraryEntries */
export const invalidateStorageEntries = invalidateMediaLibraryEntries;
