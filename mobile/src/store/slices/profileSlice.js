import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchProfile = createAsyncThunk('profile/fetch', async (_, { rejectWithValue }) => {
  try { return await api.getProfile(); } catch (err) { return rejectWithValue(err.message); }
});

export const updateProfile = createAsyncThunk('profile/update', async (data, { rejectWithValue }) => {
  try { return await api.updateProfile(data); } catch (err) { return rejectWithValue(err.message); }
});

export const updatePreferences = createAsyncThunk('profile/updatePrefs', async (data, { rejectWithValue }) => {
  try { return await api.updatePreferences(data); } catch (err) { return rejectWithValue(err.message); }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: { profile: null, isLoading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => { state.isLoading = true; })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.profile = { ...state.profile, preferences: action.payload.preferences };
      });
  },
});

export default profileSlice.reducer;
