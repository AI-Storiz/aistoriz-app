import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function PrivacyScreen() {
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
      <ThemedText type="h2" style={styles.title}>Privacy Policy</ThemedText>
      <ThemedText style={styles.lastUpdated}>Last updated: January 2026</ThemedText>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>1. Information We Collect</ThemedText>
        <ThemedText style={styles.paragraph}>
          We collect information you provide directly to us, including:
        </ThemedText>
        <ThemedText style={styles.bulletPoint}>Account information (email address, password)</ThemedText>
        <ThemedText style={styles.bulletPoint}>Character photos you upload for comic creation</ThemedText>
        <ThemedText style={styles.bulletPoint}>Story prompts and generated content</ThemedText>
        <ThemedText style={styles.bulletPoint}>Payment information for subscriptions</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>2. How We Use Your Information</ThemedText>
        <ThemedText style={styles.paragraph}>
          We use the information we collect to:
        </ThemedText>
        <ThemedText style={styles.bulletPoint}>Provide, maintain, and improve our services</ThemedText>
        <ThemedText style={styles.bulletPoint}>Process your comic generation requests</ThemedText>
        <ThemedText style={styles.bulletPoint}>Send you technical notices and support messages</ThemedText>
        <ThemedText style={styles.bulletPoint}>Respond to your comments and questions</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>3. Data Storage</ThemedText>
        <ThemedText style={styles.paragraph}>
          Your data is stored securely on our servers. Character images and generated comics are stored locally on your device and are not uploaded to our servers unless required for processing.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>4. Third-Party Services</ThemedText>
        <ThemedText style={styles.paragraph}>
          We use third-party AI services (OpenAI, Replicate) to generate comic images. Your prompts and character descriptions may be processed by these services according to their privacy policies.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>5. Your Rights</ThemedText>
        <ThemedText style={styles.paragraph}>
          You have the right to:
        </ThemedText>
        <ThemedText style={styles.bulletPoint}>Access your personal data</ThemedText>
        <ThemedText style={styles.bulletPoint}>Delete your account and associated data</ThemedText>
        <ThemedText style={styles.bulletPoint}>Export your comic history</ThemedText>
        <ThemedText style={styles.bulletPoint}>Opt out of promotional communications</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>6. Contact Us</ThemedText>
        <ThemedText style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at info@fiocreatives.com
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
