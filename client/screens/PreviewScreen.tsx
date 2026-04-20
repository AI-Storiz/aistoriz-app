import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ExportModal } from "@/components/ExportModal";
import { ComicBackground } from "@/components/ComicBackground";
import { ComicPageWithBubbles } from "@/components/ComicPageWithBubbles";
import { ComicPanelGrid } from "@/components/ComicPanelGrid";
import { EditDialogueModal } from "@/components/EditDialogueModal";
import { shareComicPageJPG, sharePDF, shareZIP, downloadToDevice, ComicPage } from "@/lib/exportService";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteType = RouteProp<RootStackParamList, "Preview">;

interface ExtendedComicPage {
  pageNumber: number;
  pageType?: 'cover' | 'body' | 'conclusion';
  imageUrl: string;
  panelImages?: string[];
  panels?: Array<{ description: string; dialogue: string; cameraAngle?: string }>;
  scenes?: {
    description: string;
    dialogue: string;
  };
  generationMode?: 'multi-model' | 'gemini-fullpage';
}

const { width } = Dimensions.get("window");
const PAGE_WIDTH = width - Spacing.lg * 2;

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { user, token } = useAuth();

  const { pages: initialPages = [], isReadOnly = false, alreadySaved = false, title = "My Comic" } = route.params;
  
  const [pages, setPages] = useState<ExtendedComicPage[]>(initialPages as ExtendedComicPage[]);
  const [saving, setSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(alreadySaved); // Track if comic is saved
  const hasAutoSaved = useRef(alreadySaved); // Skip auto-save if already saved from GeneratingScreen

  useEffect(() => {
    // Only auto-save if not read-only, has pages, hasn't been saved yet, and wasn't pre-saved
    if (!isReadOnly && pages.length > 0 && !hasAutoSaved.current) {
      hasAutoSaved.current = true;
      autoSaveToHistory();
    }
  }, [isReadOnly, pages.length]);

  const autoSaveToHistory = async () => {
    if (!token) {
      console.log("No auth token, skipping auto-save");
      return;
    }
    
    try {
      const comicTitle = title || `Comic ${Date.now()}`;
      
      // Prepare pages for saving - include panelImages for multi-panel pages
      const savedPages = pages.map(page => ({
        pageNumber: page.pageNumber,
        imageUrl: page.imageUrl,
        panelImages: page.panelImages,
        scenes: page.scenes,
        panels: page.panels,
        pageType: page.pageType,
      }));

      // Save to database API
      const response = await fetch(new URL("/api/comics", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: comicTitle,
          style: "Comic",
          characterNames: [],
          pages: savedPages,
        }),
      });

      if (response.ok) {
        console.log("Comic auto-saved to history via API");
      } else {
        console.error("Failed to auto-save comic to API");
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  const typedPages: ComicPage[] = useMemo(
    () =>
      pages.map((p) => ({
        pageNumber: p.pageNumber,
        imageUrl: p.imageUrl,
        panelImages: p.panelImages,
        pageType: p.pageType,
        scenes: p.scenes,
      })),
    [pages]
  );

  const handleGoBack = async () => {
    await AsyncStorage.setItem("clearCharacterSelection", "true");
    navigation.goBack();
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isReadOnly ? "" : (title || "Your Comic"),
      headerLeft: () => (
        <HeaderButton onPress={handleGoBack}>
          <View style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.text} />
            {isReadOnly && (
              <ThemedText style={styles.backButtonText}>Back to History</ThemedText>
            )}
          </View>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleOpenShareModal}>
          <Feather name="share" size={22} color={theme.primary} />
        </HeaderButton>
      ),
    });
  }, [navigation, title, isReadOnly, theme.text, theme.primary, theme.textSecondary]);

  const handleOpenShareModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pages.length === 0) {
      Alert.alert("No Pages", "There are no comic pages to share.");
      return;
    }
    setShowShareModal(true);
  };

  const handleDownload = async () => {
    setShareLoading("download");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await downloadToDevice(typedPages, title);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Downloaded!", result.message);
      } else {
        Alert.alert("Download Error", result.message);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Download failed");
    } finally {
      setShareLoading(null);
      setShowShareModal(false);
    }
  };

  const handleShareAsPDF = async () => {
    setShareLoading("pdf");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await sharePDF(typedPages, title);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Share Error", result.message);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "PDF share failed");
    } finally {
      setShareLoading(null);
      setShowShareModal(false);
    }
  };

  const handleShareAsJPG = async () => {
    setShareLoading("jpg");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await shareZIP(typedPages, title);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Share Error", result.message);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "JPG share failed");
    } finally {
      setShareLoading(null);
      setShowShareModal(false);
    }
  };

  const compressImageForWeb = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        } else {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
      img.src = imageUrl;
    });
  };

  const handleSaveToHistory = async () => {
    if (!token) {
      Alert.alert("Error", "You must be logged in to save comics.");
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      // Prepare pages for saving - include panelImages for multi-panel pages
      const savedPages = pages.map(page => ({
        pageNumber: page.pageNumber,
        imageUrl: page.imageUrl,
        panelImages: page.panelImages,
        scenes: page.scenes,
        panels: page.panels,
        pageType: page.pageType,
      }));

      // Save to database API
      const response = await fetch(new URL("/api/comics", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title || `Comic ${Date.now()}`,
          style: "Comic",
          characterNames: [],
          pages: savedPages,
        }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSaved(true);
        Alert.alert("Saved!", "Your comic has been saved to history.");
      } else {
        throw new Error("Failed to save comic");
      }
    } catch (error) {
      console.error("Save error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save comic. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportSuccess = (message: string) => {
    Alert.alert("Export Successful", message);
  };

  const handleExportError = (message: string) => {
    Alert.alert("Export Error", message);
  };

  const handleSharePage = useCallback(async (page: ComicPage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasAny =
      (page.imageUrl || "").trim().length > 0 ||
      (page.panelImages && page.panelImages.some((u) => (u || "").trim().length > 0));
    if (!hasAny) {
      Alert.alert("Share Error", "No image available to share.");
      return;
    }

    const result = await shareComicPageJPG(page);
    if (!result.success) {
      Alert.alert("Share Error", result.message);
    }
  }, []);

  const handleEditPage = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPageIndex(index);
  }, []);

  const handleSaveEdit = (updatedScenes: { description: string; dialogue: string }) => {
    if (editingPageIndex === null) return;
    
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[editingPageIndex] = {
        ...newPages[editingPageIndex],
        scenes: updatedScenes,
      };
      return newPages;
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const editingPage = editingPageIndex !== null ? pages[editingPageIndex] : null;
  const PAGE_HEIGHT = (PAGE_WIDTH * 4) / 3 * 1.35;

  const listHeader = useMemo(() => {
    if (!isReadOnly || !title) return null;
    return (
      <View style={[styles.titleCard, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText style={[styles.titleText, { color: theme.text }]}>{title}</ThemedText>
      </View>
    );
  }, [isReadOnly, title, theme.backgroundSecondary, theme.text]);

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Feather name="book-open" size={64} color={theme.placeholder} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
          No pages to display
        </ThemedText>
      </View>
    ),
    [theme.placeholder, theme.textSecondary]
  );

  const renderComicPage = useCallback(
    ({ item: page, index }: ListRenderItemInfo<ExtendedComicPage>) => (
      <View
        style={[
          styles.pageCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          Shadows.card,
        ]}
      >
        <View style={styles.pageHeader}>
          <ThemedText type="h4">
            {page.pageType === "cover"
              ? "Cover"
              : page.pageType === "conclusion"
                ? "Conclusion"
                : `Page ${page.pageNumber}`}
          </ThemedText>
          <View style={styles.headerActions}>
            {!isReadOnly ? (
              <Pressable
                onPress={() => handleEditPage(index)}
                hitSlop={8}
                style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                testID={`button-edit-text-${page.pageNumber}`}
              >
                <Feather name="edit-2" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => handleSharePage(typedPages[index])}
              hitSlop={12}
              style={({ pressed }) => [
                styles.headerButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
                  borderRadius: 22,
                },
              ]}
              testID={`button-share-page-${page.pageNumber}`}
            >
              <Feather name="share" size={20} color={theme.primary} />
            </Pressable>
          </View>
        </View>
        {page.generationMode === "gemini-fullpage" && page.imageUrl ? (
          <ComicPageWithBubbles
            imageUrl={page.imageUrl}
            scenes={page.scenes}
            containerWidth={PAGE_WIDTH}
            containerHeight={PAGE_WIDTH * 16 / 9}
            pageNumber={page.pageNumber}
            isCover={page.pageType === "cover"}
            title={page.pageType === "cover" ? title : undefined}
            borderColor={theme.border}
            backgroundColor={theme.backgroundSecondary}
            hideBubbles={true}
          />
        ) : page.panelImages && page.panelImages.length > 1 ? (
          <ComicPanelGrid
            panels={page.panelImages
              .map((img: string, idx: number) => ({
                imageUrl: img,
                dialogue: page.panels?.[idx]?.dialogue || "",
                description: page.panels?.[idx]?.description || "",
              }))
              .filter((p) => p.imageUrl)}
            containerWidth={PAGE_WIDTH}
            pageType={page.pageType}
            title={page.pageType === "cover" ? title : undefined}
          />
        ) : page.imageUrl ? (
          <ComicPageWithBubbles
            imageUrl={page.imageUrl}
            scenes={page.scenes}
            containerWidth={PAGE_WIDTH}
            containerHeight={PAGE_HEIGHT}
            pageNumber={page.pageNumber}
            isCover={page.pageType === "cover"}
            title={page.pageType === "cover" ? title : undefined}
            borderColor={theme.border}
            backgroundColor={theme.backgroundSecondary}
          />
        ) : (
          <View
            style={[styles.placeholderPage, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="image" size={48} color={theme.placeholder} />
            <ThemedText type="small" style={{ color: theme.placeholder, marginTop: Spacing.md }}>
              Image not available
            </ThemedText>
          </View>
        )}
      </View>
    ),
    [
      PAGE_HEIGHT,
      isReadOnly,
      theme.backgroundDefault,
      theme.border,
      theme.backgroundSecondary,
      theme.placeholder,
      theme.primary,
      theme.textSecondary,
      title,
      typedPages,
      handleEditPage,
      handleSharePage,
    ]
  );

  const listFooter = useMemo(
    () => <View style={{ height: isReadOnly ? Spacing.xl : 120 }} />,
    [isReadOnly]
  );

  return (
    <ComicBackground>
      <FlatList
        data={pages}
        keyExtractor={(item, i) => `page-${item.pageNumber}-${i}`}
        renderItem={renderComicPage}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (isReadOnly ? Spacing.xl : 120) },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
      />

      {!isReadOnly && pages.length > 0 ? (
        <View
          style={[
            styles.floatingActions,
            {
              backgroundColor: theme.backgroundDefault,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.actionRow}>
            <Button
              variant="outline"
              onPress={() => setShowExportModal(true)}
              style={styles.actionButton}
              testID="button-export"
            >
              Export
            </Button>
            <Button
              onPress={isSaved ? undefined : handleSaveToHistory}
              loading={saving}
              disabled={isSaved}
              style={[styles.actionButton, isSaved && styles.savedButton]}
              testID="button-save-history"
            >
              {isSaved ? "Saved" : "Save to History"}
            </Button>
          </View>
        </View>
      ) : null}

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        pages={typedPages}
        title={title}
        onSuccess={handleExportSuccess}
        onError={handleExportError}
      />

      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !shareLoading && setShowShareModal(false)}
        >
          <View style={[styles.shareModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h3" style={styles.shareModalTitle}>
              Share Comic
            </ThemedText>
            <ThemedText type="small" style={[styles.shareModalSubtitle, { color: theme.textSecondary }]}>
              All {pages.length} pages will be included
            </ThemedText>

            <Pressable
              style={[styles.shareOption, { borderColor: theme.border }]}
              onPress={handleDownload}
              disabled={!!shareLoading}
            >
              <View style={styles.shareOptionContent}>
                <View style={[styles.shareIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Feather name="download" size={22} color={theme.primary} />
                </View>
                <View style={styles.shareOptionText}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Download</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Save all pages to Photos
                  </ThemedText>
                </View>
              </View>
              {shareLoading === "download" ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null}
            </Pressable>

            <Pressable
              style={[styles.shareOption, { borderColor: theme.border }]}
              onPress={handleShareAsPDF}
              disabled={!!shareLoading}
            >
              <View style={styles.shareOptionContent}>
                <View style={[styles.shareIconContainer, { backgroundColor: '#EF4444' + '20' }]}>
                  <Feather name="file-text" size={22} color="#EF4444" />
                </View>
                <View style={styles.shareOptionText}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Share as PDF</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Single PDF document
                  </ThemedText>
                </View>
              </View>
              {shareLoading === "pdf" ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null}
            </Pressable>

            <Pressable
              style={[styles.shareOption, { borderColor: theme.border }]}
              onPress={handleShareAsJPG}
              disabled={!!shareLoading}
            >
              <View style={styles.shareOptionContent}>
                <View style={[styles.shareIconContainer, { backgroundColor: '#10B981' + '20' }]}>
                  <Feather name="image" size={22} color="#10B981" />
                </View>
                <View style={styles.shareOptionText}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Share as JPG</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    All pages as ZIP file
                  </ThemedText>
                </View>
              </View>
              {shareLoading === "jpg" ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null}
            </Pressable>

            <Pressable
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => setShowShareModal(false)}
              disabled={!!shareLoading}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {editingPage ? (
        <EditDialogueModal
          visible={editingPageIndex !== null}
          onClose={() => setEditingPageIndex(null)}
          pageNumber={editingPage.pageNumber}
          scenes={editingPage.scenes || { description: "", dialogue: "" }}
          onSave={handleSaveEdit}
        />
      ) : null}
    </ComicBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  pageCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pageImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  placeholderPage: {
    width: "100%",
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  floatingActions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  savedButton: {
    opacity: 0.7,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  titleCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  shareModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  shareModalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  shareModalSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  shareOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  shareIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  shareOptionText: {
    flex: 1,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
