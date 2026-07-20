import { useQuery } from "@tanstack/react-query";
import { listLibraryEntries } from "@/lib/api/api-data-library-api";
import { queryKeys } from "@/query/keys";

type UseLibraryEntriesOptions = {
  enabled?: boolean;
};

export function useLibraryEntries(path: string, options: UseLibraryEntriesOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.mediaLibrary.entries(path),
    queryFn: () => listLibraryEntries(path),
    enabled,
  });
}
