/**
 * Chat Screen
 *
 * - Socket.io real-time messaging
 * - Message bubbles (sent/received)
 * - Typing indicator
 * - Read receipts
 * - Online/offline status in header
 * - Paginated message history
 * - Auto-scroll to bottom
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Avatar, IconButton, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, addMessage, setTyping, markMessageRead } from '../store/slices/chatSlice';
import socketService from '../services/socket';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ChatScreen({ navigation, route }) {
  const { matchId, user } = route.params;
  const conversationId = `conversation_${matchId}`;

  const dispatch = useDispatch();
  const { messages, typing } = useSelector((state) => state.chat);
  const authUser = useSelector((state) => state.auth.user);

  const [text, setText] = useState('');
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const chatMessages = messages[conversationId] || [];
  const isOtherTyping = typing[conversationId]?.[user.id] || false;

  // Load messages on mount
  useEffect(() => {
    dispatch(fetchMessages({ conversationId }));

    // Connect socket
    socketService.connect();

    return () => {
      // Stop typing when leaving
      if (isTypingRef.current) {
        socketService.stopTyping(conversationId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    const handleMessage = (data) => {
      if (data.matchId === matchId) {
        dispatch(addMessage({ conversationId, message: data.message }));

        // Mark as read if it's from the other user
        if (data.message.senderId !== authUser?.id) {
          socketService.markRead(conversationId, data.message.id);
        }

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTypingStart = (data) => {
      if (data.conversationId === conversationId && data.userId !== authUser?.id) {
        dispatch(setTyping({ conversationId, userId: data.userId, isTyping: true }));
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === conversationId && data.userId !== authUser?.id) {
        dispatch(setTyping({ conversationId, userId: data.userId, isTyping: false }));
      }
    };

    const handleUserOnline = (data) => {
      if (data.userId === user.id) setIsOtherOnline(true);
    };

    const handleUserOffline = (data) => {
      if (data.userId === user.id) setIsOtherOnline(false);
    };

    socketService.onMessage(handleMessage);
    socketService.onTyping(handleTypingStart);
    socketService.onStopTyping(handleTypingStop);
    socketService.onUserOnline(handleUserOnline);
    socketService.onUserOffline(handleUserOffline);

    return () => {
      socketService.off('message:receive', handleMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
    };
  }, [matchId, conversationId, authUser?.id]);

  // Handle text input changes → typing indicator
  const handleTextChange = useCallback((value) => {
    setText(value);

    if (!isTypingRef.current && value.length > 0) {
      isTypingRef.current = true;
      socketService.startTyping(conversationId);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socketService.stopTyping(conversationId);
      }
    }, 2000);
  }, [conversationId]);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setText('');

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketService.stopTyping(conversationId);
    }

    try {
      // Try socket first, fallback to HTTP
      if (socketService.isConnected()) {
        socketService.sendMessage(conversationId, trimmed);
      } else {
        const result = await api.sendMessage(conversationId, trimmed);
        dispatch(addMessage({ conversationId, message: result.message }));
      }

      // Optimistic update - the message will also come back via socket
      const optimisticMsg = {
        id: `temp_${Date.now()}`,
        senderId: authUser?.id,
        text: trimmed,
        timestamp: new Date().toISOString(),
        read: false,
      };
      dispatch(addMessage({ conversationId, message: optimisticMsg }));

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  }, [text, conversationId, isSending, authUser?.id]);

  // Load older messages
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || chatMessages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const cursor = chatMessages[0]?.timestamp;
      const result = await api.getMessages(conversationId);
      if (result.messages?.length) {
        // Prepend older messages
        const existing = chatMessages.map(m => m.id);
        const newMsgs = result.messages.filter(m => !existing.includes(m.id));
        if (newMsgs.length === 0) {
          setHasMore(false);
        } else {
          // Add to beginning
          for (const msg of newMsgs.reverse()) {
            dispatch(addMessage({ conversationId, message: msg }));
          }
        }
        setHasMore(result.hasMore !== false);
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatMessages, conversationId, isLoadingMore, hasMore]);

  // Render a single message bubble
  const renderMessage = useCallback(({ item, index }) => {
    const isMine = item.senderId === authUser?.id;
    const showAvatar = !isMine && (index === 0 || chatMessages[index - 1]?.senderId !== item.senderId);

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && (
          <View style={styles.avatarSpacer}>
            {showAvatar ? (
              <Avatar.Text
                size={32}
                label={(user.fullName || 'U').charAt(0).toUpperCase()}
                style={{ backgroundColor: COLORS.primaryLight }}
                labelStyle={{ color: COLORS.textWhite, fontSize: 12 }}
              />
            ) : null}
          </View>
        )}

        <View style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}>
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
            {item.text}
          </Text>
          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
              {formatMessageTime(item.timestamp)}
            </Text>
            {isMine && (
              <Text style={styles.readReceipt}>
                {item.read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }, [authUser?.id, chatMessages, user]);

  // Typing indicator
  const renderTypingIndicator = () => {
    if (!isOtherTyping) return null;
    return (
      <View style={styles.typingRow}>
        <Avatar.Text
          size={32}
          label={(user.fullName || 'U').charAt(0).toUpperCase()}
          style={{ backgroundColor: COLORS.primaryLight }}
          labelStyle={{ color: COLORS.textWhite, fontSize: 12 }}
        />
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  const statusText = isOtherTyping
    ? 'typing...'
    : isOtherOnline || user.online
      ? 'online'
      : 'offline';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={COLORS.textPrimary}
        />
        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => navigation.navigate('UserProfile', { userId: user.id })}
        >
          <Avatar.Text
            size={40}
            label={(user.fullName || 'U').charAt(0).toUpperCase()}
            style={{ backgroundColor: COLORS.primaryLight }}
            labelStyle={{ color: COLORS.textWhite }}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {user.fullName || 'User'}
            </Text>
            <Text style={[
              styles.headerStatus,
              (isOtherOnline || user.online) && styles.headerStatusOnline,
            ]}>
              {statusText}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.planHeaderButton}
          onPress={() => navigation.navigate('ProposalCreate', { matchId, user })}
        >
          <Text style={styles.planHeaderEmoji}>📋</Text>
          <Text style={styles.planHeaderText}>Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (chatMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={
          isLoadingMore ? (
            <ActivityIndicator style={styles.loadMore} color={COLORS.primary} />
          ) : null
        }
        ListFooterComponent={renderTypingIndicator}
        ListEmptyComponent={
          !isLoadingMore ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>👋</Text>
              <Text style={styles.emptyChatText}>
                You matched! Say hello and start planning something fun together.
              </Text>
              <Text style={styles.emptyChatHint}>
                Shared activities:{' '}
                {(user.sharedActivities || []).map(a => {
                  const emojis = { coffee: '☕', restaurant: '🍽️', activities: '🎮', outdoor: '🌳', social: '👥', events: '🎬' };
                  return emojis[a] || '🎯';
                }).join(' ') || 'None yet'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textLight}
          style={styles.textInput}
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          dense
          multiline
          maxLength={2000}
          right={
            text.trim().length > 0 ? (
              <TextInput.Icon
                icon="send"
                onPress={handleSend}
                color={COLORS.primary}
              />
            ) : null
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  headerInfo: {
    marginLeft: SPACING.sm,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  headerStatusOnline: {
    color: COLORS.success,
  },
  planHeaderButton: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: RADIUS.md,
  },
  planHeaderEmoji: {
    fontSize: 16,
  },
  planHeaderText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Messages
  messagesList: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  avatarSpacer: {
    width: 32,
    marginRight: SPACING.xs,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  bubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.xs,
  },
  bubbleTheirs: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: SPACING.xs,
    ...SHADOWS.small,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextMine: {
    color: COLORS.textWhite,
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  timeTextMine: {
    color: COLORS.textWhite + 'AA',
  },
  readReceipt: {
    fontSize: 10,
    color: COLORS.textWhite + 'CC',
  },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  typingBubble: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: SPACING.xs,
    marginLeft: SPACING.xs,
    ...SHADOWS.small,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  // Empty chat
  emptyChat: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyChatEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyChatText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyChatHint: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: COLORS.surface,
    fontSize: 15,
  },
  loadMore: {
    paddingVertical: SPACING.md,
  },
});
