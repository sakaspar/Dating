import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const createProposal = createAsyncThunk('proposals/create', async (data, { rejectWithValue }) => {
  try { return await api.createProposal(data); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchProposals = createAsyncThunk('proposals/fetch', async (matchId, { rejectWithValue }) => {
  try { return { matchId, proposals: await api.getProposals(matchId) }; } catch (err) { return rejectWithValue(err.message); }
});

export const acceptProposal = createAsyncThunk('proposals/accept', async (id, { rejectWithValue }) => {
  try { return await api.acceptProposal(id); } catch (err) { return rejectWithValue(err.message); }
});

export const declineProposal = createAsyncThunk('proposals/decline', async (id, { rejectWithValue }) => {
  try { return await api.declineProposal(id); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchSuggestions = createAsyncThunk('proposals/suggestions', async (matchId, { rejectWithValue }) => {
  try { return { matchId, suggestions: await api.getSuggestions(matchId) }; } catch (err) { return rejectWithValue(err.message); }
});

const proposalsSlice = createSlice({
  name: 'proposals',
  initialState: {
    proposals: {},   // { matchId: [proposals] }
    suggestions: {}, // { matchId: [suggestions] }
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProposals.fulfilled, (state, action) => {
        state.proposals[action.payload.matchId] = action.payload.proposals;
      })
      .addCase(createProposal.fulfilled, (state, action) => {
        const p = action.payload;
        if (!state.proposals[p.matchId]) state.proposals[p.matchId] = [];
        state.proposals[p.matchId].push(p);
      })
      .addCase(acceptProposal.fulfilled, (state, action) => {
        const p = action.payload;
        const list = state.proposals[p.matchId];
        if (list) {
          const idx = list.findIndex(x => x.id === p.id);
          if (idx >= 0) list[idx] = p;
        }
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestions[action.payload.matchId] = action.payload.suggestions;
      });
  },
});

export default proposalsSlice.reducer;
