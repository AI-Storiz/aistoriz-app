import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import {
  ComicPage,
  exportToPDF,
  exportToJPG,
  downloadToDevice,
  sharePDF,
  getExportDirectory,
} from "@/lib/exportService";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  pages: ComicPage[];
  title?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type ExportAction = "pdf" | "jpg" | "download" | "share-pdf";

interface ExportOption {
  id: ExportAction;
  icon: string;
  title: string;
  subtitle: string;
  webSupported: boolean;
}

const exportOptions: ExportOption[] = [
  {
    id: "pdf",
    icon: "file-text",
    title: "Export as PDF",
    subtitle: "Multi-page PDF document with speech bubbles",
    webSupported: false,
  },
  {
    id: "jpg",
    icon: "image",
    title: "Export as JPG",
    subtitle: "Individual page images",
    webSupported: true,
  },
  {
    id: "download",
    icon: "download",
    title: "Save to Photos",
    subtitle: "Save to device gallery",
    webSupported: true,
  },
  {
    id: "share-pdf",
    icon: "share",
    title: "Share PDF",
    subtitle: "Share as PDF file",
    webSupported: false,
  },
];

export function ExportModal({
  visible,
  onClose,
  pages,
  title = "My Comic",
  onSuccess,
  onError,
}: ExportModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [loading, setLoading] = useState<ExportAction | null>(null);

  const handleExport = async (action: ExportAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(action);

    try {
      let result;
      switch (action) {
        case "pdf":
          result = await exportToPDF(pages, title);
          break;
        case "jpg":
          result = await exportToJPG(pages, title);
          break;
        case "download":
          result = await downloadToDevice(pages, title);
          break;
        case "share-pdf":
          result = await sharePDF(pages, title);
          break;
        default:
          result = { success: false, message: "Unknown action" };
      }

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        let successMessage = result.message;
        if (result.filePath && Platform.OS !== "web") {
          successMessage += `\n\nSaved to: ${result.filePath}`;
        }
        onSuccess(successMessage);
        onClose();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        onError(result.message);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onError(error.message || "Export failed");
    } finally {
      setLoading(null);
    }
  };

  const filteredOptions = exportOptions.filter(
    (option) => Platform.OS !== "web" || option.webSupported
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <ThemedText type="h3">Export Comic</ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {pages.length} page{pages.length !== 1 ? "s" : ""} ready to export
          </ThemedText>

          <View style={styles.options}>
            {filteredOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleExport(option.id)}
                disabled={loading !== null}
                style={({ pressed }) => [
                  styles.optionItem,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSecondary
                      : theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: theme.primaryLight },
                  ]}
                >
                  {loading === option.id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Feather
                      name={option.icon as any}
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </View>
                <View style={styles.optionText}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {option.title}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    {option.subtitle}
                  </ThemedText>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          {Platform.OS !== "web" ? (
            <ThemedText
              type="small"
              style={[styles.pathInfo, { color: theme.textSecondary }]}
            >
              Files saved to: {getExportDirectory()}
            </ThemedText>
          ) : null}

          <Button
            variant="outline"
            onPress={onClose}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
  pathInfo: {
    marginTop: Spacing.lg,
    textAlign: "center",
    fontSize: 11,
  },
  cancelButton: {
    marginTop: Spacing.lg,
  },
});
