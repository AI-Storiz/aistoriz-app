import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText type="h2" style={styles.title}>Terms of Service</ThemedText>
      <ThemedText style={styles.lastUpdated}>Last updated: January 2026</ThemedText>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>1. Acceptance of Terms</ThemedText>
        <ThemedText style={styles.paragraph}>
          By accessing or using AI Storiz, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>2. Description of Service</ThemedText>
        <ThemedText style={styles.paragraph}>
          AI Storiz provides an AI-powered comic creation platform that allows users to generate visual stories from text prompts and character images.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>3. User Accounts</ThemedText>
        <ThemedText style={styles.paragraph}>
          You must create an account to use our service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>4. Credits and Subscriptions</ThemedText>
        <ThemedText style={styles.paragraph}>
          Comic generation requires credits. Credits can be obtained through:
        </ThemedText>
        <ThemedText style={styles.bulletPoint}>Free credits upon registration (50 credits)</ThemedText>
        <ThemedText style={styles.bulletPoint}>Watching rewarded video ads (25 credits per ad, max 5/day)</ThemedText>
        <ThemedText style={styles.bulletPoint}>Purchasing subscription plans</ThemedText>
        <ThemedText style={[styles.paragraph, { marginTop: Spacing.sm }]}>
          Subscription fees are non-refundable except as required by law.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>5. Acceptable Use</ThemedText>
        <ThemedText style={styles.paragraph}>
          You agree not to use AI Storiz to:
        </ThemedText>
        <ThemedText style={styles.bulletPoint}>Generate illegal, harmful, or offensive content</ThemedText>
        <ThemedText style={styles.bulletPoint}>Violate any intellectual property rights</ThemedText>
        <ThemedText style={styles.bulletPoint}>Upload images without proper consent</ThemedText>
        <ThemedText style={styles.bulletPoint}>Attempt to bypass credit requirements</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>6. Content Ownership</ThemedText>
        <ThemedText style={styles.paragraph}>
          You retain ownership of the content you create using AI Storiz. However, you grant us a license to use your content for improving our services and for promotional purposes.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>7. Limitation of Liability</ThemedText>
        <ThemedText style={styles.paragraph}>
          AI Storiz is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>8. Changes to Terms</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>9. Contact</ThemedText>
        <ThemedText style={styles.paragraph}>
          For questions about these Terms, contact us at info@aidynamiz.com
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  lastUpdated: {
    opacity: 0.6,
    marginBottom: Spacing.xl,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  bulletPoint: {
    lineHeight: 28,
    paddingLeft: Spacing.md,
  },
});
