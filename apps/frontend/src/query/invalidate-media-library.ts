/** Stub — media library React Query cache not ported yet. */
export async function invalidateMediaLibraryEntries(
  _queryClient?: unknown,
  _path?: string
): Promise<void> {
  // no-op
}

/** @deprecated Use invalidateMediaLibraryEntries */
export const invalidateStorageEntries = invalidateMediaLibraryEntries;
