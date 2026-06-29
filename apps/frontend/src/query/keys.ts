export const queryKeys = {
  promptShortcuts: {
    all: ["prompt-shortcuts"] as const,
    list: () => [...queryKeys.promptShortcuts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.promptShortcuts.all, "detail", id] as const,
  },
  fileManager: {
    all: ["file-manager"] as const,
    entries: (path: string) => [...queryKeys.fileManager.all, "entries", path] as const,
    fileContent: (path: string) => [...queryKeys.fileManager.all, "content", path] as const,
  },
  appMemory: {
    all: ["app-memory"] as const,
    list: () => [...queryKeys.appMemory.all, "list"] as const,
    detail: (appId: string) => [...queryKeys.appMemory.all, "detail", appId] as const,
  },
};
