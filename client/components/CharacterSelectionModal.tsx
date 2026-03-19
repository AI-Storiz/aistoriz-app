import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";

interface Character {
  id: string;
  name: string;
  type: string;
  imageUri?: string;
  description?: string;
}

interface CharacterSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  characters: Character[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onAddNew: () => void;
  onDeleteCharacter: (id: string) => void;
}

export function CharacterSelectionModal({
  visible,
  onClose,
  characters,
  selectedIds,
  onSelectionChange,
  onAddNew,
  onDeleteCharacter,
}: CharacterSelectionModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedIds);
    }
  }, [visible, selectedIds]);

  const toggleCharacter = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectionChange(localSelected);
    onClose();
  };

  const handleSelectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSelected(characters.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSelected([]);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeleteCharacter(id);
    setLocalSelected((prev) => prev.filter((cid) => cid !== id));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
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
            <ThemedText type="h3">Character Library</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Select characters to include in your story
          </ThemedText>

          {characters.length > 0 ? (
            <View style={styles.selectActions}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
                {characters.length} character{characters.length !== 1 ? 's' : ''}
              </ThemedText>
              <Pressable
                onPress={handleSelectAll}
                style={[styles.selectButton, { borderColor: theme.border }]}
              >
                <ThemedText type="small" style={{ color: theme.primary }}>
                  Select All
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleDeselectAll}
                style={[styles.selectButton, { borderColor: theme.border }]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Deselect All
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {characters.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={theme.placeholder} />
                <ThemedText
                  type="body"
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No characters yet
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, textAlign: "center" }}
                >
                  Create characters to reuse them across all your stories
                </ThemedText>
              </View>
            ) : (
              <View style={styles.characterGrid}>
                {characters.map((character) => {
                  const isSelected = localSelected.includes(character.id);
                  return (
                    <Pressable
                      key={character.id}
                      style={[
                        styles.characterCard,
                        {
                          backgroundColor: isSelected
                            ? theme.primaryLight
                            : theme.backgroundSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => toggleCharacter(character.id)}
                      testID={`character-select-${character.id}`}
                    >
                      <Pressable
                        style={[styles.deleteButton, { backgroundColor: theme.error }]}
                        onPress={() => handleDelete(character.id)}
                        hitSlop={8}
                      >
                        <Feather name="x" size={12} color="#fff" />
                      </Pressable>

                      {isSelected ? (
                        <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                          <Feather name="check" size={14} color="#fff" />
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.characterImage,
                          { backgroundColor: theme.backgroundRoot },
                        ]}
                      >
                        {character.imageUri ? (
                          <Image
                            source={{ uri: character.imageUri }}
                            style={styles.image}
                          />
                        ) : (
                          <Feather name="user" size={32} color={theme.placeholder} />
                        )}
                      </View>

                      <ThemedText
                        type="small"
                        style={styles.characterName}
                        numberOfLines={1}
                      >
                        {character.name}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                        numberOfLines={1}
                      >
                        {character.type}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              onPress={onAddNew}
              style={styles.button}
              testID="button-add-new-character"
            >
              Add New
            </Button>
            <Button
              onPress={handleConfirm}
              style={styles.button}
              testID="button-confirm-selection"
            >
              {localSelected.length > 0
                ? `Use ${localSelected.length} Character${localSelected.length > 1 ? "s" : ""}`
                : "Continue Without"}
            </Button>
          </View>
        </View>
      </View>
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
    paddingTop: Spacing.md,
    maxHeight: "90%",
    minHeight: "50%",
    flex: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    paddingHorizontal: Spacing.lg,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  selectActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  selectButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    minHeight: 100,
  },
  characterCard: {
    width: "47%",
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    position: "relative",
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  characterImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  characterName: {
    fontWeight: "600",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  button: {
    flex: 1,
  },
});
