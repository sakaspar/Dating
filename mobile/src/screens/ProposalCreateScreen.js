/**
 * Proposal Create Screen — "Suggest a Plan"
 *
 * The core differentiator of Doukhou.
 * - Activity type selector (from shared activities)
 * - Calendar date picker (future only)
 * - Time picker
 * - Neighborhood dropdown (Tunis areas)
 * - Budget range selector
 * - Place search field
 * - Notes
 * - Smart suggestions from shared activities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import {
  Text,
  TextInput,
  IconButton,
  Button,
  Chip,
  Divider,
  Avatar,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { createProposal, fetchSuggestions } from '../store/slices/proposalsSlice';
import PlaceSearch from '../components/PlaceSearch';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

const NEIGHBORHOODS = [
  'Tunis Centre', 'La Marsa', 'Carthage', 'Sidi Bou Said',
  'Gammarth', 'Ariana', 'Manouba', 'Ben Arous',
  'Bardo', 'Manar', 'Menzah', 'Lac',
];

const BUDGET_RANGES = [
  { label: 'Low', description: 'Under 30 TND', emoji: '💰' },
  { label: 'Medium', description: '30-80 TND', emoji: '💰💰' },
  { label: 'High', description: 'Over 80 TND', emoji: '💰💰💰' },
];

const ACTIVITY_OPTIONS = [
  { id: 'coffee', label: 'Coffee/Café', emoji: '☕' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'activities', label: 'Activities', emoji: '🎮' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'events', label: 'Events', emoji: '🎬' },
];

export default function ProposalCreateScreen({ navigation, route }) {
  const { matchId, user } = route.params;
  const dispatch = useDispatch();
  const { suggestions, isLoading } = useSelector((state) => state.proposals);
  const authUser = useSelector((state) => state.auth.user);

  const [step, setStep] = useState(0); // 0=activity, 1=datetime, 2=details
  const [activityType, setActivityType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [suggestedPlace, setSuggestedPlace] = useState('');
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);

  const sharedActivities = user.sharedActivities || [];
  const matchSuggestions = suggestions[matchId] || [];

  // Fetch smart suggestions on mount
  useEffect(() => {
    dispatch(fetchSuggestions(matchId));
  }, [matchId]);

  // Pre-fill activity from shared activities
  useEffect(() => {
    if (sharedActivities.length > 0 && !activityType) {
      setActivityType(sharedActivities[0]);
    }
  }, [sharedActivities]);

  // Generate date options (next 14 days)
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      options.push({
        value: d.toISOString().split('T')[0],
        label: `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`,
        full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      });
    }
    return options;
  };

  // Generate time options (every 30 min from 8:00 to 23:00)
  const getTimeOptions = () => {
    const options = [];
    for (let h = 8; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const hour12 = h > 12 ? h - 12 : h;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        options.push({ value: val, label });
      }
    }
    return options;
  };

  const handleSubmit = useCallback(async () => {
    if (!activityType || !date || !time || !neighborhood) {
      Alert.alert('Missing Info', 'Please fill in the activity, date, time, and area.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(createProposal({
        matchId,
        activityType,
        date,
        time,
        neighborhood,
        budgetRange: budgetRange || undefined,
        suggestedPlace: suggestedPlace || undefined,
        notes: notes || undefined,
      })).unwrap();

      Alert.alert(
        '🎉 Plan Sent!',
        `Your ${getActivityLabel(activityType)} plan has been sent to ${user.fullName || 'your match'}.`,
        [{ text: 'Nice!', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send proposal');
    } finally {
      setIsSubmitting(false);
    }
  }, [activityType, date, time, neighborhood, budgetRange, suggestedPlace, notes, matchId]);

  const getActivityLabel = (id) => {
    const found = ACTIVITY_OPTIONS.find(a => a.id === id);
    return found ? found.label : id;
  };

  const canProceed = () => {
    if (step === 0) return !!activityType;
    if (step === 1) return !!date && !!time;
    return true;
  };

  // Render activity selection step
  const renderActivityStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's the plan? 🎯</Text>
      <Text style={styles.stepSubtitle}>
        Pick an activity you'd both enjoy
      </Text>

      {/* Shared activities highlight */}
      {sharedActivities.length > 0 && (
        <View style={styles.sharedSection}>
          <Text style={styles.sharedLabel}>✨ Your shared activities</Text>
          <View style={styles.chipRow}>
            {sharedActivities.map((actId) => {
              const act = ACTIVITY_OPTIONS.find(a => a.id === actId);
              return act ? (
                <TouchableOpacity
                  key={actId}
                  style={[
                    styles.activityChip,
                    activityType === actId && styles.activityChipSelected,
                  ]}
                  onPress={() => setActivityType(actId)}
                >
                  <Text style={styles.activityEmoji}>{act.emoji}</Text>
                  <Text style={[
                    styles.activityLabel,
                    activityType === actId && styles.activityLabelSelected,
                  ]}>
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ) : null;
            })}
          </View>
        </View>
      )}

      {/* All activities */}
      <Text style={styles.sectionLabel}>All activities</Text>
      <View style={styles.activityGrid}>
        {ACTIVITY_OPTIONS.map((act) => (
          <TouchableOpacity
            key={act.id}
            style={[
              styles.activityCard,
              activityType === act.id && styles.activityCardSelected,
              sharedActivities.includes(act.id) && styles.activityCardShared,
            ]}
            onPress={() => setActivityType(act.id)}
          >
            <Text style={styles.activityCardEmoji}>{act.emoji}</Text>
            <Text style={[
              styles.activityCardLabel,
              activityType === act.id && styles.activityCardLabelSelected,
            ]}>
              {act.label}
            </Text>
            {sharedActivities.includes(act.id) && (
              <Text style={styles.sharedBadge}>Shared</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render date/time step
  const renderDateTimeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When? 📅</Text>
      <Text style={styles.stepSubtitle}>
        Pick a date and time that works
      </Text>

      {/* Date selector */}
      <Text style={styles.fieldLabel}>Date</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowDatePicker(true)}
      >
        <IconButton icon="calendar" size={20} iconColor={COLORS.primary} />
        <Text style={[styles.pickerText, !date && styles.pickerPlaceholder]}>
          {date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          }) : 'Select a date'}
        </Text>
        <IconButton icon="chevron-down" size={20} />
      </TouchableOpacity>

      {/* Time selector */}
      <Text style={styles.fieldLabel}>Time</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowTimePicker(true)}
      >
        <IconButton icon="clock-outline" size={20} iconColor={COLORS.primary} />
        <Text style={[styles.pickerText, !time && styles.pickerPlaceholder]}>
          {time || 'Select a time'}
        </Text>
        <IconButton icon="chevron-down" size={20} />
      </TouchableOpacity>
    </View>
  );

  // Render details step
  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>The details ✨</Text>
      <Text style={styles.stepSubtitle}>
        Where and how much? (Optional but helpful)
      </Text>

      {/* Neighborhood */}
      <Text style={styles.fieldLabel}>Area in Tunis</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowNeighborhoodPicker(true)}
      >
        <IconButton icon="map-marker" size={20} iconColor={COLORS.primary} />
        <Text style={[styles.pickerText, !neighborhood && styles.pickerPlaceholder]}>
          {neighborhood || 'Select neighborhood'}
        </Text>
        <IconButton icon="chevron-down" size={20} />
      </TouchableOpacity>

      {/* Budget range */}
      <Text style={styles.fieldLabel}>Budget (optional)</Text>
      <View style={styles.budgetRow}>
        {BUDGET_RANGES.map((b) => (
          <TouchableOpacity
            key={b.label}
            style={[
              styles.budgetCard,
              budgetRange === b.label && styles.budgetCardSelected,
            ]}
            onPress={() => setBudgetRange(budgetRange === b.label ? '' : b.label)}
          >
            <Text style={styles.budgetEmoji}>{b.emoji}</Text>
            <Text style={[
              styles.budgetLabel,
              budgetRange === b.label && styles.budgetLabelSelected,
            ]}>
              {b.label}
            </Text>
            <Text style={styles.budgetDesc}>{b.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Suggested place — OSM Nominatim search */}
      <Text style={styles.fieldLabel}>Specific place (optional)</Text>
      <PlaceSearch
        onSelect={(place) => {
          setSuggestedPlace(place.name);
          // Store coordinates for map display
          setSelectedPlaceCoords({ lat: place.lat, lon: place.lon });
        }}
        placeholder="Search for a place..."
        initialValue={suggestedPlace}
      />

      {/* Smart suggestions */}
      {matchSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionLabel}>💡 Suggested places nearby</Text>
          {matchSuggestions.slice(0, 3).map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionCard}
              onPress={() => setSuggestedPlace(s.name)}
            >
              <IconButton icon="map-marker-outline" size={20} iconColor={COLORS.primary} />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName}>{s.name}</Text>
                {s.address && (
                  <Text style={styles.suggestionAddress} numberOfLines={1}>{s.address}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Notes */}
      <Text style={styles.fieldLabel}>Notes (optional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything else you'd like to add..."
        placeholderTextColor={COLORS.textLight}
        style={[styles.textInput, { minHeight: 80 }]}
        mode="outlined"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        multiline
        maxLength={500}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={COLORS.textPrimary}
        />
        <Text style={styles.headerTitle}>Suggest a Plan 📋</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {['Activity', 'Date & Time', 'Details'].map((label, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.stepDot,
              step === i && styles.stepDotActive,
              step > i && styles.stepDotDone,
            ]}
            onPress={() => {
              if (i < step || canProceed()) setStep(i);
            }}
          >
            <Text style={[
              styles.stepDotText,
              (step === i || step > i) && styles.stepDotTextActive,
            ]}>
              {step > i ? '✓' : i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Who it's for */}
      <View style={styles.recipientRow}>
        <Avatar.Text
          size={36}
          label={(user.fullName || 'U').charAt(0).toUpperCase()}
          style={{ backgroundColor: COLORS.primaryLight }}
          labelStyle={{ color: COLORS.textWhite }}
        />
        <Text style={styles.recipientText}>
          Planning with {user.fullName || 'your match'}
        </Text>
      </View>

      {/* Step content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && renderActivityStep()}
        {step === 1 && renderDateTimeStep()}
        {step === 2 && renderDetailsStep()}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        {step > 0 && (
          <Button
            mode="text"
            onPress={() => setStep(step - 1)}
            textColor={COLORS.textSecondary}
          >
            Back
          </Button>
        )}
        <View style={{ flex: 1 }} />
        {step < 2 ? (
          <Button
            mode="contained"
            onPress={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
            style={styles.nextButton}
            buttonColor={COLORS.primary}
          >
            Next
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
            buttonColor={COLORS.secondary}
            icon="send"
          >
            Send Plan 🚀
          </Button>
        )}
      </View>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a Date</Text>
              <IconButton icon="close" onPress={() => setShowDatePicker(false)} />
            </View>
            <ScrollView style={styles.modalList}>
              {getDateOptions().map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    date === opt.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setDate(opt.value);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    date === opt.value && styles.modalOptionTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                  {date === opt.value && <IconButton icon="check" size={20} iconColor={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a Time</Text>
              <IconButton icon="close" onPress={() => setShowTimePicker(false)} />
            </View>
            <ScrollView style={styles.modalList}>
              {getTimeOptions().map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    time === opt.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setTime(opt.value);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    time === opt.value && styles.modalOptionTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                  {time === opt.value && <IconButton icon="check" size={20} iconColor={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Neighborhood Picker Modal */}
      <Modal visible={showNeighborhoodPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Area</Text>
              <IconButton icon="close" onPress={() => setShowNeighborhoodPicker(false)} />
            </View>
            <ScrollView style={styles.modalList}>
              {NEIGHBORHOODS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.modalOption,
                    neighborhood === n && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setNeighborhood(n);
                    setShowNeighborhoodPicker(false);
                  }}
                >
                  <IconButton icon="map-marker" size={20} iconColor={COLORS.primary} />
                  <Text style={[
                    styles.modalOptionText,
                    neighborhood === n && styles.modalOptionTextSelected,
                  ]}>
                    {n}
                  </Text>
                  {neighborhood === n && <IconButton icon="check" size={20} iconColor={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '30',
  },
  stepDotDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '20',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  stepDotTextActive: {
    color: COLORS.primary,
  },
  // Recipient
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceDark,
  },
  recipientText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  stepContainer: {},
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  // Shared activities
  sharedSection: {
    marginBottom: SPACING.lg,
  },
  sharedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  activityChip: {
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
  activityChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  activityEmoji: {
    fontSize: 18,
  },
  activityLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  activityLabelSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Activity grid
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  activityCard: {
    width: '48%',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  activityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  activityCardShared: {
    borderColor: COLORS.primaryLight,
  },
  activityCardEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  activityCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  activityCardLabelSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  sharedBadge: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  // Date/time step
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  pickerPlaceholder: {
    color: COLORS.textLight,
  },
  // Budget
  budgetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  budgetCard: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  budgetCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  budgetEmoji: {
    fontSize: 16,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  budgetLabelSelected: {
    color: COLORS.primary,
  },
  budgetDesc: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Place search
  textInput: {
    backgroundColor: COLORS.surface,
    fontSize: 14,
  },
  // Suggestions
  suggestionsSection: {
    marginTop: SPACING.lg,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    ...SHADOWS.small,
  },
  suggestionInfo: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  suggestionAddress: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.lg,
  },
  submitButton: {
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.xl,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '60%',
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
  modalList: {
    padding: SPACING.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
