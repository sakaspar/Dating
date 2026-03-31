/**
 * Profile Creation Wizard - 5 Steps
 *
 * Step 1: Basic Info (name, age, gender, location)
 * Step 2: Photo Upload (3-6 photos)
 * Step 3: Relationship Intention
 * Step 4: Activity Preferences (2-4)
 * Step 5: Bio & Interests
 */

import React, { useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Chip,
  RadioButton,
  ProgressBar,
  IconButton,
  HelperText,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';
import { updateProfile } from '../store/slices/profileSlice';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants matching backend
const GENDERS = [
  { id: 'male', label: 'Man', emoji: '👨' },
  { id: 'female', label: 'Woman', emoji: '👩' },
];

const NEIGHBORHOODS = [
  'Tunis Centre', 'La Marsa', 'Carthage', 'Sidi Bou Said',
  'Gammarth', 'Ariana', 'Manouba', 'Ben Arous',
  'Bardo', 'Manar', 'Menzah', 'Lac',
];

const INTENTIONS = [
  { id: 'serious', label: 'Serious relationship', emoji: '💍' },
  { id: 'dating', label: 'Dating/Casual dating', emoji: '❤️' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝' },
  { id: 'open', label: 'Open to anything', emoji: '✨' },
];

const ACTIVITIES = [
  { id: 'coffee', label: 'Coffee/Café', emoji: '☕' },
  { id: 'restaurant', label: 'Restaurant/Dining', emoji: '🍽️' },
  { id: 'activities', label: 'Activities', emoji: '🎮' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'social', label: 'Social/Group', emoji: '👥' },
  { id: 'events', label: 'Events', emoji: '🎬' },
];

const INTERESTS = [
  'Photography', 'Music', 'Sports', 'Travel', 'Cooking',
  'Reading', 'Gaming', 'Art', 'Fitness', 'Movies',
  'Dancing', 'Tech', 'Nature', 'Fashion', 'Food',
  'Yoga', 'Hiking', 'Swimming', 'Football', 'Tennis',
];

export default function ProfileWizardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Info
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood || '');
  const [location, setLocation] = useState(user?.location || null);

  // Step 2: Photos
  const [photos, setPhotos] = useState(user?.photos || []);

  // Step 3: Intention
  const [intention, setIntention] = useState(user?.intention || '');

  // Step 4: Activities
  const [selectedActivities, setSelectedActivities] = useState(user?.activities || []);

  // Step 5: Bio & Interests
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests || []);

  const [errors, setErrors] = useState({});

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to find nearby matches.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch (err) {
      Alert.alert('Error', 'Could not get your location. You can set it manually.');
    }
  };

  const toggleActivity = (id) => {
    if (selectedActivities.includes(id)) {
      setSelectedActivities(selectedActivities.filter(a => a !== id));
    } else if (selectedActivities.length < 4) {
      setSelectedActivities([...selectedActivities, id]);
    }
  };

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 10) {
      setInterests([...interests, interest]);
    }
  };

  const validateStep = () => {
    const newErrors = {};
    switch (step) {
      case 1:
        if (!fullName.trim()) newErrors.fullName = 'Name is required';
        if (!age || isNaN(age) || parseInt(age) < 18 || parseInt(age) > 99) newErrors.age = 'Valid age (18-99) required';
        if (!gender) newErrors.gender = 'Please select your gender';
        if (!neighborhood) newErrors.neighborhood = 'Please select your area';
        break;
      case 2:
        if (photos.length < 3) newErrors.photos = 'At least 3 photos required';
        break;
      case 3:
        if (!intention) newErrors.intention = 'Please select your intention';
        break;
      case 4:
        if (selectedActivities.length < 2) newErrors.activities = 'Select 2-4 activities';
        break;
      case 5:
        if (bio.length > 500) newErrors.bio = 'Bio must be under 500 characters';
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const profileData = {
        fullName: fullName.trim(),
        age: parseInt(age),
        gender,
        neighborhood,
        location,
        intention,
        activities: selectedActivities,
        bio: bio.trim(),
        interests,
        profileComplete: true,
      };
      await api.updateProfile(profileData);
      dispatch(updateProfile(profileData));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={(t) => { setFullName(t); if (errors.fullName) setErrors({...errors, fullName: null}); }}
        mode="outlined"
        error={!!errors.fullName}
        left={<TextInput.Icon icon="account-outline" />}
        style={styles.input}
        outlineStyle={styles.inputOutline}
        theme={{ colors: { primary: COLORS.primary } }}
      />
      {errors.fullName && <HelperText type="error">{errors.fullName}</HelperText>}

      <TextInput
        label="Age"
        value={age}
        onChangeText={(t) => { setAge(t.replace(/[^0-9]/g, '').slice(0, 2)); if (errors.age) setErrors({...errors, age: null}); }}
        mode="outlined"
        keyboardType="numeric"
        error={!!errors.age}
        left={<TextInput.Icon icon="calendar-outline" />}
        style={styles.input}
        outlineStyle={styles.inputOutline}
        theme={{ colors: { primary: COLORS.primary } }}
      />
      {errors.age && <HelperText type="error">{errors.age}</HelperText>}

      <Text style={styles.sectionLabel}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.genderCard, gender === g.id && styles.genderCardSelected]}
            onPress={() => { setGender(g.id); if (errors.gender) setErrors({...errors, gender: null}); }}
          >
            <Text style={styles.genderEmoji}>{g.emoji}</Text>
            <Text style={[styles.genderLabel, gender === g.id && styles.genderLabelSelected]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.gender && <HelperText type="error">{errors.gender}</HelperText>}

      <Text style={styles.sectionLabel}>Your Area</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {NEIGHBORHOODS.map((n) => (
          <Chip
            key={n}
            selected={neighborhood === n}
            onPress={() => { setNeighborhood(n); if (errors.neighborhood) setErrors({...errors, neighborhood: null}); }}
            style={[styles.chip, neighborhood === n && styles.chipSelected]}
            textStyle={neighborhood === n ? styles.chipTextSelected : styles.chipText}
            showSelectedOverlay
          >
            {n}
          </Chip>
        ))}
      </ScrollView>
      {errors.neighborhood && <HelperText type="error">{errors.neighborhood}</HelperText>}

      <Button
        mode="outlined"
        onPress={getLocation}
        icon="crosshairs-gps"
        style={styles.gpsButton}
        textColor={COLORS.primary}
      >
        {location ? '✓ Location set' : 'Get GPS Location'}
      </Button>
    </View>
  );

  const pickImage = async (index) => {
    // If slot already has photo, remove it
    if (photos[index]) {
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);
      setPhotos(newPhotos);
      return;
    }

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access photos is required!');
      return;
    }

    // Launch picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const newPhotos = [...photos];
      newPhotos.push(result.assets[0].uri);
      setPhotos(newPhotos);
    }
  };

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>Upload 3-6 photos of yourself</Text>

      <View style={styles.photoGrid}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <TouchableOpacity
            key={index}
            style={[styles.photoSlot, photos[index] && styles.photoSlotFilled]}
            onPress={() => pickImage(index)}
          >
            <IconButton
              icon={photos[index] ? 'close' : 'camera-plus-outline'}
              size={28}
              iconColor={photos[index] ? COLORS.error : COLORS.textLight}
            />
            {index === 0 && <Text style={styles.photoMainLabel}>Main</Text>}
          </TouchableOpacity>
        ))}
      </View>
      {errors.photos && <HelperText type="error">{errors.photos}</HelperText>}
      <Text style={styles.photoHint}>First photo will be your main profile picture</Text>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What are you looking for?</Text>
      <Text style={styles.stepSubtitle}>Your relationship intention</Text>

      {INTENTIONS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.intentionCard, intention === item.id && styles.intentionCardSelected]}
          onPress={() => { setIntention(item.id); if (errors.intention) setErrors({...errors, intention: null}); }}
        >
          <Text style={styles.intentionEmoji}>{item.emoji}</Text>
          <Text style={[styles.intentionLabel, intention === item.id && styles.intentionLabelSelected]}>
            {item.label}
          </Text>
          <View style={[styles.radio, intention === item.id && styles.radioSelected]}>
            {intention === item.id && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ))}
      {errors.intention && <HelperText type="error">{errors.intention}</HelperText>}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Activity Preferences</Text>
      <Text style={styles.stepSubtitle}>Pick 2-4 activities you enjoy ({selectedActivities.length}/4)</Text>

      <View style={styles.activityGrid}>
        {ACTIVITIES.map((item) => {
          const selected = selectedActivities.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.activityCard, selected && styles.activityCardSelected]}
              onPress={() => { toggleActivity(item.id); if (errors.activities) setErrors({...errors, activities: null}); }}
            >
              <Text style={styles.activityEmoji}>{item.emoji}</Text>
              <Text style={[styles.activityLabel, selected && styles.activityLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.activities && <HelperText type="error">{errors.activities}</HelperText>}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>About You</Text>
      <Text style={styles.stepSubtitle}>Tell others what makes you interesting</Text>

      <TextInput
        label="Bio (optional)"
        value={bio}
        onChangeText={(t) => { setBio(t); if (errors.bio) setErrors({...errors, bio: null}); }}
        mode="outlined"
        multiline
        numberOfLines={4}
        maxLength={500}
        error={!!errors.bio}
        style={styles.bioInput}
        outlineStyle={styles.inputOutline}
        theme={{ colors: { primary: COLORS.primary } }}
      />
      <Text style={styles.charCount}>{bio.length}/500</Text>
      {errors.bio && <HelperText type="error">{errors.bio}</HelperText>}

      <Text style={styles.sectionLabel}>Interests (optional, pick up to 10)</Text>
      <View style={styles.interestGrid}>
        {INTERESTS.map((item) => {
          const selected = interests.includes(item);
          return (
            <Chip
              key={item}
              selected={selected}
              onPress={() => toggleInterest(item)}
              style={[styles.interestChip, selected && styles.interestChipSelected]}
              textStyle={selected ? styles.chipTextSelected : styles.chipText}
              showSelectedOverlay
            >
              {item}
            </Chip>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={step / 5} color={COLORS.primary} style={styles.progressBar} />
        <Text style={styles.progressText}>Step {step} of 5</Text>
      </View>

      {/* Step content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navContainer}>
        {step > 1 && (
          <Button
            mode="outlined"
            onPress={handleBack}
            style={styles.backButton}
            textColor={COLORS.textSecondary}
          >
            Back
          </Button>
        )}
        <Button
          mode="contained"
          onPress={handleNext}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
          buttonColor={COLORS.primary}
          contentStyle={styles.buttonContent}
        >
          {step === 5 ? (isSubmitting ? 'Saving...' : 'Complete Profile') : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceDark,
  },
  progressText: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  stepContent: {
    padding: SPACING.xl,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  input: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: RADIUS.md,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  // Gender
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  genderCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  genderEmoji: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  genderLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Chips
  chipScroll: {
    marginBottom: SPACING.sm,
  },
  chip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.textWhite,
  },
  gpsButton: {
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
  },
  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  photoSlot: {
    width: (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md * 2) / 3,
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotFilled: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
    borderStyle: 'solid',
  },
  photoMainLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -SPACING.xs,
  },
  photoHint: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: SPACING.md,
    fontSize: 13,
  },
  // Intentions
  intentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  intentionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  intentionEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  intentionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  intentionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  // Activities
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  activityCard: {
    width: (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md) / 2,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  activityCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  activityEmoji: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Bio
  bioInput: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  charCount: {
    textAlign: 'right',
    color: COLORS.textLight,
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  // Interests
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  interestChip: {
    backgroundColor: COLORS.surface,
  },
  interestChipSelected: {
    backgroundColor: COLORS.primary,
  },
  // Navigation
  navContainer: {
    flexDirection: 'row',
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xxl : SPACING.xl,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  backButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderColor: COLORS.border,
  },
  nextButton: {
    flex: 2,
    borderRadius: RADIUS.md,
  },
  nextButtonFull: {
    flex: 1,
  },
  buttonContent: {
    height: 50,
  },
});
