import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { authedComicImageSource } from "@/lib/comicImageSource";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface ComicCardProps {
  title: string;
  imageUrl?: string;
  date?: string;
  onPress?: () => void;
  style?: any;
  testID?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ComicCardInner({ title, imageUrl, date, onPress, style, testID }: ComicCardProps) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const scale = useSharedValue(1);
  const thumbSource = imageUrl?.trim()
    ? authedComicImageSource(imageUrl, token)
    : null;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        Shadows.card,
        style,
        animatedStyle,
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: theme.backgroundSecondary }]}>
        {thumbSource ? (
          <Image
            source={thumbSource}
            recyclingKey={imageUrl ?? ""}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
            transition={0}
          />
        ) : (
          <Image
            source={require("../../assets/images/style-comic.png")}
            style={styles.image}
            contentFit="cover"
          />
        )}
      </View>
      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={2} style={styles.title}>
          {title}
        </ThemedText>
        {date ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {date}
          </ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export const ComicCard = React.memo(ComicCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
});
