import React, { useEffect } from "react";
import { Text, Pressable, StyleSheet, Linking } from "react-native";
import { useAds } from "@/contexts/AdsContext";
import { Colors, Spacing } from "@/constants/theme";

export default function FooterTextAd() {
  const { textAd, isLoading, recordImpression } = useAds();

  useEffect(() => {
    if (textAd) {
      recordImpression(textAd.id);
    }
  }, [textAd, recordImpression]);

  if (isLoading || !textAd) {
    return null;
  }

  const handlePress = () => {
    if (textAd.linkUrl) {
      Linking.openURL(textAd.linkUrl);
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      disabled={!textAd.linkUrl}
    >
      <Text style={styles.label}>Sponsored</Text>
      <Text style={styles.content} numberOfLines={2}>
        {textAd.content}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundDefault,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 12,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
    fontFamily: "Nunito_400Regular",
  },
});
