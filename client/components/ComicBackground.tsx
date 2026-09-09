import React from "react";
import { View, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/useTheme";

interface ComicBackgroundProps {
  children: React.ReactNode;
  style?: object;
  intensity?: "low" | "medium" | "high";
}

export function ComicBackground({
  children,
  style,
}: ComicBackgroundProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
