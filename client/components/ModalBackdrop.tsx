import React, { ReactNode } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

interface ModalBackdropProps {
  onDismiss: () => void;
  children: ReactNode;
  overlayStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Separates the dismiss backdrop from modal content so inner buttons receive
 * touches reliably on Android (nested Pressables swallow child taps).
 */
export function ModalBackdrop({
  onDismiss,
  children,
  overlayStyle,
  contentStyle,
}: ModalBackdropProps) {
  return (
    <View style={[styles.overlay, overlayStyle]}>
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
      />
      <View
        style={[styles.content, contentStyle]}
        onStartShouldSetResponder={() => true}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  content: {
    width: "100%",
    zIndex: 1,
  },
});
