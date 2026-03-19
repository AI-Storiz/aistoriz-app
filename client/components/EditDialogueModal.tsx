import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";

interface PageScenes {
  description: string;
  dialogue: string;
}

interface EditDialogueModalProps {
  visible: boolean;
  onClose: () => void;
  pageNumber: number;
  scenes: PageScenes;
  onSave: (updatedScenes: PageScenes) => void;
}

export function EditDialogueModal({
  visible,
  onClose,
  pageNumber,
  scenes,
  onSave,
}: EditDialogueModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [dialogue, setDialogue] = useState(scenes.dialogue || "");
  const [description, setDescription] = useState(scenes.description || "");

  useEffect(() => {
    if (visible) {
      setDialogue(scenes.dialogue || "");
      setDescription(scenes.description || "");
    }
  }, [visible, scenes]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      dialogue: dialogue.trim(),
      description: description.trim(),
    });
    onClose();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <ThemedText type="h2" style={styles.title}>
              Edit Page {pageNumber}
            </ThemedText>
            <Pressable onPress={handleCancel} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <ThemedText type="h4" style={styles.label}>
                Speech Bubble
              </ThemedText>
              <ThemedText
                type="small"
                style={[styles.hint, { color: theme.textSecondary }]}
              >
                Character dialogue shown in speech bubbles
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.dialogueInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={dialogue}
                onChangeText={setDialogue}
                placeholder="Enter dialogue..."
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={200}
                textAlignVertical="top"
                testID="input-edit-dialogue"
              />
              <ThemedText
                type="small"
                style={[styles.charCount, { color: theme.textSecondary }]}
              >
                {dialogue.length}/200
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="h4" style={styles.label}>
                Narration Box
              </ThemedText>
              <ThemedText
                type="small"
                style={[styles.hint, { color: theme.textSecondary }]}
              >
                Scene description shown in a caption box
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.narrationInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter narration..."
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={150}
                textAlignVertical="top"
                testID="input-edit-narration"
              />
              <ThemedText
                type="small"
                style={[styles.charCount, { color: theme.textSecondary }]}
              >
                {description.length}/150
              </ThemedText>
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              onPress={handleCancel}
              style={styles.button}
              testID="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onPress={handleSave}
              style={styles.button}
              testID="button-save-edit"
            >
              Save Changes
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  hint: {
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  dialogueInput: {
    minHeight: 100,
  },
  narrationInput: {
    minHeight: 80,
  },
  charCount: {
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
