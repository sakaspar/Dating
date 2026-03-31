/**
 * Safety Center Screen
 *
 * - Safety tips for meeting people
 * - Community guidelines link
 * - Emergency contacts for Tunisia
 * - Red flags to watch for
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, IconButton, Button, Divider } from 'react-native-paper';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const SAFETY_TIPS = [
  {
    icon: 'map-marker',
    color: COLORS.primary,
    title: 'Meet in Public',
    description: 'Always meet for the first time in a public place like a café, restaurant, or park. Never go to someone\'s home on a first date.',
  },
  {
    icon: 'account-group',
    color: COLORS.success,
    title: 'Tell a Friend',
    description: 'Let someone you trust know where you\'re going, who you\'re meeting, and when you expect to be back.',
  },
  {
    icon: 'car',
    color: COLORS.secondary,
    title: 'Arrange Your Own Transport',
    description: 'Use your own transportation to and from the date. Don\'t rely on your date for a ride.',
  },
  {
    icon: 'phone',
    color: COLORS.warning,
    title: 'Keep Your Phone Charged',
    description: 'Make sure your phone is fully charged before going on a date. Keep it accessible.',
  },
  {
    icon: 'beer-off',
    color: COLORS.error,
    title: 'Watch Your Drinks',
    description: 'Never leave your drink unattended. If you need to leave, get a new one when you return.',
  },
  {
    icon: 'shield-alert',
    color: COLORS.error,
    title: 'Trust Your Instincts',
    description: 'If something feels wrong, it probably is. Don\'t hesitate to leave if you feel uncomfortable.',
  },
  {
    icon: 'cash',
    color: COLORS.warning,
    title: 'Never Send Money',
    description: 'Never send money to someone you haven\'t met in person, no matter the reason.',
  },
  {
    icon: 'clock',
    color: COLORS.primaryLight,
    title: 'Take Your Time',
    description: 'There\'s no rush to meet. Take time to get to know someone through chat before meeting in person.',
  },
];

const RED_FLAGS = [
  'Asks for money or financial help',
  'Refuses to video chat or meet in public',
  'Pushes to move off the app quickly',
  'Asks overly personal questions too soon',
  'Profile seems too good to be true',
  'Pressures you into uncomfortable situations',
  'Gets angry or aggressive when you set boundaries',
  'Claims to be overseas or unable to meet',
];

const EMERGENCY_CONTACTS = [
  { name: 'Police', number: '197', icon: 'police-badge' },
  { name: 'Emergency (Ambulance)', number: '190', icon: 'ambulance' },
  { name: 'Fire Department', number: '198', icon: 'fire-truck' },
  { name: 'National Guard', number: '193', icon: 'shield' },
];

export default function SafetyCenterScreen({ navigation }) {
  const callNumber = (number) => {
    Linking.openURL(`tel:${number}`);
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
        <Text style={styles.headerTitle}>Safety Center 🛡️</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>🛡️</Text>
          <Text style={styles.introTitle}>Your Safety Matters</Text>
          <Text style={styles.introText}>
            At Doukhou, your safety is our top priority. Follow these guidelines to have a safe and enjoyable experience.
          </Text>
        </View>

        {/* Safety Tips */}
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        {SAFETY_TIPS.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <View style={[styles.tipIconBg, { backgroundColor: tip.color + '15' }]}>
              <IconButton icon={tip.icon} size={24} iconColor={tip.color} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          </View>
        ))}

        <Divider style={styles.divider} />

        {/* Red Flags */}
        <Text style={styles.sectionTitle}>🚩 Red Flags to Watch For</Text>
        <View style={styles.redFlagsCard}>
          {RED_FLAGS.map((flag, index) => (
            <View key={index} style={styles.redFlagItem}>
              <Text style={styles.redFlagBullet}>⚠️</Text>
              <Text style={styles.redFlagText}>{flag}</Text>
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>📞 Emergency Contacts (Tunisia)</Text>
        <View style={styles.emergencyCard}>
          {EMERGENCY_CONTACTS.map((contact, index) => (
            <Button
              key={index}
              mode="outlined"
              onPress={() => callNumber(contact.number)}
              style={styles.emergencyButton}
              contentStyle={styles.emergencyButtonContent}
              icon={contact.icon}
              textColor={COLORS.textPrimary}
            >
              {contact.name}: {contact.number}
            </Button>
          ))}
        </View>

        {/* Report a Problem */}
        <View style={styles.reportCard}>
          <IconButton icon="flag" size={32} iconColor={COLORS.error} />
          <Text style={styles.reportTitle}>See Something Wrong?</Text>
          <Text style={styles.reportText}>
            If someone is making you uncomfortable or violating our community guidelines, report them immediately.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.reportButton}
            buttonColor={COLORS.error}
            icon="flag"
          >
            Report a User
          </Button>
        </View>

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
  // Intro
  introCard: {
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  introEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  introText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Tips
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  tipIconBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  tipDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Red Flags
  redFlagsCard: {
    backgroundColor: COLORS.error + '08',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  redFlagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  redFlagBullet: {
    fontSize: 14,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  redFlagText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  // Emergency
  emergencyCard: {
    gap: SPACING.sm,
  },
  emergencyButton: {
    borderRadius: RADIUS.lg,
    borderColor: COLORS.border,
  },
  emergencyButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  // Report
  reportCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    ...SHADOWS.medium,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  reportText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  reportButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.lg,
  },
  divider: {
    marginVertical: SPACING.xl,
    backgroundColor: COLORS.border,
  },
});
