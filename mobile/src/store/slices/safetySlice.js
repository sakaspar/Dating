/**
 * Safety Slice
 *
 * Redux state for:
 * - Blocking users
 * - Reporting users
 * - Blocked users list
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const blockUser = createAsyncThunk('safety/block', async (userId, { rejectWithValue }) => {
  try {
    await api.blockUser(userId);
    return userId;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchBlocked = createAsyncThunk('safety/fetchBlocked', async (_, { rejectWithValue }) => {
  try {
    const data = await api.getBlocked();
    return data.blockedUsers || data.blocked || data.users || data || [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const unblockUser = createAsyncThunk('safety/unblock', async (userId, { rejectWithValue }) => {
  try {
    await api.unblockUser(userId);
    return userId;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const reportUser = createAsyncThunk('safety/report', async ({ userId, reason, details }, { rejectWithValue }) => {
  try {
    return await api.reportUser({ userId, reason, details });
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const safetySlice = createSlice({
  name: 'safety',
  initialState: {
    blockedUsers: [],
    isLoading: false,
    error: null,
    lastReport: null,
  },
  reducers: {
    clearSafetyError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Block user
      .addCase(blockUser.fulfilled, (state, action) => {
        // The blocked user ID will be in the blocked users list after refresh
        // Also remove from matches if present
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Fetch blocked
      .addCase(fetchBlocked.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchBlocked.fulfilled, (state, action) => {
        state.isLoading = false;
        state.blockedUsers = action.payload;
      })
      .addCase(fetchBlocked.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Unblock
      .addCase(unblockUser.fulfilled, (state, action) => {
        state.blockedUsers = state.blockedUsers.filter(
          u => (u.id || u.userId) !== action.payload
        );
      })
      // Report
      .addCase(reportUser.fulfilled, (state, action) => {
        state.lastReport = action.payload;
      })
      .addCase(reportUser.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearSafetyError } = safetySlice.actions;
export default safetySlice.reducer;
