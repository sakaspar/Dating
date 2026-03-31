/**
 * Community Guidelines Screen
 *
 * - Rules and expectations
 * - What's allowed/not allowed
 * - Reporting info
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const GUIDELINES = [
  {
    icon: 'heart',
    color: COLORS.secondary,
    title: 'Be Respectful',
    items: [
      'Treat everyone with kindness and respect',
      'No hate speech, discrimination, or harassment',
      'Respect boundaries — if someone says no, accept it gracefully',
      'Use appropriate language in all conversations',
    ],
  },
  {
    icon: 'account',
    color: COLORS.primary,
    title: 'Be Authentic',
    items: [
      'Use real photos of yourself (recent and accurate)',
      'Don\'t create fake profiles or impersonate others',
      'Be honest about your intentions and who you are',
      'One account per person',
    ],
  },
  {
    icon: 'shield-check',
    color: COLORS.success,
    title: 'Stay Safe',
    items: [
      'First meetings should always be in public places',
      'Don\'t share personal financial information',
      'Report suspicious behavior immediately',
      'Trust your instincts — if something feels off, leave',
    ],
  },
  {
    icon: 'hand-right',
    color: COLORS.warning,
    title: 'Don\'t Cross the Line',
    items: [
      'No unsolicited explicit content',
      'No spam, solicitation, or commercial activity',
      'No stalking or following someone who\'s not interested',
      'No sharing other users\' private information',
    ],
  },
  {
    icon: 'account-group',
    color: COLORS.coffee,
    title: 'Group Activities',
    items: [
      'Group events should be welcoming and inclusive',
      'The group organizer is responsible for maintaining a safe space',
      'Don\'t pressure anyone to attend or stay',
      'Keep group chats relevant to the activity',
    ],
  },
  {
    icon: 'alert',
    color: COLORS.error,
    title: 'Consequences',
    items: [
      'Warning for minor violations',
      'Temporary suspension for repeated violations',
      'Permanent ban for serious offenses (harassment, fake profiles, scams)',
      'Illegal activity will be reported to authorities',
    ],
  },
];

export default function CommunityGuidelinesScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>📋</Text>
          <Text style={styles.introTitle}>Our Community Promise</Text>
          <Text style={styles.introText}>
            Doukhou is a safe space for meaningful connections. These guidelines help us keep it that way. By using Doukhou, you agree to follow these rules.
          </Text>
        </View>

        {/* Guidelines */}
        {GUIDELINES.map((section, index) => (
          <View key={index} style={styles.guidelineCard}>
            <View style={styles.guidelineHeader}>
              <View style={[styles.guidelineIconBg, { backgroundColor: section.color + '15' }]}>
                <IconButton icon={section.icon} size={24} iconColor={section.color} />
              </View>
              <Text style={styles.guidelineTitle}>{section.title}</Text>
            </View>
            {section.items.map((item, i) => (
              <View key={i} style={styles.guidelineItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.guidelineItemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            These guidelines are subject to change. We'll notify you of any significant updates.
          </Text>
          <Text style={styles.footerDate}>Last updated: March 2026</Text>
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
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
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
  // Guidelines
  guidelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  guidelineIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  bulletDot: {
    fontSize: 16,
    color: COLORS.textLight,
    marginRight: SPACING.sm,
    marginTop: -1,
  },
  guidelineItemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.lg,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
});
