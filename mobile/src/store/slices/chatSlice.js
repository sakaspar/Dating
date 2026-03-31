import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchConversations = createAsyncThunk('chat/conversations', async (_, { rejectWithValue }) => {
  try { return await api.getConversations(); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchMessages = createAsyncThunk('chat/messages', async ({ conversationId, page = 1 }, { rejectWithValue }) => {
  try { return { conversationId, ...(await api.getMessages(conversationId, page)) }; } catch (err) { return rejectWithValue(err.message); }
});

export const sendMessage = createAsyncThunk('chat/send', async ({ conversationId, text }, { rejectWithValue }) => {
  try { return await api.sendMessage(conversationId, text); } catch (err) { return rejectWithValue(err.message); }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    messages: {},  // { conversationId: [messages] }
    typing: {},    // { conversationId: { userId: bool } }
    isLoading: false,
    error: null,
  },
  reducers: {
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      state.messages[conversationId].push(message);
    },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typing[conversationId]) state.typing[conversationId] = {};
      state.typing[conversationId][userId] = isTyping;
    },
    markMessageRead: (state, action) => {
      const { conversationId, messageId } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        const msg = msgs.find(m => m.id === messageId);
        if (msg) msg.read = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.messages[conversationId] = messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        if (!state.messages[msg.conversationId]) state.messages[msg.conversationId] = [];
        state.messages[msg.conversationId].push(msg);
      });
  },
});

export const { addMessage, setTyping, markMessageRead } = chatSlice.actions;
export default chatSlice.reducer;
