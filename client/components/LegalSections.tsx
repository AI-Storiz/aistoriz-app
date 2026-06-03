import React from "react";
import { View, StyleSheet } from "react-native";
import { Linking } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { LegalSection } from "@shared/legal";

type Props = {
  sections: LegalSection[];
  backgroundColor: string;
};

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

function renderParagraph(text: string, key: string) {
  const parts = text.split(URL_PATTERN);
  return (
    <ThemedText key={key} style={styles.paragraph}>
      {parts.map((part, index) => {
        if (part.startsWith("http://") || part.startsWith("https://")) {
          return (
            <ThemedText
              key={`${key}-link-${index}`}
              style={styles.link}
              onPress={() => Linking.openURL(part)}
            >
              {part}
            </ThemedText>
          );
        }
        return part;
      })}
    </ThemedText>
  );
}

export function LegalSections({ sections, backgroundColor }: Props) {
  return (
    <>
      {sections.map((section) => (
        <View
          key={section.title}
          style={[styles.section, { backgroundColor }]}
        >
          <ThemedText type="h3" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          {section.paragraphs.map((paragraph, index) =>
            renderParagraph(paragraph, `${section.title}-p-${index}`),
          )}
          {section.bullets?.map((bullet) => (
            <ThemedText key={bullet} style={styles.bulletPoint}>
              • {bullet}
            </ThemedText>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: Spacing.xs,
  },
  link: {
    textDecorationLine: "underline",
  },
});
