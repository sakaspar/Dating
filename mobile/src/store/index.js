/**
 * Redux Store Configuration
 *
 * Redux Toolkit with slices for:
 * - auth (login, register, token) — persisted
 * - profile (user data, photos)
 * - matches (discover, swipe, matches list)
 * - chat (conversations, messages)
 * - proposals (create, respond)
 * - groups (create, browse, chat)
 * - safety (block, report)
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import matchesReducer from './slices/matchesSlice';
import chatReducer from './slices/chatSlice';
import proposalsReducer from './slices/proposalsSlice';
import groupsReducer from './slices/groupsSlice';
import safetyReducer from './slices/safetySlice';

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['token', 'user', 'isInitialized'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    profile: profileReducer,
    matches: matchesReducer,
    chat: chatReducer,
    proposals: proposalsReducer,
    groups: groupsReducer,
    safety: safetyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
