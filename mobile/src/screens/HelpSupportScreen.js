/**
 * Help & Support Screen
 *
 * - FAQs
 * - Contact support
 * - About Doukhou
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const FAQS = [
  {
    q: 'How does matching work?',
    a: 'We match you based on shared activities, interests, location, and preferences. Our algorithm prioritizes people who enjoy the same things you do.',
  },
  {
    q: 'How do date proposals work?',
    a: 'Once you match with someone, you can suggest a plan — pick an activity, date, time, and place. They can accept, decline, or suggest changes.',
  },
  {
    q: 'What are group activities?',
    a: 'Group activities let you organize or join group outings (coffee, hikes, events). It\'s a safer, more casual way to meet new people.',
  },
  {
    q: 'How do I report someone?',
    a: 'Go to their profile or chat, tap the three dots menu, and select "Report". Choose a reason and add details if needed.',
  },
  {
    q: 'Can I block someone?',
    a: 'Yes! You can block users from their profile or chat. Blocked users can\'t see your profile or message you. You can unblock them from Settings > Blocked Users.',
  },
  {
    q: 'Is my data safe?',
    a: 'We take your privacy seriously. Your data is stored securely and never shared with third parties. See our Privacy Policy for details.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings > Account > Delete Account. This action is permanent and cannot be undone.',
  },
];

export default function HelpSupportScreen({ navigation }) {
  const contactSupport = () => {
    Linking.openURL('mailto:support@doukhou.com?subject=Doukhou%20Support%20Request');
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{faq.q}</Text>
            <Text style={styles.faqAnswer}>{faq.a}</Text>
          </View>
        ))}

        <Divider style={styles.divider} />

        {/* Contact */}
        <Text style={styles.sectionTitle}>Need More Help?</Text>
        <TouchableOpacity style={styles.contactCard} onPress={contactSupport}>
          <IconButton icon="email" size={28} iconColor={COLORS.primary} />
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactSubtitle}>support@doukhou.com</Text>
          </View>
          <IconButton icon="open-in-new" size={20} iconColor={COLORS.textLight} />
        </TouchableOpacity>

        {/* About */}
        <Divider style={styles.divider} />
        <View style={styles.aboutCard}>
          <Text style={styles.aboutEmoji}>💕</Text>
          <Text style={styles.aboutTitle}>About Doukhou</Text>
          <Text style={styles.aboutText}>
            Doukhou is an activity-based dating app designed for the Tunisian market. 
            We believe the best connections happen when people share experiences together — 
            whether it's a coffee, a hike, or a night out.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutCopyright}>© 2026 Doukhou. Made with ❤️ in Tunisia</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  // FAQ
  faqCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Contact
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  contactSubtitle: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  // About
  aboutCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  aboutEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  aboutVersion: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  aboutCopyright: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  divider: {
    marginVertical: SPACING.xl,
    backgroundColor: COLORS.border,
  },
});
