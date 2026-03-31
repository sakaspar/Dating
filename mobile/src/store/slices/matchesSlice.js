import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchDiscover = createAsyncThunk('matches/discover', async (_, { rejectWithValue }) => {
  try { return await api.getDiscover(); } catch (err) { return rejectWithValue(err.message); }
});

export const swipeUser = createAsyncThunk('matches/swipe', async ({ targetUserId, action }, { rejectWithValue, dispatch }) => {
  try {
    const result = await api.swipe(targetUserId, action);
    // Remove swiped user from discover
    dispatch(removeFromDiscover(targetUserId));
    return result;
  } catch (err) { return rejectWithValue(err.message); }
});

export const fetchMatches = createAsyncThunk('matches/fetch', async (_, { rejectWithValue }) => {
  try { return await api.getMatches(); } catch (err) { return rejectWithValue(err.message); }
});

export const unmatch = createAsyncThunk('matches/unmatch', async (matchId, { rejectWithValue }) => {
  try { await api.unmatch(matchId); return matchId; } catch (err) { return rejectWithValue(err.message); }
});

const matchesSlice = createSlice({
  name: 'matches',
  initialState: {
    discover: [],
    matches: [],
    isLoading: false,
    isSwiping: false,
    error: null,
  },
  reducers: {
    removeFromDiscover: (state, action) => {
      state.discover = state.discover.filter(u => u.id !== action.payload);
    },
    addNewMatch: (state, action) => {
      state.matches.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscover.pending, (state) => { state.isLoading = true; })
      .addCase(fetchDiscover.fulfilled, (state, action) => {
        state.isLoading = false;
        state.discover = action.payload;
      })
      .addCase(fetchDiscover.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(swipeUser.pending, (state) => { state.isSwiping = true; })
      .addCase(swipeUser.fulfilled, (state, action) => {
        state.isSwiping = false;
        if (action.payload.matched) {
          state.matches.unshift(action.payload.match);
        }
      })
      .addCase(swipeUser.rejected, (state) => { state.isSwiping = false; })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.matches = action.payload;
      })
      .addCase(unmatch.fulfilled, (state, action) => {
        state.matches = state.matches.filter(m => m.id !== action.payload);
      });
  },
});

export const { removeFromDiscover, addNewMatch } = matchesSlice.actions;
export default matchesSlice.reducer;
