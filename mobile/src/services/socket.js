/**
 * Socket.io Service
 *
 * Real-time chat connection with:
 * - JWT authentication
 * - Auto-reconnect
 * - Event handling
 * - Online/offline status
 */

import { io } from 'socket.io-client';
import AsyncStorage from '../utils/storage';

const SOCKET_URL = 'https://0a6b-197-26-43-196.ngrok-free.app';

let socket = null;

const socketService = {
  async connect() {
    if (socket?.connected) return socket;

    const token = await AsyncStorage.getItem('token');
    if (!token) return null;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  isConnected() {
    return socket?.connected || false;
  },

  // Chat events
  sendMessage(conversationId, text) {
    socket?.emit('message:send', { conversationId, text });
  },

  onMessage(callback) {
    socket?.on('message:receive', callback);
  },

  offMessage(callback) {
    socket?.off('message:receive', callback);
  },

  markRead(conversationId, messageId) {
    socket?.emit('message:read', { conversationId, messageId });
  },

  onMessageRead(callback) {
    socket?.on('message:read', callback);
  },

  // Typing indicators
  startTyping(conversationId) {
    socket?.emit('typing:start', { conversationId });
  },

  stopTyping(conversationId) {
    socket?.emit('typing:stop', { conversationId });
  },

  onTyping(callback) {
    socket?.on('typing:start', callback);
  },

  onStopTyping(callback) {
    socket?.on('typing:stop', callback);
  },

  // User status
  onUserOnline(callback) {
    socket?.on('user:online', callback);
  },

  onUserOffline(callback) {
    socket?.on('user:offline', callback);
  },

  // Group chat
  sendGroupMessage(groupId, text) {
    socket?.emit('group:message:send', { groupId, text });
  },

  onGroupMessage(callback) {
    socket?.on('group:message:receive', callback);
  },

  offGroupMessage(callback) {
    socket?.off('group:message:receive', callback);
  },

  // Generic event listener
  on(event, callback) {
    socket?.on(event, callback);
  },

  off(event, callback) {
    socket?.off(event, callback);
  },

  emit(event, data) {
    socket?.emit(event, data);
  },
};

export default socketService;
