/**
 * Redux Store Configuration
 *
 * Redux Toolkit with slices for:
 * - auth (login, register, token)
 * - profile (user data, photos)
 * - matches (discover, swipe, matches list)
 * - chat (conversations, messages)
 * - proposals (create, respond)
 * - groups (create, browse, chat)
 * - safety (block, report)
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import matchesReducer from './slices/matchesSlice';
import chatReducer from './slices/chatSlice';
import proposalsReducer from './slices/proposalsSlice';
import groupsReducer from './slices/groupsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    matches: matchesReducer,
    chat: chatReducer,
    proposals: proposalsReducer,
    groups: groupsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
