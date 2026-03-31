/**
 * Group Chat Screen
 *
 * - Socket.io real-time group messaging
 * - Message bubbles with sender name/avatar
 * - Typing indicator
 * - Paginated history
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
import socketService from '../services/socket';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function GroupChatScreen({ navigation, route }) {
  const { groupId, groupTitle } = route.params;
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: name }

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    socketService.connect();

    return () => {
      if (isTypingRef.current) {
        socketService.emit('typing:stop', { conversationId: `group_${groupId}` });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [groupId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGroupMessages(groupId);
      setMessages(data.messages || data || []);
    } catch (err) {
      console.error('Load group messages error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Socket listeners
  useEffect(() => {
    const handleGroupMessage = (data) => {
      if (data.groupId === groupId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === data.message?.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleTypingStart = (data) => {
      if (data.conversationId === `group_${groupId}` && data.userId !== authUser?.id) {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.userName || 'Someone' }));
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId === `group_${groupId}` && data.userId !== authUser?.id) {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    socketService.onGroupMessage(handleGroupMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);

    // Join the group room
    socketService.emit('group:join', { groupId });

    return () => {
      socketService.off('group:message:receive', handleGroupMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.emit('group:leave', { groupId });
    };
  }, [groupId, authUser?.id]);

  // Handle text input → typing indicator
  const handleTextChange = useCallback((value) => {
    setText(value);

    if (!isTypingRef.current && value.length > 0) {
      isTypingRef.current = true;
      socketService.emit('typing:start', { conversationId: `group_${groupId}` });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socketService.emit('typing:stop', { conversationId: `group_${groupId}` });
      }
    }, 2000);
  }, [groupId]);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setText('');

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketService.emit('typing:stop', { conversationId: `group_${groupId}` });
    }

    try {
      if (socketService.isConnected()) {
        socketService.sendGroupMessage(groupId, trimmed);
      } else {
        const result = await api.request(`/groups/${groupId}/messages`, {
          method: 'POST',
          body: { text: trimmed },
        });
        setMessages(prev => [...prev, result.message]);
      }

      // Optimistic update
      const optimisticMsg = {
        id: `temp_${Date.now()}`,
        senderId: authUser?.id,
        senderName: authUser?.name || 'You',
        text: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Send group message error:', err);
    } finally {
      setIsSending(false);
    }
  }, [text, groupId, isSending, authUser]);

  // Render message
  const renderMessage = useCallback(({ item, index }) => {
    const isMine = item.senderId === authUser?.id;
    const showSender = !isMine && (
      index === 0 ||
      messages[index - 1]?.senderId !== item.senderId
    );

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && (
          <View style={styles.avatarSpacer}>
            {showSender ? (
              <Avatar.Text
                size={32}
                label={(item.senderName || 'U').charAt(0).toUpperCase()}
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
          {showSender && !isMine && (
            <Text style={styles.senderName}>{item.senderName || 'Someone'}</Text>
          )}
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, [authUser?.id, messages]);

  // Typing indicator
  const typingNames = Object.values(typingUsers);
  const renderTypingIndicator = () => {
    if (typingNames.length === 0) return null;
    const text = typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : `${typingNames.length} people typing`;

    return (
      <View style={styles.typingRow}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>{text}</Text>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

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
        <TouchableOpacity style={styles.headerInfo}>
          <View style={styles.headerGroupBadge}>
            <Text style={styles.headerGroupEmoji}>👥</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {groupTitle || 'Group Chat'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {messages.length} messages
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || `${item.timestamp}_${item.senderId}`}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListFooterComponent={renderTypingIndicator}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>🎉</Text>
              <Text style={styles.emptyChatText}>
                Welcome to the group! Start chatting and plan something fun together.
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder="Message the group..."
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  headerGroupBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGroupEmoji: {
    fontSize: 20,
  },
  headerTextContainer: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
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
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextMine: {
    color: COLORS.textWhite,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  timeTextMine: {
    color: COLORS.textWhite + 'AA',
  },
  // Typing
  typingRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
    gap: SPACING.sm,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textLight,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  // Empty
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
});
