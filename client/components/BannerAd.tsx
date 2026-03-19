import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useAds } from "@/contexts/AdsContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BANNER_HEIGHT = SCREEN_HEIGHT * 0.15;

export default function BannerAd() {
  const { bannerAd, isLoading, recordImpression } = useAds();

  useEffect(() => {
    if (bannerAd) {
      recordImpression(bannerAd.id);
    }
  }, [bannerAd, recordImpression]);

  if (isLoading || !bannerAd) {
    return null;
  }

  const handlePress = () => {
    if (bannerAd.linkUrl) {
      Linking.openURL(bannerAd.linkUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sponsored</Text>
      <Pressable
        style={styles.bannerContainer}
        onPress={handlePress}
        disabled={!bannerAd.linkUrl}
      >
        {bannerAd.imageUrl ? (
          <Image
            source={{ uri: bannerAd.imageUrl }}
            style={styles.bannerImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.placeholderBanner}>
            <Text style={styles.placeholderText}>{bannerAd.title}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bannerContainer: {
    width: "100%",
    height: BANNER_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: Colors.light.backgroundDefault,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundDefault,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
    fontFamily: "Nunito_400Regular",
  },
});
