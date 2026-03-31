/**
 * Matches List Screen
 *
 * - List all matches with profile previews
 * - Last message preview
 * - Online status indicator
 * - Unread count badge
 * - Tap to open chat
 * - "Suggest a Plan" button (prominent)
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Text, Avatar, Badge, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMatches } from '../store/slices/matchesSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

export default function MatchesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { matches, isLoading } = useSelector((state) => state.matches);

  useEffect(() => {
    dispatch(fetchMatches());
  }, []);

  const onRefresh = () => {
    dispatch(fetchMatches());
  };

  const renderMatchItem = ({ item }) => {
    const match = item;
    const user = match.otherUser || match;
    const lastMessage = match.lastMessage;
    const hasUnread = match.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => navigation.navigate('Chat', { matchId: match.id, user })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar.Text
            size={56}
            label={(user.fullName || 'U').charAt(0).toUpperCase()}
            style={{ backgroundColor: COLORS.primaryLight }}
            labelStyle={{ color: COLORS.textWhite, fontWeight: '600' }}
          />
          {user.online && <View style={styles.onlineIndicator} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.userName, hasUnread && styles.userNameUnread]} numberOfLines={1}>
              {user.fullName || 'User'}
            </Text>
            {match.matchedAt && (
              <Text style={styles.timeText}>
                {formatTime(match.matchedAt)}
              </Text>
            )}
          </View>

          {/* Last message or match info */}
          {lastMessage ? (
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {lastMessage.text}
            </Text>
          ) : (
            <View style={styles.newMatchRow}>
              <Text style={styles.newMatchText}>New match! Say hello 👋</Text>
              {user.sharedActivities?.length > 0 && (
                <Text style={styles.sharedActivities}>
                  {user.sharedActivities.map((a) => ACTIVITY_EMOJIS[a] || '🎯').join(' ')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Right side actions */}
        <View style={styles.rightSide}>
          {hasUnread && (
            <Badge style={styles.badge} size={22}>
              {match.unreadCount}
            </Badge>
          )}
          <TouchableOpacity
            style={styles.planButton}
            onPress={() => navigation.navigate('ProposalCreate', { matchId: match.id, user })}
          >
            <Text style={styles.planButtonText}>📋</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && matches.length === 0) {
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
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.matchCount}>{matches.length} matches</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="heart-outline" size={64} iconColor={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep swiping to find your perfect match!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  matchCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: SPACING.sm,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  lastMessageUnread: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  newMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  newMatchText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sharedActivities: {
    fontSize: 14,
  },
  rightSide: {
    alignItems: 'center',
    marginLeft: SPACING.sm,
    gap: SPACING.xs,
  },
  badge: {
    backgroundColor: COLORS.primary,
  },
  planButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButtonText: {
    fontSize: 18,
  },
  divider: {
    height: 0,
  },
});
