import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatLine } from "@/types/automation";

type AutomationState = {
  chatLines: ChatLine[];
  workerState: "idle" | "busy";
  lastSubmittedJobId: string | null;
};

const initialState: AutomationState = {
  chatLines: [],
  workerState: "idle",
  lastSubmittedJobId: null,
};

const automationSlice = createSlice({
  name: "automation",
  initialState,
  reducers: {
    appendChatLine(state, action: PayloadAction<ChatLine>) {
      state.chatLines.push(action.payload);
    },
    upsertAgentChatLine(state, action: PayloadAction<ChatLine>) {
      const idx = state.chatLines.findIndex(
        (l) => l.id === action.payload.id && l.role === "agent"
      );
      if (idx >= 0) state.chatLines[idx] = action.payload;
      else state.chatLines.push(action.payload);
    },
    setWorkerState(state, action: PayloadAction<"idle" | "busy">) {
      state.workerState = action.payload;
    },
    setLastSubmittedJobId(state, action: PayloadAction<string | null>) {
      state.lastSubmittedJobId = action.payload;
    },
    clearChat(state) {
      state.chatLines = [];
      state.workerState = "idle";
      state.lastSubmittedJobId = null;
    },
  },
});

export const {
  appendChatLine,
  upsertAgentChatLine,
  setWorkerState,
  setLastSubmittedJobId,
  clearChat,
} = automationSlice.actions;

export default automationSlice.reducer;
