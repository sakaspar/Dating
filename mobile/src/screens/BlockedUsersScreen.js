/**
 * Blocked Users Screen
 *
 * - List of blocked users
 * - Unblock button
 * - Empty state
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function BlockedUsersScreen({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    loadBlocked();
  }, []);

  const loadBlocked = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBlocked();
      setBlockedUsers(data.blockedUsers || data.blocked || data.users || data || []);
    } catch (err) {
      console.error('Load blocked error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlocked();
    setRefreshing(false);
  }, []);

  const handleUnblock = (userId, userName) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName || 'this user'}? They will be able to see your profile and message you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingId(userId);
            try {
              await api.unblockUser(userId);
              setBlockedUsers(prev => prev.filter(u => (u.id || u.userId) !== userId));
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to unblock user');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }) => {
    const userId = item.id || item.userId;
    const userName = item.name || item.fullName || 'User';
    const isUnblocking = unblockingId === userId;

    return (
      <View style={styles.userItem}>
        <Avatar.Text
          size={48}
          label={userName.charAt(0).toUpperCase()}
          style={{ backgroundColor: COLORS.error + '30' }}
          labelStyle={{ color: COLORS.error, fontSize: 18 }}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.blockedLabel}>Blocked</Text>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(userId, userName)}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.unblockText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={COLORS.textPrimary}
        />
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="account-cancel-outline" size={64} iconColor={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptySubtitle}>
            You haven't blocked anyone. If someone is bothering you, you can block them from their profile or chat.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id || item.userId || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  blockedLabel: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: RADIUS.round,
    minWidth: 90,
    alignItems: 'center',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
