import React from "react";
import { StyleSheet, Pressable, View, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface CharacterCardProps {
  name?: string;
  imageUri?: string | null;
  isAddButton?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
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

export function CharacterCard({
  name,
  imageUri,
  isAddButton,
  onPress,
  onDelete,
  testID,
}: CharacterCardProps) {
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
    onPress?.();
  };

  if (isAddButton) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        style={[
          styles.card,
          styles.addCard,
          {
            borderColor: theme.primary,
            backgroundColor: theme.backgroundDefault,
          },
          animatedStyle,
        ]}
      >
        <View style={[styles.addIconContainer, { backgroundColor: theme.primary }]}>
          <Feather name="plus" size={24} color="#FFF" />
        </View>
        <ThemedText type="caption" style={{ color: theme.primary, marginTop: Spacing.sm }}>
          Add
        </ThemedText>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={testID}
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundDefault,
        },
        Shadows.card,
        animatedStyle,
      ]}
    >
      {onDelete ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={[styles.deleteButton, { backgroundColor: theme.error }]}
        >
          <Feather name="x" size={12} color="#FFF" />
        </Pressable>
      ) : null}
      <View style={[styles.avatarContainer, { backgroundColor: theme.backgroundSecondary }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <Image
            source={require("../../assets/images/default-avatar.png")}
            style={styles.avatar}
            resizeMode="cover"
          />
        )}
      </View>
      <ThemedText type="caption" numberOfLines={1} style={styles.name}>
        {name}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 90,
    height: 110,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  addCard: {
    borderStyle: "dashed",
  },
  addIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  name: {
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
