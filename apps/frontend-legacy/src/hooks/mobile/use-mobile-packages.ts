import { useQuery } from "@tanstack/react-query";
import { listMobilePackages } from "@/lib/api/mobile-device-api";
import { queryKeys } from "@/query/keys";

export function useMobilePackages(udid: string | null | undefined, query?: string) {
  return useQuery({
    queryKey: queryKeys.mobilePackages.list(udid ?? "", query ?? ""),
    queryFn: () => listMobilePackages(udid!, query),
    enabled: Boolean(udid?.trim()),
    staleTime: 30_000,
  });
}
