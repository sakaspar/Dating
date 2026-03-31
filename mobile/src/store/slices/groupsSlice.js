import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchGroups = createAsyncThunk('groups/fetch', async (filters, { rejectWithValue }) => {
  try {
    const data = await api.getGroups(filters);
    return data.groups || data;
  } catch (err) { return rejectWithValue(err.message); }
});

export const createGroup = createAsyncThunk('groups/create', async (data, { rejectWithValue }) => {
  try { return await api.createGroup(data); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchGroup = createAsyncThunk('groups/detail', async (id, { rejectWithValue }) => {
  try { return await api.getGroup(id); } catch (err) { return rejectWithValue(err.message); }
});

export const joinGroup = createAsyncThunk('groups/join', async (id, { rejectWithValue }) => {
  try { return await api.joinGroup(id); } catch (err) { return rejectWithValue(err.message); }
});

export const approveMember = createAsyncThunk('groups/approve', async ({ groupId, userId }, { rejectWithValue }) => {
  try { return await api.approveMember(groupId, userId); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchGroupMessages = createAsyncThunk('groups/messages', async (groupId, { rejectWithValue }) => {
  try { return await api.getGroupMessages(groupId); } catch (err) { return rejectWithValue(err.message); }
});

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    list: [],
    current: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearCurrentGroup: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => { state.isLoading = true; })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(approveMember.fulfilled, (state, action) => {
        // Group will be refreshed via fetchGroup
      })
      .addCase(fetchGroupMessages.fulfilled, (state, action) => {
        if (state.current) {
          state.current.messages = action.payload.messages || action.payload;
        }
      });
  },
});

export const { clearCurrentGroup } = groupsSlice.actions;
export default groupsSlice.reducer;
