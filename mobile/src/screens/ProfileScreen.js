/**
 * Profile & Settings Screen
 *
 * - View own profile info & photos
 * - Edit profile (name, bio, interests)
 * - Edit preferences (age range, distance, activities)
 * - Safety center link
 * - Blocked users link
 * - Help & community guidelines
 * - Logout
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Button,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import api from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, ACTIVITY_EMOJIS } from '../constants/theme';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data.profile || data);
    } catch (err) {
      console.error('Load profile error:', err);
      setProfile(authUser); // Fallback to auth user
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.logout();
          } catch (_) {}
          dispatch(logout());
        },
      },
    ]);
  };

  const displayUser = profile || authUser;
  const displayName = displayUser?.name || displayUser?.fullName || 'Your Profile';
  const photos = displayUser?.photos || [];
  const activities = displayUser?.activityPreferences || displayUser?.activities || [];
  const interests = displayUser?.interests || [];
  const bio = displayUser?.bio || '';

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
        <Text style={styles.headerTitle}>Profile ⚙️</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar.Text
            size={80}
            label={displayName.charAt(0).toUpperCase()}
            style={{ backgroundColor: COLORS.primary }}
            labelStyle={{ color: COLORS.textWhite, fontSize: 32 }}
          />
          <Text style={styles.displayName}>{displayName}</Text>
          {displayUser?.age ? (
            <Text style={styles.ageText}>{displayUser.age} years old</Text>
          ) : null}
          {displayUser?.neighborhood ? (
            <Text style={styles.locationText}>📍 {displayUser.neighborhood}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('ProfileEdit', { profile: displayUser })}
          >
            <IconButton icon="pencil" size={18} iconColor={COLORS.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        ) : null}

        {/* Activities */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorite Activities</Text>
            <View style={styles.chipRow}>
              {activities.map((act) => {
                const emoji = ACTIVITY_EMOJIS[act] || '🎯';
                return (
                  <View key={act} style={styles.activityChip}>
                    <Text style={styles.activityEmoji}>{emoji}</Text>
                    <Text style={styles.activityChipText}>{act}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chipRow}>
              {interests.map((int) => (
                <View key={int} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{int}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Divider style={styles.divider} />

        {/* Settings Menu */}
        <Text style={styles.menuSectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Preferences', { profile: displayUser })}
        >
          <IconButton icon="tune" size={24} iconColor={COLORS.primary} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Preferences</Text>
            <Text style={styles.menuItemSubtitle}>Age range, distance, activities</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SafetyCenter')}
        >
          <IconButton icon="shield-check" size={24} iconColor={COLORS.success} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Safety Center</Text>
            <Text style={styles.menuItemSubtitle}>Tips, guidelines, emergency contacts</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('BlockedUsers')}
        >
          <IconButton icon="account-cancel" size={24} iconColor={COLORS.error} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Blocked Users</Text>
            <Text style={styles.menuItemSubtitle}>Manage blocked accounts</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CommunityGuidelines')}
        >
          <IconButton icon="file-document" size={24} iconColor={COLORS.secondary} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Community Guidelines</Text>
            <Text style={styles.menuItemSubtitle}>Our rules and expectations</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <IconButton icon="help-circle" size={24} iconColor={COLORS.primaryLight} />
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Help & Support</Text>
            <Text style={styles.menuItemSubtitle}>FAQs, contact us</Text>
          </View>
          <IconButton icon="chevron-right" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        <Divider style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconButton icon="logout" size={24} iconColor={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.versionText}>Doukhou v1.0.0</Text>

        <View style={{ height: SPACING.xxl * 2 }} />
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
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  // Profile Card
  profileCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
    marginBottom: SPACING.lg,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  ageText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: -SPACING.xs,
  },
  // Sections
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  bioText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  activityEmoji: {
    fontSize: 16,
  },
  activityChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  interestChip: {
    backgroundColor: COLORS.surfaceDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  interestChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Menu
  divider: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.border,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
    ...SHADOWS.small,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '10',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: -SPACING.sm,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.xl,
  },
});
