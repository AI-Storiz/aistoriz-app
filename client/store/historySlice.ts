import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getApiUrl } from "@/lib/query-client";
import { shouldApplyHistoryFetch } from "@shared/historyClear";

export interface SavedComicLightweight {
  id: string;
  title: string;
  createdAt: string;
  style: string;
  characterNames: string[];
  pagesCount?: number;
  thumbnailUrl?: string | null;
}

export type HistoryFetchMode = "full" | "silent";

interface HistoryState {
  comics: SavedComicLightweight[];
  silentInFlight: number;
  fullInFlight: number;
  lastFetchError: string | null;
  /** Bumped by Clear History so an in-flight fetch cannot restore deleted comics. */
  revision: number;
}

const initialState: HistoryState = {
  comics: [],
  silentInFlight: 0,
  fullInFlight: 0,
  lastFetchError: null,
  revision: 0,
};

type HistoryFetchResult = {
  comics: SavedComicLightweight[];
  revision: number;
};

export const fetchHistory = createAsyncThunk<
  HistoryFetchResult,
  { token: string; mode: HistoryFetchMode },
  { rejectValue: string; state: { history: HistoryState } }
>("history/fetchHistory", async ({ token, mode }, { rejectWithValue, getState }) => {
  const revision = getState().history.revision;
  try {
    const response = await fetch(new URL("/api/comics", getApiUrl()).toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return rejectWithValue(`Request failed (${response.status})`);
    }

    const { comics: apiComics } = await response.json();
    const apiBase = getApiUrl();
    const mappedComics: SavedComicLightweight[] = apiComics.map((c: Record<string, unknown>) => {
      const directThumb =
        typeof c.thumbnailAssetUrl === "string" && c.thumbnailAssetUrl.trim().length > 0
          ? c.thumbnailAssetUrl.trim()
          : null;
      const thumb = new URL(`/api/comics/${c.id}/first-image`, apiBase);
      thumb.searchParams.set("token", token);
      return {
        id: String(c.id),
        title: String(c.title ?? ""),
        createdAt: String(c.createdAt ?? ""),
        style: String(c.style ?? ""),
        characterNames: Array.isArray(c.characterNames) ? (c.characterNames as string[]) : [],
        pagesCount: typeof c.pagesCount === "number" ? c.pagesCount : 0,
        thumbnailUrl: directThumb ?? thumb.toString(),
      };
    });
    return { comics: mappedComics, revision };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return rejectWithValue(message);
  }
});

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    clearHistory: (state) => {
      state.comics = [];
      state.silentInFlight = 0;
      state.fullInFlight = 0;
      state.lastFetchError = null;
      state.revision += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state, action) => {
        if (action.meta.arg.mode === "silent") {
          state.silentInFlight += 1;
        } else {
          state.fullInFlight += 1;
        }
        state.lastFetchError = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        if (action.meta.arg.mode === "silent") {
          state.silentInFlight = Math.max(0, state.silentInFlight - 1);
        } else {
          state.fullInFlight = Math.max(0, state.fullInFlight - 1);
        }
        if (shouldApplyHistoryFetch(state.revision, action.payload.revision)) {
          state.comics = action.payload.comics;
          state.lastFetchError = null;
        }
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        if (action.meta.arg.mode === "silent") {
          state.silentInFlight = Math.max(0, state.silentInFlight - 1);
        } else {
          state.fullInFlight = Math.max(0, state.fullInFlight - 1);
        }
        state.lastFetchError =
          typeof action.payload === "string" ? action.payload : action.error.message ?? "Error";
      });
  },
});

export const { clearHistory } = historySlice.actions;
export default historySlice.reducer;
