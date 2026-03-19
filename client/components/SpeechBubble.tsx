import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Spacing } from "@/constants/theme";

export type BubblePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type BubbleType = "speech" | "thought" | "shout";

interface SpeechBubbleProps {
  text: string;
  position: BubblePosition;
  type?: BubbleType;
  maxWidth?: number;
  containerWidth: number;
  containerHeight: number;
  speakerName?: string;
}

const MAX_CHARS_SINGLE = 120;
const MIN_FONT_SIZE = 11;
const DEFAULT_FONT_SIZE = 14;

export function SpeechBubble({
  text,
  position,
  type = "speech",
  maxWidth = 180,
  containerWidth,
  containerHeight,
  speakerName,
}: SpeechBubbleProps) {
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText || safeText.trim().length === 0) return null;

  const trimmedText = safeText.trim();
  const needsShrink = trimmedText.length > MAX_CHARS_SINGLE;
  const fontSize = needsShrink 
    ? Math.max(MIN_FONT_SIZE, DEFAULT_FONT_SIZE - Math.floor((trimmedText.length - MAX_CHARS_SINGLE) / 30))
    : DEFAULT_FONT_SIZE;

  const safeMargin = 12;
  const positionStyles = getPositionStyles(position, safeMargin, containerWidth, containerHeight, maxWidth);

  const isThought = type === "thought";
  const isShout = type === "shout";

  return (
    <View style={[
      styles.bubble, 
      positionStyles, 
      { maxWidth },
      isThought && styles.thoughtBubble,
      isShout && styles.shoutBubble,
    ]}>
      {speakerName ? (
        <Text style={styles.speakerName}>{speakerName}</Text>
      ) : null}
      <Text style={[
        styles.text, 
        { fontSize },
        isShout && styles.shoutText,
      ]} numberOfLines={6}>
        {trimmedText}
      </Text>
      {isThought ? (
        <>
          <View style={[styles.thoughtDot, getThoughtDotPosition(position, 1)]} />
          <View style={[styles.thoughtDotSmall, getThoughtDotPosition(position, 2)]} />
        </>
      ) : null}
    </View>
  );
}

function getPositionStyles(
  position: BubblePosition,
  margin: number,
  containerWidth: number,
  containerHeight: number,
  maxWidth: number
) {
  const horizontalOffset = margin;
  const topOffset = margin + 8;
  const bottomOffset = containerHeight * 0.35;

  switch (position) {
    case "top-left":
      return { top: topOffset, left: horizontalOffset };
    case "top-right":
      return { top: topOffset, right: horizontalOffset };
    case "bottom-left":
      return { bottom: bottomOffset, left: horizontalOffset };
    case "bottom-right":
      return { bottom: bottomOffset, right: horizontalOffset };
    default:
      return { top: topOffset, left: horizontalOffset };
  }
}

function getTailStyles(position: BubblePosition, isThought: boolean) {
  if (isThought) {
    return {};
  }

  const baseStyles = {
    position: "absolute" as const,
    width: 0,
    height: 0,
    borderStyle: "solid" as const,
  };

  switch (position) {
    case "top-left":
      return {
        ...baseStyles,
        bottom: -12,
        left: 18,
        borderLeftWidth: 6,
        borderRightWidth: 10,
        borderTopWidth: 14,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#FFFFFF",
      };
    case "top-right":
      return {
        ...baseStyles,
        bottom: -12,
        right: 18,
        borderLeftWidth: 10,
        borderRightWidth: 6,
        borderTopWidth: 14,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#FFFFFF",
      };
    case "bottom-left":
      return {
        ...baseStyles,
        top: -12,
        left: 18,
        borderLeftWidth: 6,
        borderRightWidth: 10,
        borderBottomWidth: 14,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#FFFFFF",
      };
    case "bottom-right":
      return {
        ...baseStyles,
        top: -12,
        right: 18,
        borderLeftWidth: 10,
        borderRightWidth: 6,
        borderBottomWidth: 14,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#FFFFFF",
      };
    default:
      return baseStyles;
  }
}

function getThoughtDotPosition(position: BubblePosition, dotIndex: number) {
  const offset1 = dotIndex === 1 ? 0 : 8;
  const offset2 = dotIndex === 1 ? 12 : 20;
  
  switch (position) {
    case "top-left":
    case "top-right":
      return { bottom: -offset2, left: position === "top-left" ? 20 + offset1 : undefined, right: position === "top-right" ? 20 + offset1 : undefined };
    case "bottom-left":
    case "bottom-right":
      return { top: -offset2, left: position === "bottom-left" ? 20 + offset1 : undefined, right: position === "bottom-right" ? 20 + offset1 : undefined };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#000000",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  thoughtBubble: {
    borderRadius: 20,
    borderStyle: "solid",
  },
  shoutBubble: {
    backgroundColor: "#FFFACD",
    borderWidth: 3,
  },
  speakerName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  text: {
    fontFamily: "Nunito_600SemiBold",
    color: "#000000",
    textAlign: "left",
    lineHeight: 18,
  },
  shoutText: {
    fontFamily: "Nunito_800ExtraBold",
    textTransform: "uppercase",
  },
  tail: {
    position: "absolute",
  },
  tailBorder: {
    position: "absolute",
  },
  thoughtDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
  },
  thoughtDotSmall: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#000000",
  },
});
