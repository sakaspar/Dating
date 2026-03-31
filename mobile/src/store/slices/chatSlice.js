import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchConversations = createAsyncThunk('chat/conversations', async (_, { rejectWithValue }) => {
  try { return await api.getConversations(); } catch (err) { return rejectWithValue(err.message); }
});

export const fetchMessages = createAsyncThunk('chat/messages', async ({ conversationId, page = 1 }, { rejectWithValue }) => {
  try { return { conversationId, ...(await api.getMessages(conversationId, page)) }; } catch (err) { return rejectWithValue(err.message); }
});

export const sendMessage = createAsyncThunk('chat/send', async ({ conversationId, text, tempId }, { rejectWithValue }) => {
  try {
    const result = await api.sendMessage(conversationId, text);
    return { ...result, tempId };
  } catch (err) { return rejectWithValue(err.message); }
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
    // Optimistic message — adds immediately before API response
    addOptimisticMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      state.messages[conversationId].push({ ...message, pending: true });
    },
    // Replace optimistic message with confirmed one from server
    replaceOptimisticMessage: (state, action) => {
      const { conversationId, tempId, message } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        const idx = msgs.findIndex(m => m.id === tempId);
        if (idx >= 0) {
          msgs[idx] = { ...message, pending: false };
        }
      }
    },
    // Remove failed optimistic message
    removeOptimisticMessage: (state, action) => {
      const { conversationId, tempId } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        state.messages[conversationId] = msgs.filter(m => m.id !== tempId);
      }
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
        const { tempId } = action.meta.arg;
        const msgs = state.messages[msg.conversationId];
        if (msgs) {
          // Replace the optimistic message with the server-confirmed one
          const idx = msgs.findIndex(m => m.id === tempId);
          if (idx >= 0) {
            msgs[idx] = msg;
          } else {
            msgs.push(msg);
          }
        } else {
          state.messages[msg.conversationId] = [msg];
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        // Mark the optimistic message as failed
        const { conversationId, tempId } = action.meta.arg;
        const msgs = state.messages[conversationId];
        if (msgs) {
          const msg = msgs.find(m => m.id === tempId);
          if (msg) {
            msg.pending = false;
            msg.failed = true;
          }
        }
      });
  },
});

export const { addMessage, addOptimisticMessage, replaceOptimisticMessage, removeOptimisticMessage, setTyping, markMessageRead } = chatSlice.actions;
export default chatSlice.reducer;
