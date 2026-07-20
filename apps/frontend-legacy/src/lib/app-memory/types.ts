export type AppMemorySummary = {
  appId: string;
  updatedAt: string;
  sizeBytes: number;
  preview: string;
};

export type AppMemory = AppMemorySummary & {
  content: string;
};

export type AppMemoryWriteInput = {
  appId: string;
  content: string;
};

export type AppMemoryUpdateInput = {
  content: string;
};
