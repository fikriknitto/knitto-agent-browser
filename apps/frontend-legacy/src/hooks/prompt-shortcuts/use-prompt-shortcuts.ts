import { useQuery } from "@tanstack/react-query";
import { getPromptShortcut, listPromptShortcuts } from "@/lib/api/prompt-shortcuts-api";
import { queryKeys } from "@/query/keys";

export function usePromptShortcuts() {
  return useQuery({
    queryKey: queryKeys.promptShortcuts.list(),
    queryFn: listPromptShortcuts,
  });
}

export function usePromptShortcut(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.promptShortcuts.detail(id ?? ""),
    queryFn: () => getPromptShortcut(id!),
    enabled: Boolean(id),
  });
}
