import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type SFXStyle = "impact" | "action" | "subtle";

interface SoundEffectProps {
  text: string;
  style?: SFXStyle;
  position?: { top?: number; bottom?: number; left?: number; right?: number };
  rotation?: number;
  size?: "small" | "medium" | "large";
}

export function SoundEffect({
  text,
  style = "impact",
  position = { top: 20, left: 20 },
  rotation = 0,
  size = "medium",
}: SoundEffectProps) {
  if (!text || text.trim().length === 0) return null;

  const sizeStyles = getSizeStyles(size);
  const styleConfig = getStyleConfig(style);

  return (
    <View style={[
      styles.container, 
      position,
      { transform: [{ rotate: `${rotation}deg` }] }
    ]}>
      <Text style={[
        styles.text,
        sizeStyles,
        styleConfig,
      ]}>
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

function getSizeStyles(size: "small" | "medium" | "large") {
  switch (size) {
    case "small":
      return { fontSize: 18 };
    case "medium":
      return { fontSize: 28 };
    case "large":
      return { fontSize: 42 };
    default:
      return { fontSize: 28 };
  }
}

function getStyleConfig(style: SFXStyle) {
  switch (style) {
    case "impact":
      return {
        color: "#FF4444",
        textShadowColor: "#000000",
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
      };
    case "action":
      return {
        color: "#FFD700",
        textShadowColor: "#000000",
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 0,
      };
    case "subtle":
      return {
        color: "#4A90D9",
        textShadowColor: "#000000",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 0,
      };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 15,
  },
  text: {
    fontFamily: "Nunito_900Black",
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
