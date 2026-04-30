import { configureStore } from "@reduxjs/toolkit";

import historyReducer, { clearHistory, fetchHistory } from "./historySlice";

export const store = configureStore({
  reducer: {
    history: historyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { clearHistory, fetchHistory };

/** Refetch history without blocking UI (e.g. after generating a comic). */
export function triggerHistoryRefresh(token: string | null | undefined): void {
  if (!token) return;
  void store.dispatch(fetchHistory({ token, mode: "silent" }));
}
