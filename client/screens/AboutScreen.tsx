import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function AboutScreen() {
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
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="h1" style={styles.appName}>AI Storiz</ThemedText>
        <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>About Us</ThemedText>
        <ThemedText style={styles.paragraph}>
          AI Storiz is a revolutionary mobile app that transforms your story ideas into stunning visual comics using the power of artificial intelligence.
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Whether you're a storyteller, artist, or just someone with a creative imagination, AI Storiz makes it easy to bring your narratives to life with beautiful, AI-generated comic panels.
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>Features</ThemedText>
        <ThemedText style={styles.bulletPoint}>Create multi-page comic stories</ThemedText>
        <ThemedText style={styles.bulletPoint}>Choose from multiple art styles: Comic, Manga, Manhwa</ThemedText>
        <ThemedText style={styles.bulletPoint}>Build your character library</ThemedText>
        <ThemedText style={styles.bulletPoint}>AI-powered story generation</ThemedText>
        <ThemedText style={styles.bulletPoint}>Export as PDF, JPG, or ZIP</ThemedText>
        <ThemedText style={styles.bulletPoint}>Share directly to social media</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h3" style={styles.sectionTitle}>Contact Us</ThemedText>
        <ThemedText style={styles.paragraph}>
          Have questions, feedback, or need support? We'd love to hear from you!
        </ThemedText>
        <ThemedText style={styles.contactInfo}>Email: info@fiocreatives.com</ThemedText>
        <ThemedText style={styles.contactInfo}>Website: www.fiocreatives.com</ThemedText>
      </View>

      <ThemedText style={styles.copyright}>
        © 2026 AI Storiz. All rights reserved.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 170,
    height: 170,
    marginBottom: Spacing.sm,
  },
  appName: {
    marginBottom: Spacing.xs,
  },
  version: {
    opacity: 0.6,
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
  contactInfo: {
    lineHeight: 28,
  },
  copyright: {
    textAlign: "center",
    opacity: 0.5,
    marginTop: Spacing.lg,
  },
});
