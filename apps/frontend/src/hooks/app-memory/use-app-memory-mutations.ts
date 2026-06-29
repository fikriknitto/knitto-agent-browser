import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppMemory,
  deleteAppMemory,
  updateAppMemory,
} from "@/lib/api/app-memory-api";
import type { AppMemoryUpdateInput, AppMemoryWriteInput } from "@/lib/app-memory/types";
import { queryKeys } from "@/query/keys";

export function useCreateAppMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppMemoryWriteInput) => createAppMemory(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.all });
    },
  });
}

export function useUpdateAppMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appId, input }: { appId: string; input: AppMemoryUpdateInput }) =>
      updateAppMemory(appId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.all });
    },
  });
}

export function useDeleteAppMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: string) => deleteAppMemory(appId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.appMemory.all });
    },
  });
}
