/**
 * Group Detail Screen
 *
 * - Group info card (activity, title, date, location)
 * - Members list with roles
 * - Pending join requests (creator only)
 * - Join / Leave / Chat buttons
 * - Pull to refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroup, clearCurrentGroup } from '../store/slices/groupsSlice';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

const STATUS_COLORS = {
  open: COLORS.success,
  full: COLORS.warning,
  completed: COLORS.textLight,
  cancelled: COLORS.error,
};

export default function GroupDetailScreen({ navigation, route }) {
  const { groupId } = route.params;
  const dispatch = useDispatch();
  const { current: group, isLoading } = useSelector((state) => state.groups);
  const authUser = useSelector((state) => state.auth.user);

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // userId being processed

  useEffect(() => {
    dispatch(fetchGroup(groupId));
    return () => dispatch(clearCurrentGroup());
  }, [groupId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchGroup(groupId));
    setRefreshing(false);
  }, [groupId]);

  const isCreator = group?.creatorId === authUser?.id;
  const isMember = group?.members?.some(m => m.userId === authUser?.id && m.status === 'approved');
  const hasPending = group?.pendingRequests?.length > 0;

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    try {
      await api.approveMember(groupId, userId);
      await dispatch(fetchGroup(groupId));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to approve member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (userId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              // Use the kick endpoint or a custom decline
              await api.request(`/groups/${groupId}/decline/${userId}`, { method: 'PUT' });
              await dispatch(fetchGroup(groupId));
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to decline');
            } finally {
              setActionLoading(null);
            }
          }
        },
      ]
    );
  };

  const handleJoin = async () => {
    setActionLoading('join');
    try {
      await api.joinGroup(groupId);
      await dispatch(fetchGroup(groupId));
      Alert.alert('Request Sent! 🎉', 'The group creator will review your request.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to join group');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (isLoading && !group) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <IconButton icon="alert-circle-outline" size={64} iconColor={COLORS.textLight} />
        <Text style={styles.errorText}>Group not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const emoji = ACTIVITY_EMOJIS[group.activityType] || '🎯';
  const spotsLeft = group.lookingFor || 0;
  const approvedMembers = group.members?.filter(m => m.status === 'approved') || [];

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
        <Text style={styles.headerTitle}>Group Details</Text>
        {isCreator && (
          <IconButton icon="cog" size={24} iconColor={COLORS.textSecondary} />
        )}
        {!isCreator && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Main Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.activityBadgeRow}>
            <View style={styles.activityBadge}>
              <Text style={styles.activityEmoji}>{emoji}</Text>
            </View>
            <View style={styles.statusTextContainer}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[group.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[group.status] }]}>
                  {group.status?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.groupTitle}>{group.title}</Text>

          {group.description ? (
            <Text style={styles.groupDescription}>{group.description}</Text>
          ) : null}

          {/* Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <IconButton icon="calendar" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(group.date)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <IconButton icon="clock-outline" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{group.time}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <IconButton icon="map-marker" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{group.neighborhood}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <IconButton icon="account-group" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Spots</Text>
                <Text style={styles.detailValue}>
                  {approvedMembers.length} members · {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                </Text>
              </View>
            </View>
          </View>

          {/* Creator */}
          <Divider style={styles.divider} />
          <View style={styles.creatorRow}>
            <Avatar.Text
              size={40}
              label={(group.creatorName || 'U').charAt(0).toUpperCase()}
              style={{ backgroundColor: COLORS.primaryLight }}
              labelStyle={{ color: COLORS.textWhite }}
            />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorLabel}>Created by</Text>
              <Text style={styles.creatorName}>{group.creatorName || 'Someone'}</Text>
            </View>
          </View>
        </View>

        {/* Members */}
        <Text style={styles.sectionTitle}>
          Members ({approvedMembers.length})
        </Text>
        <View style={styles.membersList}>
          {approvedMembers.map((member) => (
            <View key={member.userId} style={styles.memberItem}>
              <Avatar.Text
                size={40}
                label={(member.name || 'U').charAt(0).toUpperCase()}
                style={{
                  backgroundColor: member.role === 'creator' ? COLORS.primary : COLORS.surfaceDark,
                }}
                labelStyle={{
                  color: member.role === 'creator' ? COLORS.textWhite : COLORS.textSecondary,
                  fontSize: 14,
                }}
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.name || 'Someone'}
                  {member.userId === authUser?.id ? ' (You)' : ''}
                </Text>
                <Text style={styles.memberRole}>
                  {member.role === 'creator' ? '👑 Organizer' : '✅ Member'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pending Requests (Creator Only) */}
        {isCreator && hasPending && (
          <>
            <Text style={styles.sectionTitle}>
              Pending Requests ({group.pendingRequests.length})
            </Text>
            <View style={styles.membersList}>
              {group.pendingRequests.map((req) => (
                <View key={req.userId} style={styles.pendingItem}>
                  <Avatar.Text
                    size={40}
                    label={(req.name || 'U').charAt(0).toUpperCase()}
                    style={{ backgroundColor: COLORS.warning + '40' }}
                    labelStyle={{ color: COLORS.textPrimary, fontSize: 14 }}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{req.name || 'Someone'}</Text>
                    <Text style={styles.memberRole}>Wants to join</Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(req.userId)}
                      disabled={actionLoading === req.userId}
                    >
                      {actionLoading === req.userId ? (
                        <ActivityIndicator size="small" color={COLORS.textWhite} />
                      ) : (
                        <IconButton icon="check" size={20} iconColor={COLORS.textWhite} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDecline(req.userId)}
                      disabled={actionLoading === req.userId}
                    >
                      <IconButton icon="close" size={20} iconColor={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isMember && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('GroupChat', { groupId, groupTitle: group.title })}
              style={styles.chatButton}
              buttonColor={COLORS.primary}
              contentStyle={styles.buttonContent}
              icon="chat"
            >
              Open Group Chat
            </Button>
          )}

          {!isMember && !isCreator && group.status === 'open' && (
            <Button
              mode="contained"
              onPress={handleJoin}
              loading={actionLoading === 'join'}
              disabled={actionLoading === 'join'}
              style={styles.joinButton}
              buttonColor={COLORS.primary}
              contentStyle={styles.buttonContent}
              icon="account-plus"
            >
              Request to Join
            </Button>
          )}

          {isMember && !isCreator && (
            <Button
              mode="outlined"
              onPress={() => {
                Alert.alert('Leave Group', 'Are you sure you want to leave?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.request(`/groups/${groupId}/leave`, { method: 'DELETE' });
                        navigation.goBack();
                      } catch (err) {
                        Alert.alert('Error', err.message);
                      }
                    },
                  },
                ]);
              }}
              style={styles.leaveButton}
              textColor={COLORS.error}
              contentStyle={styles.buttonContent}
              icon="exit-to-app"
            >
              Leave Group
            </Button>
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  // Info Card
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  activityBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activityBadge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmoji: {
    fontSize: 28,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  groupDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  detailsGrid: {
    gap: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    margin: 0,
    marginRight: SPACING.sm,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  divider: {
    marginVertical: SPACING.md,
    backgroundColor: COLORS.border,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    marginLeft: SPACING.md,
  },
  creatorLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Members
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  membersList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  memberRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Pending
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.warning + '08',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  approveButton: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.round,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: COLORS.error + '15',
    borderRadius: RADIUS.round,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Actions
  actionContainer: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  chatButton: {
    borderRadius: RADIUS.round,
  },
  joinButton: {
    borderRadius: RADIUS.round,
  },
  leaveButton: {
    borderRadius: RADIUS.round,
    borderColor: COLORS.error,
  },
  buttonContent: {
    paddingVertical: SPACING.sm,
  },
});
