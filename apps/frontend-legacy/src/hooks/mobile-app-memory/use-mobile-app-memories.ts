import { useQuery } from "@tanstack/react-query";
import { listMobileAppMemories } from "@/lib/api/mobile-app-memory-api";
import { queryKeys } from "@/query/keys";

export function useMobileAppMemories() {
  return useQuery({
    queryKey: queryKeys.appMemory.mobile.list(),
    queryFn: listMobileAppMemories,
  });
}

export function useMobileAppMemory(appId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.appMemory.mobile.detail(appId ?? ""),
    queryFn: () =>
      import("@/lib/api/mobile-app-memory-api").then((m) => m.getMobileAppMemory(appId!)),
    enabled: Boolean(appId),
  });
}
