import { useQuery } from "@tanstack/react-query";
import { getAppMemory, listAppMemories } from "@/lib/api/app-memory-api";
import { queryKeys } from "@/query/keys";

export function useAppMemories() {
  return useQuery({
    queryKey: queryKeys.appMemory.list(),
    queryFn: listAppMemories,
  });
}

export function useAppMemory(appId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.appMemory.detail(appId ?? ""),
    queryFn: () => getAppMemory(appId!),
    enabled: Boolean(appId),
  });
}
