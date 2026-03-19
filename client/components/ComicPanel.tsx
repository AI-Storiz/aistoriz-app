import React from "react";
import { View, StyleSheet, ViewStyle, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ComicPanelProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  borderWidth?: number;
  variant?: "default" | "empty" | "highlight";
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

export function ComicPanel({
  children,
  title,
  subtitle,
  onPress,
  style,
  borderWidth = 3,
  variant = "default",
  testID,
}: ComicPanelProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case "empty":
        return theme.border;
      case "highlight":
        return theme.primary;
      default:
        return theme.text;
    }
  };

  const getBorderStyle = () => {
    if (variant === "empty") {
      return "dashed" as const;
    }
    return "solid" as const;
  };

  const content = (
    <>
      {title ? (
        <ThemedText type="h3" style={styles.title}>
          {title}
        </ThemedText>
      ) : null}
      {subtitle ? (
        <ThemedText type="small" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        style={[
          styles.panel,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: getBorderColor(),
            borderWidth,
            borderStyle: getBorderStyle(),
          },
          animatedStyle,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.panel,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: getBorderColor(),
          borderWidth,
          borderStyle: getBorderStyle(),
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.md,
  },
});
