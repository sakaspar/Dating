/**
 * Proposal View & Response Screen
 *
 * - View proposal details (activity, date, time, place, budget, notes)
 * - Accept / Decline / Modify buttons
 * - Modification form (counter-proposal)
 * - Status indicators
 * - Confirmation animation on accept
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import {
  Text,
  IconButton,
  Button,
  Avatar,
  Divider,
  TextInput,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProposals,
  acceptProposal,
  declineProposal,
} from '../store/slices/proposalsSlice';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

const ACTIVITY_OPTIONS = [
  { id: 'coffee', label: 'Coffee/Café', emoji: '☕' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'activities', label: 'Activities', emoji: '🎮' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'events', label: 'Events', emoji: '🎬' },
];

export default function ProposalViewScreen({ navigation, route }) {
  const { matchId, proposalId } = route.params;
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const proposals = useSelector((state) => state.proposals.proposals[matchId] || []);

  const [proposal, setProposal] = useState(null);
  const [showModify, setShowModify] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAnimation] = useState(new Animated.Value(0));

  // Modify form state
  const [modDate, setModDate] = useState('');
  const [modTime, setModTime] = useState('');
  const [modNotes, setModNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load proposals
  useEffect(() => {
    dispatch(fetchProposals(matchId));
  }, [matchId]);

  // Find the specific proposal
  useEffect(() => {
    const p = proposals.find(pr => pr.id === proposalId);
    if (p) setProposal(p);
  }, [proposals, proposalId]);

  const isRecipient = proposal?.recipientId === authUser?.id;
  const isProposer = proposal?.proposerId === authUser?.id;
  const canRespond = isRecipient && proposal?.status === 'pending';

  const getActivityInfo = (type) => {
    return ACTIVITY_OPTIONS.find(a => a.id === type) || { label: type, emoji: '🎯' };
  };

  // Accept handler
  const handleAccept = async () => {
    Alert.alert(
      'Accept Plan? 🎉',
      `Confirm this ${getActivityInfo(proposal.activityType).label} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept!',
          onPress: async () => {
            try {
              await dispatch(acceptProposal(proposal.id)).unwrap();
              // Show confirmation animation
              setShowConfirm(true);
              Animated.sequence([
                Animated.timing(confirmAnimation, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.delay(1500),
              ]).start(() => {
                setShowConfirm(false);
                confirmAnimation.setValue(0);
                navigation.goBack();
              });
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to accept');
            }
          },
        },
      ]
    );
  };

  // Decline handler
  const handleDecline = () => {
    Alert.alert(
      'Decline Plan?',
      'This will politely decline the plan. The other person will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(declineProposal(proposal.id)).unwrap();
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to decline');
            }
          },
        },
      ]
    );
  };

  // Modify handler
  const handleModify = async () => {
    setIsSubmitting(true);
    try {
      const modifications = {};
      if (modDate) modifications.date = modDate;
      if (modTime) modifications.time = modTime;
      if (modNotes) modifications.notes = modNotes;

      await api.modifyProposal(proposal.id, modifications);
      await dispatch(fetchProposals(matchId));
      setShowModify(false);
      Alert.alert('Sent!', 'Your counter-proposal has been sent.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!proposal) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const activityInfo = getActivityInfo(proposal.activityType);
  const dateObj = new Date(proposal.date + 'T12:00:00');

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
        <Text style={styles.headerTitle}>Plan Details</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[
          styles.statusBanner,
          proposal.status === 'accepted' && styles.statusAccepted,
          proposal.status === 'declined' && styles.statusDeclined,
          proposal.status === 'modified' && styles.statusModified,
        ]}>
          <Text style={styles.statusEmoji}>
            {proposal.status === 'accepted' ? '✅' :
             proposal.status === 'declined' ? '❌' :
             proposal.status === 'modified' ? '🔄' : '⏳'}
          </Text>
          <Text style={styles.statusText}>
            {proposal.status === 'pending' ? 'Awaiting response' :
             proposal.status === 'accepted' ? 'Plan confirmed!' :
             proposal.status === 'declined' ? 'Plan declined' :
             'Counter-proposal sent'}
          </Text>
        </View>

        {/* Main card */}
        <View style={styles.mainCard}>
          {/* Activity header */}
          <View style={styles.activityHeader}>
            <Text style={styles.activityEmoji}>{activityInfo.emoji}</Text>
            <Text style={styles.activityLabel}>{activityInfo.label}</Text>
          </View>

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <IconButton icon="calendar" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
            <View>
              <Text style={styles.detailValue}>
                {dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.detailSub}>{proposal.time}</Text>
            </View>
          </View>

          {/* Location */}
          {proposal.neighborhood && (
            <View style={styles.detailRow}>
              <IconButton icon="map-marker" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <View>
                <Text style={styles.detailValue}>{proposal.neighborhood}</Text>
                {proposal.suggestedPlace && (
                  <Text style={styles.detailSub}>{proposal.suggestedPlace}</Text>
                )}
              </View>
            </View>
          )}

          {/* Budget */}
          {proposal.budgetRange && (
            <View style={styles.detailRow}>
              <IconButton icon="cash" size={20} iconColor={COLORS.primary} style={styles.detailIcon} />
              <Text style={styles.detailValue}>
                {proposal.budgetRange} budget
                {' '}
                {proposal.budgetRange === 'Low' ? '(Under 30 TND)' :
                 proposal.budgetRange === 'Medium' ? '(30-80 TND)' : '(Over 80 TND)'}
              </Text>
            </View>
          )}

          {/* Notes */}
          {proposal.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>📝 Notes</Text>
              <Text style={styles.notesText}>{proposal.notes}</Text>
            </View>
          )}
        </View>

        {/* Modification history */}
        {proposal.modificationHistory?.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Changes made</Text>
            {proposal.modificationHistory.map((mod, i) => (
              <View key={i} style={styles.historyItem}>
                <IconButton
                  icon="pencil"
                  size={16}
                  iconColor={COLORS.textLight}
                />
                <Text style={styles.historyText}>
                  {mod.modifiedBy === authUser?.id ? 'You' : 'They'} suggested changes
                  {' · '}{new Date(mod.modifiedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Response actions */}
        {canRespond && (
          <View style={styles.actionsSection}>
            <Button
              mode="contained"
              onPress={handleAccept}
              style={styles.acceptButton}
              buttonColor={COLORS.success}
              icon="check-circle"
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              Accept Plan 🎉
            </Button>

            <Button
              mode="outlined"
              onPress={() => setShowModify(true)}
              style={styles.modifyButton}
              textColor={COLORS.primary}
              icon="pencil"
              contentStyle={styles.actionButtonContent}
            >
              Suggest Changes
            </Button>

            <Button
              mode="text"
              onPress={handleDecline}
              textColor={COLORS.textSecondary}
              style={styles.declineButton}
            >
              Decline
            </Button>
          </View>
        )}

        {/* Already responded */}
        {!canRespond && proposal.status !== 'pending' && (
          <View style={styles.respondedSection}>
            <Text style={styles.respondedText}>
              {isProposer
                ? (proposal.status === 'accepted'
                    ? 'They accepted your plan! 🎉'
                    : proposal.status === 'declined'
                      ? 'They declined the plan'
                      : 'They suggested changes')
                : (proposal.status === 'accepted'
                    ? 'You accepted this plan! 🎉'
                    : proposal.status === 'declined'
                      ? 'You declined this plan'
                      : 'You suggested changes')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modify Modal */}
      <Modal visible={showModify} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suggest Changes 🔄</Text>
              <IconButton icon="close" onPress={() => setShowModify(false)} />
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Let them know what you'd prefer differently
              </Text>

              <Text style={styles.fieldLabel}>Different date?</Text>
              <TextInput
                value={modDate}
                onChangeText={setModDate}
                placeholder="YYYY-MM-DD (future date)"
                placeholderTextColor={COLORS.textLight}
                style={styles.textInput}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.fieldLabel}>Different time?</Text>
              <TextInput
                value={modTime}
                onChangeText={setModTime}
                placeholder="HH:MM (e.g. 15:30)"
                placeholderTextColor={COLORS.textLight}
                style={styles.textInput}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={modNotes}
                onChangeText={setModNotes}
                placeholder="What would you prefer?"
                placeholderTextColor={COLORS.textLight}
                style={[styles.textInput, { minHeight: 80 }]}
                mode="outlined"
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
                multiline
              />

              <Button
                mode="contained"
                onPress={handleModify}
                loading={isSubmitting}
                disabled={isSubmitting || (!modDate && !modTime && !modNotes)}
                style={styles.sendModifyButton}
                buttonColor={COLORS.primary}
                icon="send"
              >
                Send Counter-Proposal
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Animation Overlay */}
      {showConfirm && (
        <Animated.View
          style={[
            styles.confirmOverlay,
            {
              opacity: confirmAnimation,
              transform: [{
                scale: confirmAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.confirmEmoji}>🎉</Text>
          <Text style={styles.confirmText}>Plan Confirmed!</Text>
          <Text style={styles.confirmSubtext}>See you there!</Text>
        </Animated.View>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '30',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  statusAccepted: {
    backgroundColor: COLORS.success + '30',
  },
  statusDeclined: {
    backgroundColor: COLORS.error + '20',
  },
  statusModified: {
    backgroundColor: COLORS.primaryLight + '30',
  },
  statusEmoji: {
    fontSize: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Main card
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityEmoji: {
    fontSize: 48,
  },
  activityLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailIcon: {
    margin: 0,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  detailSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notesSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  // History
  historySection: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Actions
  actionsSection: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  acceptButton: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs,
  },
  modifyButton: {
    borderRadius: RADIUS.lg,
    borderColor: COLORS.primary,
  },
  declineButton: {
    marginTop: SPACING.sm,
  },
  actionButtonContent: {
    height: 48,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Responded
  respondedSection: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  respondedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: SPACING.xl,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    fontSize: 14,
  },
  sendModifyButton: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  // Confirmation overlay
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmEmoji: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  confirmText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textWhite,
    marginBottom: SPACING.sm,
  },
  confirmSubtext: {
    fontSize: 16,
    color: COLORS.textWhite + 'CC',
  },
});
