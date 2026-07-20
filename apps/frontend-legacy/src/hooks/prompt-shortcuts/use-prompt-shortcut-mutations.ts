import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPromptShortcut,
  deletePromptShortcut,
  generatePromptShortcutTemplate,
  updatePromptShortcut,
} from "@/lib/api/prompt-shortcuts-api";
import type {
  GeneratePromptShortcutInput,
  PromptShortcutWriteInput,
} from "@/lib/prompt-shortcuts/types";
import { queryKeys } from "@/query/keys";

export function useCreatePromptShortcut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PromptShortcutWriteInput) => createPromptShortcut(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.promptShortcuts.all });
    },
  });
}

export function useUpdatePromptShortcut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PromptShortcutWriteInput }) =>
      updatePromptShortcut(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.promptShortcuts.all });
    },
  });
}

export function useDeletePromptShortcut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePromptShortcut(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.promptShortcuts.all });
    },
  });
}

export function useGeneratePromptShortcut() {
  return useMutation({
    mutationFn: (input: GeneratePromptShortcutInput) => generatePromptShortcutTemplate(input),
  });
}
