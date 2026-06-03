import React from "react";
import { StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { LegalSections } from "@/components/LegalSections";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import {
  LEGAL_APP_NAME,
  LEGAL_DEVELOPER_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ACCOUNT_DELETION_URL,
  LEGAL_PRIVACY_POLICY_URL,
  ACCOUNT_DELETION_SECTIONS,
} from "@shared/legal";

export default function AccountDeletionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const openDeletionEmail = () => {
    const subject = encodeURIComponent(`${LEGAL_APP_NAME} Account Deletion Request`);
    Linking.openURL(
      `mailto:${LEGAL_CONTACT_EMAIL}?subject=${subject}`,
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText type="h2" style={styles.title}>
        Account &amp; Data Deletion
      </ThemedText>
      <ThemedText style={styles.meta}>
        {LEGAL_APP_NAME} · {LEGAL_DEVELOPER_NAME}
      </ThemedText>
      <ThemedText style={styles.lastUpdated}>
        Last updated: {LEGAL_LAST_UPDATED}
      </ThemedText>

      <LegalSections
        sections={ACCOUNT_DELETION_SECTIONS}
        backgroundColor={theme.backgroundDefault}
      />

      <Button onPress={openDeletionEmail}>Email deletion request</Button>

      <Pressable
        style={styles.webLink}
        onPress={() => Linking.openURL(LEGAL_ACCOUNT_DELETION_URL)}
      >
        <ThemedText style={[styles.footerLink, { color: theme.link }]}>
          Open web deletion page
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => Linking.openURL(LEGAL_PRIVACY_POLICY_URL)}>
        <ThemedText style={[styles.footerLink, { color: theme.link }]}>
          Privacy Policy
        </ThemedText>
      </Pressable>
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
  meta: {
    opacity: 0.7,
    marginBottom: Spacing.xs,
  },
  lastUpdated: {
    opacity: 0.6,
    marginBottom: Spacing.xl,
  },
  webLink: {
    marginTop: Spacing.md,
  },
  footerLink: {
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: Spacing.sm,
  },
});
