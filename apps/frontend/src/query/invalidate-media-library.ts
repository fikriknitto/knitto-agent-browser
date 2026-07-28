type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify media-library entry hooks to refetch (no React Query in new FE). */
export async function invalidateMediaLibraryEntries(_path?: string): Promise<void> {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function subscribeMediaLibraryInvalidate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** @deprecated Use invalidateMediaLibraryEntries */
export const invalidateStorageEntries = invalidateMediaLibraryEntries;
