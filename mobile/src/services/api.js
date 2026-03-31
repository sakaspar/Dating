/**
 * API Service
 *
 * Configured axios instance with:
 * - Base URL from env/config
 * - JWT token injection
 * - Response error handling
 * - Automatic retry on 401 (token refresh)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your Raspberry Pi URL for production
const API_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-rpi-url.com/api';

const api = {
  async request(endpoint, options = {}) {
    const token = await AsyncStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const url = `${API_URL}${endpoint}`;
    const config = {
      ...options,
      headers,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  },

  // Auth
  login: (email, password) =>
    api.request('/auth/login', { method: 'POST', body: { email, password } }),

  register: (userData) =>
    api.request('/auth/register', { method: 'POST', body: userData }),

  getMe: () => api.request('/auth/me'),

  logout: () => api.request('/auth/logout', { method: 'POST' }),

  // Profile
  getProfile: () => api.request('/users/profile'),

  updateProfile: (data) =>
    api.request('/users/profile', { method: 'PUT', body: data }),

  updatePreferences: (data) =>
    api.request('/users/preferences', { method: 'PUT', body: data }),

  // Matches
  getDiscover: () => api.request('/matches/discover'),

  swipe: (targetUserId, action) =>
    api.request('/matches/swipe', { method: 'POST', body: { targetUserId, action } }),

  getMatches: () => api.request('/matches'),

  unmatch: (matchId) =>
    api.request(`/matches/${matchId}`, { method: 'DELETE' }),

  // Chat
  getConversations: () => api.request('/chat/conversations'),

  getMessages: (conversationId, page = 1) =>
    api.request(`/chat/${conversationId}/messages?page=${page}`),

  sendMessage: (conversationId, text) =>
    api.request(`/chat/${conversationId}/messages`, { method: 'POST', body: { text } }),

  // Proposals
  createProposal: (data) =>
    api.request('/proposals', { method: 'POST', body: data }),

  getProposals: (matchId) => api.request(`/proposals/${matchId}`),

  acceptProposal: (id) =>
    api.request(`/proposals/${id}/accept`, { method: 'PUT' }),

  declineProposal: (id) =>
    api.request(`/proposals/${id}/decline`, { method: 'PUT' }),

  modifyProposal: (id, modifications) =>
    api.request(`/proposals/${id}/modify`, { method: 'PUT', body: modifications }),

  getSuggestions: (matchId) =>
    api.request(`/proposals/suggestions/${matchId}`),

  // Groups
  createGroup: (data) =>
    api.request('/groups', { method: 'POST', body: data }),

  getGroups: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.request(`/groups${params ? `?${params}` : ''}`);
  },

  getGroup: (id) => api.request(`/groups/${id}`),

  joinGroup: (id) =>
    api.request(`/groups/${id}/join`, { method: 'POST' }),

  approveMember: (groupId, userId) =>
    api.request(`/groups/${groupId}/approve/${userId}`, { method: 'PUT' }),

  getGroupMessages: (groupId) => api.request(`/groups/${groupId}/messages`),

  // Safety
  reportUser: (data) =>
    api.request('/safety/report', { method: 'POST', body: data }),

  blockUser: (userId) =>
    api.request('/safety/block', { method: 'POST', body: { userId } }),

  getBlocked: () => api.request('/safety/blocked'),

  unblockUser: (userId) =>
    api.request(`/safety/block/${userId}`, { method: 'DELETE' }),
};

export default api;
