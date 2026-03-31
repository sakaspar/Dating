/**
 * Group Create Screen
 *
 * - Activity type picker
 * - Title, description
 * - Date/time pickers
 * - Neighborhood dropdown
 * - Group size & looking for X more
 * - Visibility & preferences
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Divider,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { createGroup } from '../store/slices/groupsSlice';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const ACTIVITY_TYPES = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'activities', label: 'Activities', emoji: '🎮' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'events', label: 'Events', emoji: '🎬' },
];

const NEIGHBORHOODS = [
  'Tunis Centre', 'La Marsa', 'Sidi Bou Said', 'Carthage',
  'Les Berges du Lac', 'El Menzah', 'Ennasr', 'Ariana',
  'La Goulette', 'Le Kram', 'Hammamet', 'Sousse',
];

const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];
const LOOKING_FOR = [1, 2, 3, 4, 5, 6, 7, 8];

export default function GroupCreateScreen({ navigation }) {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [currentGroupSize, setCurrentGroupSize] = useState(1);
  const [lookingFor, setLookingFor] = useState(2);
  const [visibility, setVisibility] = useState('public');
  const [genderPreference, setGenderPreference] = useState('any');

  // Simple date input (YYYY-MM-DD)
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);

  const isValid = activityType && title.trim().length >= 3 && dateInput && timeInput && neighborhood;

  const handleCreate = async () => {
    if (!isValid) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(createGroup({
        activityType,
        title: title.trim(),
        description: description.trim(),
        date: dateInput,
        time: timeInput,
        neighborhood,
        currentGroupSize,
        lookingFor,
        visibility,
        genderPreference,
      })).unwrap();

      navigation.replace('GroupDetail', { groupId: result.group?.id || result.id });
    } catch (err) {
      Alert.alert('Error', err || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Create Group 👥</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Activity Type */}
        <Text style={styles.sectionLabel}>Activity Type *</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_TYPES.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.activityCard,
                activityType === a.id && styles.activityCardActive,
              ]}
              onPress={() => setActivityType(a.id)}
            >
              <Text style={styles.activityEmoji}>{a.emoji}</Text>
              <Text style={[
                styles.activityLabel,
                activityType === a.id && styles.activityLabelActive,
              ]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.sectionLabel}>Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Coffee at Café de Paris"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          maxLength={80}
        />

        {/* Description */}
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's the plan?"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        {/* Date */}
        <Text style={styles.sectionLabel}>Date *</Text>
        <TextInput
          value={dateInput}
          onChangeText={setDateInput}
          placeholder="YYYY-MM-DD (e.g., 2026-04-15)"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          keyboardType="numeric"
          left={<TextInput.Icon icon="calendar" color={COLORS.textLight} />}
        />

        {/* Time */}
        <Text style={styles.sectionLabel}>Time *</Text>
        <TextInput
          value={timeInput}
          onChangeText={setTimeInput}
          placeholder="HH:MM (e.g., 18:30)"
          mode="outlined"
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          keyboardType="numeric"
          left={<TextInput.Icon icon="clock-outline" color={COLORS.textLight} />}
        />

        {/* Neighborhood */}
        <Text style={styles.sectionLabel}>Neighborhood *</Text>
        <TouchableOpacity
          style={styles.neighborhoodSelector}
          onPress={() => setShowNeighborhoodPicker(!showNeighborhoodPicker)}
        >
          <Text style={neighborhood ? styles.neighborhoodSelected : styles.neighborhoodPlaceholder}>
            {neighborhood || 'Select area...'}
          </Text>
          <IconButton
            icon={showNeighborhoodPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            iconColor={COLORS.textLight}
          />
        </TouchableOpacity>
        {showNeighborhoodPicker && (
          <View style={styles.neighborhoodList}>
            {NEIGHBORHOODS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.neighborhoodItem,
                  neighborhood === n && styles.neighborhoodItemActive,
                ]}
                onPress={() => {
                  setNeighborhood(n);
                  setShowNeighborhoodPicker(false);
                }}
              >
                <Text style={[
                  styles.neighborhoodItemText,
                  neighborhood === n && styles.neighborhoodItemTextActive,
                ]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Divider style={styles.divider} />

        {/* Group Size */}
        <Text style={styles.sectionLabel}>Your group size</Text>
        <View style={styles.chipRow}>
          {GROUP_SIZES.map((n) => (
            <Chip
              key={n}
              selected={currentGroupSize === n}
              onPress={() => setCurrentGroupSize(n)}
              style={[
                styles.sizeChip,
                currentGroupSize === n && styles.sizeChipActive,
              ]}
              textStyle={[
                styles.sizeChipText,
                currentGroupSize === n && styles.sizeChipTextActive,
              ]}
              showSelectedOverlay
            >
              {n}
            </Chip>
          ))}
        </View>

        {/* Looking For */}
        <Text style={styles.sectionLabel}>Looking for how many more?</Text>
        <View style={styles.chipRow}>
          {LOOKING_FOR.map((n) => (
            <Chip
              key={n}
              selected={lookingFor === n}
              onPress={() => setLookingFor(n)}
              style={[
                styles.sizeChip,
                lookingFor === n && styles.sizeChipActive,
              ]}
              textStyle={[
                styles.sizeChipText,
                lookingFor === n && styles.sizeChipTextActive,
              ]}
              showSelectedOverlay
            >
              +{n}
            </Chip>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Visibility */}
        <Text style={styles.sectionLabel}>Visibility</Text>
        <View style={styles.chipRow}>
          <Chip
            selected={visibility === 'public'}
            onPress={() => setVisibility('public')}
            style={[
              styles.sizeChip,
              visibility === 'public' && styles.sizeChipActive,
            ]}
            textStyle={[
              styles.sizeChipText,
              visibility === 'public' && styles.sizeChipTextActive,
            ]}
            showSelectedOverlay
          >
            🌐 Public
          </Chip>
          <Chip
            selected={visibility === 'matches_only'}
            onPress={() => setVisibility('matches_only')}
            style={[
              styles.sizeChip,
              visibility === 'matches_only' && styles.sizeChipActive,
            ]}
            textStyle={[
              styles.sizeChipText,
              visibility === 'matches_only' && styles.sizeChipTextActive,
            ]}
            showSelectedOverlay
          >
            💕 Matches Only
          </Chip>
        </View>

        {/* Gender Preference */}
        <Text style={styles.sectionLabel}>Gender preference</Text>
        <View style={styles.chipRow}>
          {['any', 'male', 'female'].map((g) => (
            <Chip
              key={g}
              selected={genderPreference === g}
              onPress={() => setGenderPreference(g)}
              style={[
                styles.sizeChip,
                genderPreference === g && styles.sizeChipActive,
              ]}
              textStyle={[
                styles.sizeChipText,
                genderPreference === g && styles.sizeChipTextActive,
              ]}
              showSelectedOverlay
            >
              {g === 'any' ? '🌍 Any' : g === 'male' ? '👨 Guys' : '👩 Girls'}
            </Chip>
          ))}
        </View>

        {/* Create Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleCreate}
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
            style={styles.createButton}
            buttonColor={COLORS.primary}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
            icon="account-group"
          >
            Create Group
          </Button>
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Activity grid
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  activityCard: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  activityCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  activityEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activityLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Inputs
  input: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  textArea: {
    minHeight: 80,
  },
  // Neighborhood picker
  neighborhoodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  neighborhoodSelected: {
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.md,
  },
  neighborhoodPlaceholder: {
    fontSize: 16,
    color: COLORS.textLight,
    paddingVertical: SPACING.md,
  },
  neighborhoodList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    maxHeight: 200,
  },
  neighborhoodItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  neighborhoodItemActive: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  neighborhoodItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  neighborhoodItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sizeChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  sizeChipActive: {
    backgroundColor: COLORS.primaryLight + '30',
    borderColor: COLORS.primary,
  },
  sizeChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  sizeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  divider: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.border,
  },
  // Button
  buttonContainer: {
    marginTop: SPACING.xl,
  },
  createButton: {
    borderRadius: RADIUS.round,
  },
  createButtonContent: {
    paddingVertical: SPACING.sm,
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
