import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authService } from "./api/auth";
import automationReducer from "./automationSlice";
import connectionReducer from "./connectionSlice";
import layoutReducer from "./layoutSlice";

const rootReducer = combineReducers({
  layout: layoutReducer,
  connection: connectionReducer,
  automation: automationReducer,
  [authService.reducerPath]: authService.reducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authService.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
