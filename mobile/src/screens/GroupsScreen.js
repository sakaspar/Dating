/**
 * Groups Tab & Browse Screen
 *
 * - Scrollable group activity cards
 * - Filter by type / date / location
 * - Creator info & participant count
 * - Join request button
 * - Pull to refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Button,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups, joinGroup } from '../store/slices/groupsSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

const ACTIVITY_FILTERS = [
  { id: '', label: 'All', emoji: '🎯' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'restaurant', label: 'Food', emoji: '🍽️' },
  { id: 'activities', label: 'Fun', emoji: '🎮' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'events', label: 'Events', emoji: '🎬' },
];

export default function GroupsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list: groups, isLoading } = useSelector((state) => state.groups);
  const authUser = useSelector((state) => state.auth.user);

  const [activeFilter, setActiveFilter] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [activeFilter]);

  const loadGroups = () => {
    const filters = {};
    if (activeFilter) filters.activityType = activeFilter;
    dispatch(fetchGroups(filters));
  };

  const onRefresh = () => {
    loadGroups();
  };

  const handleJoin = useCallback(async (groupId) => {
    setJoiningId(groupId);
    try {
      await dispatch(joinGroup(groupId)).unwrap();
      // Reload groups to remove joined one from list
      loadGroups();
    } catch (err) {
      console.error('Join error:', err);
    } finally {
      setJoiningId(null);
    }
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getSpotsText = (group) => {
    const remaining = group.lookingFor || 0;
    const total = group.currentGroupSize + remaining;
    return `${remaining} spot${remaining !== 1 ? 's' : ''} left`;
  };

  const renderGroupCard = ({ item: group }) => {
    const activityInfo = ACTIVITY_FILTERS.find(a => a.id === group.activityType) || { emoji: '🎯', label: group.activityType };
    const isJoining = joiningId === group.id;
    const spotsRemaining = group.lookingFor || 0;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.activityBadge}>
            <Text style={styles.activityEmoji}>{activityInfo.emoji}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.groupTitle} numberOfLines={1}>
              {group.title}
            </Text>
            <Text style={styles.groupMeta}>
              {formatDate(group.date)} · {group.time} · {group.neighborhood}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.groupDescription} numberOfLines={2}>
          {group.description}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {/* Creator */}
          <View style={styles.creatorRow}>
            <Avatar.Text
              size={28}
              label={(group.creatorName || 'U').charAt(0).toUpperCase()}
              style={{ backgroundColor: COLORS.primaryLight }}
              labelStyle={{ color: COLORS.textWhite, fontSize: 11 }}
            />
            <Text style={styles.creatorName} numberOfLines={1}>
              {group.creatorName || 'Someone'}
            </Text>
          </View>

          {/* Spots & Join */}
          <View style={styles.rightFooter}>
            <View style={[
              styles.spotsBadge,
              spotsRemaining <= 2 && styles.spotsBadgeLow,
            ]}>
              <Text style={[
                styles.spotsText,
                spotsRemaining <= 2 && styles.spotsTextLow,
              ]}>
                {getSpotsText(group)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleJoin(group.id)}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <Text style={styles.joinButtonText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Distance if available */}
        {group._distance != null && (
          <View style={styles.distanceBadge}>
            <IconButton icon="map-marker-distance" size={14} iconColor={COLORS.textLight} />
            <Text style={styles.distanceText}>{group._distance} km away</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && groups.length === 0) {
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
        <Text style={styles.headerTitle}>Group Activities 👥</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('GroupCreate')}
        >
          <IconButton icon="plus" size={20} iconColor={COLORS.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Activity filter chips */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {ACTIVITY_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterChip,
                activeFilter === f.id && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[
                styles.filterLabel,
                activeFilter === f.id && styles.filterLabelActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Groups list */}
      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="account-group-outline" size={64} iconColor={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter
              ? 'No groups found for this activity. Try a different filter!'
              : 'Be the first to create a group outing!'}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('GroupCreate')}
            style={styles.emptyCreateButton}
            buttonColor={COLORS.primary}
            icon="plus"
          >
            Create Group
          </Button>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  // Filters
  filterRow: {
    paddingVertical: SPACING.sm,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  filterEmoji: {
    fontSize: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // List
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  // Group card
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  activityBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  groupMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  groupDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  creatorName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  spotsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.success + '20',
    borderRadius: RADIUS.sm,
  },
  spotsBadgeLow: {
    backgroundColor: COLORS.warning + '30',
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  spotsTextLow: {
    color: COLORS.warning,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    minWidth: 72,
    alignItems: 'center',
  },
  joinButtonText: {
    color: COLORS.textWhite,
    fontWeight: '600',
    fontSize: 14,
  },
  // Distance
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.textLight,
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
  emptyCreateButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.lg,
  },
});
