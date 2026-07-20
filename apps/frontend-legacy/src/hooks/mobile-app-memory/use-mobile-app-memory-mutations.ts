import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMobileAppMemory,
  deleteMobileAppMemory,
  updateMobileAppMemory,
} from "@/lib/api/mobile-app-memory-api";
import type { AppMemoryUpdateInput, AppMemoryWriteInput } from "@/lib/app-memory/types";
import { queryKeys } from "@/query/keys";

export function useCreateMobileAppMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AppMemoryWriteInput) => createMobileAppMemory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.mobile.all });
    },
  });
}

export function useUpdateMobileAppMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, input }: { appId: string; input: AppMemoryUpdateInput }) =>
      updateMobileAppMemory(appId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.mobile.all });
    },
  });
}

export function useDeleteMobileAppMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => deleteMobileAppMemory(appId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.mobile.all });
    },
  });
}
