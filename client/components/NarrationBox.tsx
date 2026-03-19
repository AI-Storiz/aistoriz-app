import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Spacing } from "@/constants/theme";

export type NarrationPosition = "top" | "bottom" | "top-full" | "bottom-full";

interface NarrationBoxProps {
  text: string;
  position: NarrationPosition;
  containerWidth: number;
  variant?: "story" | "caption" | "action";
}

const MAX_CHARS = 150;
const MIN_FONT_SIZE = 10;
const DEFAULT_FONT_SIZE = 12;

export function NarrationBox({
  text,
  position,
  containerWidth,
  variant = "story",
}: NarrationBoxProps) {
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText || safeText.trim().length === 0) return null;

  const trimmedText = safeText.trim();
  const needsShrink = trimmedText.length > MAX_CHARS;
  const fontSize = needsShrink
    ? Math.max(MIN_FONT_SIZE, DEFAULT_FONT_SIZE - Math.floor((trimmedText.length - MAX_CHARS) / 40))
    : DEFAULT_FONT_SIZE;

  const isFullWidth = position === "top-full" || position === "bottom-full";
  const boxWidth = isFullWidth ? containerWidth - 16 : Math.min(containerWidth - 24, 260);

  const positionStyles = getPositionStyles(position);
  const variantStyles = getVariantStyles(variant);

  return (
    <View style={[styles.box, positionStyles, variantStyles.container, { width: boxWidth }]}>
      <Text style={[styles.text, variantStyles.text, { fontSize }]} numberOfLines={4}>
        {trimmedText}
      </Text>
    </View>
  );
}

function getPositionStyles(position: NarrationPosition) {
  switch (position) {
    case "top":
      return { top: 8, left: 8 };
    case "bottom":
      return { bottom: 8, right: 8 };
    case "top-full":
      return { top: 0, left: 8, right: 8 };
    case "bottom-full":
      return { bottom: 0, left: 8, right: 8 };
    default:
      return { top: 8, left: 8 };
  }
}

function getVariantStyles(variant: "story" | "caption" | "action") {
  switch (variant) {
    case "story":
      return {
        container: styles.storyBox,
        text: styles.storyText,
      };
    case "caption":
      return {
        container: styles.captionBox,
        text: styles.captionText,
      };
    case "action":
      return {
        container: styles.actionBox,
        text: styles.actionText,
      };
    default:
      return {
        container: styles.storyBox,
        text: styles.storyText,
      };
  }
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    borderRadius: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    zIndex: 5,
  },
  storyBox: {
    backgroundColor: "#F5A623",
    borderWidth: 1,
    borderColor: "#D4890F",
  },
  captionBox: {
    backgroundColor: "#E8F4FD",
    borderWidth: 1,
    borderColor: "#B8D4E8",
  },
  actionBox: {
    backgroundColor: "#FFE5E5",
    borderWidth: 1,
    borderColor: "#FFB8B8",
  },
  text: {
    lineHeight: 16,
  },
  storyText: {
    fontFamily: "Nunito_600SemiBold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  captionText: {
    fontFamily: "Nunito_500Medium",
    fontStyle: "italic",
    color: "#2C5282",
  },
  actionText: {
    fontFamily: "Nunito_700Bold",
    color: "#C53030",
  },
});
