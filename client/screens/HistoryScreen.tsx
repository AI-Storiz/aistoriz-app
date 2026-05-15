import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useAuth } from "@/contexts/AuthContext";
import { fetchComicPagesForPreview } from "@/lib/comicPreviewUrls";
import { store, fetchHistory, clearHistory } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { SavedComicLightweight } from "@/store/historySlice";
import { ComicCard } from "@/components/ComicCard";
import FooterTextAd from "@/components/FooterTextAd";
import BannerAd from "@/components/BannerAd";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  bg: "#E5E7EB",
  card: "#F9FAFB",
  accent: "#0EA5E9",
  text: "#1F2937",
  dim: "#6B7280",
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

const HISTORY_LOADER_ANIMATION = require("../../assets/animations/comic-loader.json");

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const dispatch = useAppDispatch();

  const comics = useAppSelector((s) => s.history.comics);
  const fullInFlight = useAppSelector((s) => s.history.fullInFlight);
  const silentInFlight = useAppSelector((s) => s.history.silentInFlight);

  const showFullLoader = fullInFlight > 0 && comics.length === 0;
  const backgroundRefreshing = silentInFlight > 0;

  const [loadingComicId, setLoadingComicId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        dispatch(clearHistory());
        return;
      }
      const mode = store.getState().history.comics.length > 0 ? "silent" : "full";
      void dispatch(fetchHistory({ token, mode }));
    }, [token, dispatch])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleComicPress = useCallback(
    async (comic: SavedComicLightweight) => {
      if (!token || loadingComicId) return;

      setLoadingComicId(comic.id);
      try {
        const pagesWithUrls = await fetchComicPagesForPreview(comic.id, token);
        if (pagesWithUrls && pagesWithUrls.length > 0) {
          navigation.navigate("Preview", {
            pages: pagesWithUrls,
            isReadOnly: true,
            title: comic.title,
          });
        }
      } catch (error) {
        console.error("Error loading comic:", error);
      } finally {
        setLoadingComicId(null);
      }
    },
    [token, loadingComicId, navigation]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Image
          source={require("../../assets/images/empty-history.png")}
          style={styles.emptyImage}
          resizeMode="contain"
        />
        <Text style={styles.emptyTitle}>No Comics Yet</Text>
        <Text style={styles.emptySubtitle}>
          Start creating your first comic story!
        </Text>
        <Pressable
          style={styles.emptyButton}
          onPress={() => navigation.getParent()?.navigate("CreateTab")}
          testID="button-start-creating"
        >
          <Text style={styles.emptyButtonText}>Start Creating</Text>
        </Pressable>
      </View>
    ),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SavedComicLightweight; index: number }) => {
      const isLoadingThis = loadingComicId === item.id;

      return (
        <ComicCard
          title={item.title}
          imageUrl={item.thumbnailUrl || undefined}
          date={formatDate(item.createdAt)}
          onPress={() => handleComicPress(item)}
          style={[
            styles.card,
            { width: CARD_WIDTH, opacity: isLoadingThis ? 0.6 : 1 },
            index % 2 === 0 ? { marginRight: 10 } : { marginLeft: 10 },
          ]}
          testID={`comic-card-${item.id}`}
        />
      );
    },
    [loadingComicId, handleComicPress]
  );

  const renderHeader = useMemo(
    () => (
      <>
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.bigTitle}>Your</Text>
              <Text style={styles.bigTitleAccent}>creations</Text>
            </View>
            {backgroundRefreshing ? (
              <View
                style={styles.refreshPill}
                accessibilityLabel="Updating your library"
                testID="history-background-refresh"
              >
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.refreshPillText}>Updating</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
        {comics.length > 0 ? <BannerAd /> : null}
      </>
    ),
    [comics.length, backgroundRefreshing]
  );

  const keyExtractor = useCallback((item: SavedComicLightweight) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>AI Storiz</Text>
        <Pressable 
          style={styles.credits}
          onPress={() => navigation.navigate("Subscription")}
        >
          <Feather name="hexagon" size={14} color={COLORS.accent} />
          <Text style={styles.creditsNum}>{user?.credits ?? 0}</Text>
        </Pressable>
      </View>

      <View style={styles.listArea}>
        <FlatList
          data={comics}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + 20 },
            comics.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!showFullLoader ? renderEmpty : null}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={comics.length > 0 ? <FooterTextAd /> : null}
          testID="history-list"
        />
        {showFullLoader ? (
          <Animated.View
            entering={FadeIn.duration(280)}
            style={[styles.loadingOverlay, { pointerEvents: "auto" }]}
            testID="history-loading"
          >
            <LottieView
              source={HISTORY_LOADER_ANIMATION}
              autoPlay
              loop
              style={styles.loadingLottie}
            />
            <Text style={styles.loadingLabel}>Loading your creations…</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  logo: {
    width: 96,
    height: 96,
    marginVertical: -32,
    marginLeft: -20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  credits: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  creditsNum: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  bigTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginTop: 4,
  },
  bigTitleAccent: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
    marginBottom: 20,
  },
  refreshPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  refreshPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dim,
    fontFamily: "Nunito_600SemiBold",
  },
  listArea: {
    flex: 1,
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(229, 231, 235, 0.92)",
    paddingHorizontal: 32,
  },
  loadingLottie: {
    width: 168,
    height: 168,
  },
  loadingLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dim,
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  listContent: {
    paddingTop: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.card,
    fontFamily: "Nunito_700Bold",
  },
});
