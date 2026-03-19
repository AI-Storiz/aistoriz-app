import React from "react";
import { StyleSheet, Pressable, View, Image, ImageSourcePropType } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface StyleCardProps {
  name: string;
  image: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
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

export function StyleCard({ name, image, selected, onPress, testID }: StyleCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
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
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: theme.backgroundDefault,
        },
        animatedStyle,
      ]}
    >
      {selected ? (
        <View style={[styles.checkmark, { backgroundColor: theme.primary }]}>
          <ThemedText style={{ color: "#FFF", fontSize: 10 }}>✓</ThemedText>
        </View>
      ) : null}
      <View style={[styles.imageContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Image source={image} style={styles.image} resizeMode="cover" />
      </View>
      <ThemedText
        type="h4"
        style={[styles.name, { color: selected ? theme.primary : theme.text }]}
      >
        {name}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginHorizontal: Spacing.xs,
  },
  imageContainer: {
    aspectRatio: 1,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  name: {
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
