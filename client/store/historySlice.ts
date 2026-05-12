import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getApiUrl } from "@/lib/query-client";

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
}

const initialState: HistoryState = {
  comics: [],
  silentInFlight: 0,
  fullInFlight: 0,
  lastFetchError: null,
};

export const fetchHistory = createAsyncThunk<
  SavedComicLightweight[],
  { token: string; mode: HistoryFetchMode },
  { rejectValue: string }
>("history/fetchHistory", async ({ token, mode }, { rejectWithValue }) => {
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
    return mappedComics;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return rejectWithValue(message);
  }
});

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    clearHistory: () => ({ ...initialState }),
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
        state.comics = action.payload;
        state.lastFetchError = null;
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
