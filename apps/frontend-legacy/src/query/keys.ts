export const queryKeys = {
  promptShortcuts: {
    all: ["prompt-shortcuts"] as const,
    list: () => [...queryKeys.promptShortcuts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.promptShortcuts.all, "detail", id] as const,
  },
  mediaLibrary: {
    all: ["media-library"] as const,
    entries: (path: string) => [...queryKeys.mediaLibrary.all, "entries", path] as const,
  },
  /** @deprecated Use mediaLibrary */
  fileManager: {
    all: ["media-library"] as const,
    entries: (path: string) => [...queryKeys.mediaLibrary.all, "entries", path] as const,
    fileContent: (path: string) => [...queryKeys.mediaLibrary.all, "content", path] as const,
  },
  appMemory: {
    all: ["app-memory"] as const,
    browser: {
      list: () => [...queryKeys.appMemory.all, "browser", "list"] as const,
      detail: (appId: string) => [...queryKeys.appMemory.all, "browser", "detail", appId] as const,
    },
    mobile: {
      all: ["app-memory", "mobile"] as const,
      list: () => [...queryKeys.appMemory.mobile.all, "list"] as const,
      detail: (appId: string) => [...queryKeys.appMemory.mobile.all, "detail", appId] as const,
    },
    list: () => [...queryKeys.appMemory.browser.list()] as const,
    detail: (appId: string) => [...queryKeys.appMemory.browser.detail(appId)] as const,
  },
  mobilePackages: {
    all: ["mobile-packages"] as const,
    list: (udid: string, query: string) =>
      [...queryKeys.mobilePackages.all, udid, query] as const,
  },
};
