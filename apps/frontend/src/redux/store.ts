import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { authService } from './api/auth';
import layoutReducer from './layoutSlice';

const rootReducer = combineReducers({
  layout: layoutReducer,
  [authService.reducerPath]: authService.reducer,
});

const apiMiddleware = [authService.middleware];
const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
