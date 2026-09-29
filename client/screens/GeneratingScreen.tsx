import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, AppState, AppStateStatus, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { useKeepAwake, deactivateKeepAwake } from "expo-keep-awake";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ComicBackground } from "@/components/ComicBackground";
import { getApiUrl } from "@/lib/query-client";
import { triggerHistoryRefresh } from "@/store";
import { fetchComicPagesForPreview } from "@/lib/comicPreviewUrls";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Single Lottie animation with true transparency
const LOADER_ANIMATION = require("../../assets/animations/comic-loader.json");

// Style-specific colors for UI elements (not the Lottie)
const STYLE_COLORS = {
  Comic: { primary: "#4CAF50", secondary: "#FFD700", accent: "#FF6B6B" },
  Manga: { primary: "#E94560", secondary: "#1A1A2E", accent: "#F5F5F5" },
  Manhwa: { primary: "#7B68EE", secondary: "#FFB6C1", accent: "#87CEEB" },
};


// Modern Glass Progress Bar Component
interface GlassProgressBarProps {
  progress: number;
  style?: string;
}

const GlassProgressBar = ({ progress, style = "Comic" }: GlassProgressBarProps) => {
  const shimmerPosition = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const colors = STYLE_COLORS[style as keyof typeof STYLE_COLORS] || STYLE_COLORS.Comic;

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerPosition.value, [0, 1], [-120, SCREEN_WIDTH + 50], Extrapolation.CLAMP) }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pulseScale.value }],
  }));

  return (
    <ReAnimated.View style={[progressStyles.container, containerStyle]}>
      <View style={progressStyles.track}>
        <LinearGradient
          colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
          style={progressStyles.glassBackground}
        />
        <ReAnimated.View
          style={[
            progressStyles.fill,
            { width: `${progress}%` },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={progressStyles.fillGradient}
          />
          <ReAnimated.View style={[progressStyles.shimmer, shimmerStyle]}>
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.6)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={progressStyles.shimmerGradient}
            />
          </ReAnimated.View>
        </ReAnimated.View>
      </View>
    </ReAnimated.View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  fill: {
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  fillGradient: {
    flex: 1,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 120,
  },
  shimmerGradient: {
    flex: 1,
  },
});

interface CharacterWithImage {
  name: string;
  type: string;
  imageUri?: string;
  description?: string;
}

async function convertImageToBase64(uri: string): Promise<string | null> {
  try {
    if (!uri) return null;
    
    // Already a data URI - pass through
    if (uri.startsWith('data:')) {
      return uri;
    }
    
    // Web platform: handle blob URLs from file picker
    if (Platform.OS === 'web') {
      if (uri.startsWith('blob:')) {
        // Fetch blob and convert to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result); // Already includes data:mime;base64, prefix
          };
          reader.onerror = () => {
            console.log("FileReader error converting blob to base64");
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      }
      
      // HTTP URLs on web - pass through for server to handle
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return uri;
      }
      
      // Unknown web URI format
      console.log("Unknown web URI format:", uri.substring(0, 50));
      return null;
    }
    
    // Native: HTTP URLs pass through
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    
    // Native: Local file URIs - use FileSystem legacy API
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
    
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.log("Could not convert image to base64:", error);
    return null;
  }
}

function isRemoteHttpUrl(uri: string): boolean {
  return uri.startsWith("https://") || uri.startsWith("http://");
}

async function uploadCharacterImageForGenerate(
  uri: string,
  token: string | null | undefined,
): Promise<string | null> {
  if (isRemoteHttpUrl(uri)) {
    return uri;
  }

  const dataUri = await convertImageToBase64(uri);
  if (!dataUri) return null;
  if (isRemoteHttpUrl(dataUri)) {
    return dataUri;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(new URL("/api/character-photos", getApiUrl()).href, {
    method: "POST",
    headers,
    body: JSON.stringify({ photoUri: dataUri }),
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { url?: string };
  return typeof payload.url === "string" && payload.url.trim() ? payload.url : null;
}

async function prepareCharactersWithStorageUrls(
  characters: CharacterWithImage[],
  token: string | null | undefined,
): Promise<CharacterWithImage[]> {
  return Promise.all(
    characters.map(async (char) => {
      if (!char.imageUri) return char;
      const uploaded = await uploadCharacterImageForGenerate(char.imageUri, token);
      if (uploaded) {
        return { ...char, imageUri: uploaded };
      }
      console.warn(`Failed to upload image for "${char.name}" - retrying once...`);
      const retryUrl = await uploadCharacterImageForGenerate(char.imageUri, token);
      if (retryUrl) {
        return { ...char, imageUri: retryUrl };
      }
      if (char.imageUri.startsWith("data:")) {
        throw new Error("Failed to upload character image. Please try again.");
      }
      console.warn(`Retry also failed for "${char.name}" - keeping original URI as fallback`);
      return { ...char, imageUri: char.imageUri };
    }),
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, "Generating">;

const LOADING_MESSAGES = [
  "Writing the plot...",
  "Casting characters...",
  "Drawing panels...",
  "Adding speech bubbles...",
  "Coloring scenes...",
  "Packaging your comic...",
];

const GENERATION_KEEP_AWAKE_TAG = "comic-generation-active";
const POLL_INTERVAL = 4000; // Slightly snappier progress updates without hammering the server
const FETCH_TIMEOUT = 90000; // 90 second timeout per poll (backend responds fast now with lightweight payloads)
const MAX_RETRIES = 360; // Retry up to 360 times (30 minutes of polling tolerance for long generations)

const devLog: (...args: unknown[]) => void = __DEV__
  ? (...args) => {
      console.log(...args);
    }
  : () => {};

/** Prefer server copy; strip noisy technical errors in production. */
function friendlyJobFailureMessage(raw: string | undefined | null): string {
  const t = (raw || "").trim();
  if (!t) return "We couldn't finish your comic. Please try again.";
  if (
    t.length > 400 ||
    /ECONNREFUSED|ENOTFOUND|502|503|504|SyntaxError|Unexpected token|at\s+\w+\s+\(/i.test(t)
  ) {
    return "Something went wrong while creating your comic. Please try again.";
  }
  return t;
}

export default function GeneratingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { theme } = useTheme();
  const { token } = useAuth();
  
  // Keep screen awake during generation; use explicit tag so we always release on unmount.
  useKeepAwake(GENERATION_KEEP_AWAKE_TAG);
  useEffect(() => {
    return () => {
      deactivateKeepAwake(GENERATION_KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [pagesProgressLabel, setPagesProgressLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    startGeneration();

    // Listen for app state changes to continue polling when app comes back
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      // App came back to foreground - reset retry counter and resume polling
      devLog("App returned to foreground, resetting retry counter and resuming polling");
      retryCountRef.current = 0;
      
      // Check for saved job and resume polling
      const savedJobId = await AsyncStorage.getItem("current_job_id");
      if (savedJobId) {
        // If we already have a jobId set, just restart polling for it
        // Otherwise set the saved one
        const activeJobId = jobId || savedJobId;
        if (!jobId) {
          setJobId(savedJobId);
        }
        // Restart polling to ensure we're connected
        startPolling(activeJobId);
      }
    }
    appState.current = nextAppState;
  };

  const startGeneration = async () => {
    const { storyPrompt, style, characters, pagesCount, scenesPerPage, title, language } = route.params;

    // Reset navigation guard for new generation
    hasNavigatedRef.current = false;

    try {
      // Clear any old job ID from previous sessions to prevent "session expired" errors
      await AsyncStorage.removeItem("current_job_id");
      
      setProgress(5);

      // Upload local character images to storage first so generate-comic stays under 4 MB.
      // Existing HTTPS asset URLs are sent as-is (no re-upload).
      const preparedCharacters = await prepareCharactersWithStorageUrls(characters || [], token);
      
      const charactersWithImages = preparedCharacters.filter(c => c.imageUri);
      if (charactersWithImages.length > 0) {
        devLog(`Sending ${charactersWithImages.length} character(s) with reference images for visual consistency`);
      }

      const baseUrl = getApiUrl();
      devLog(`Starting generation with API URL: ${baseUrl}`);
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(new URL("/api/generate-comic", baseUrl).href, {
        method: "POST",
        headers,
        body: JSON.stringify({
          storyPrompt,
          style,
          characters: preparedCharacters,
          pagesCount,
          scenesPerPage,
          title,
          language,
        }),
      });

      if (!response.ok) {
        // Check for insufficient credits
        if (response.status === 402) {
          try {
            const errorData = await response.json();
            if (errorData.code === "INSUFFICIENT_CREDITS") {
              setInsufficientCredits(true);
              setIsGenerating(false);
              return;
            }
          } catch (e) {
            // Parse error, fall through to generic error
          }
        }
        
        // Check for auth error
        if (response.status === 401) {
          throw new Error("Please log in to generate comics");
        }
        
        throw new Error("Failed to start comic generation");
      }

      const { jobId: newJobId } = await response.json();
      setJobId(newJobId);

      // Save job ID so we can resume if app is closed
      await AsyncStorage.setItem("current_job_id", newJobId);

      startPolling(newJobId);
    } catch (err: any) {
      console.error("Generation start error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsGenerating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Reset retry counter for new polling session
    retryCountRef.current = 0;

    // Poll immediately
    pollJobStatus(id);

    // Then poll at intervals
    pollIntervalRef.current = setInterval(() => {
      pollJobStatus(id);
    }, POLL_INTERVAL);
  };

  const retryCountRef = useRef(0);

  const pollJobStatus = async (id: string) => {
    try {
      const baseUrl = getApiUrl();
      // Add cache-busting query param to prevent 304 responses
      const url = new URL(`/api/job/${id}?_t=${Date.now()}`, baseUrl).href;
      
      // Log polling attempt for debugging
      if (__DEV__ && (retryCountRef.current === 0 || retryCountRef.current % 10 === 0)) {
        devLog(`Polling job ${id} (attempt ${retryCountRef.current + 1})`);
      }
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      // Use POST instead of GET to work around browser networking issues with port 5000
      const response = await fetch(url, { 
        method: 'POST',
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ checkStatus: true }),
      });
      clearTimeout(timeoutId);

      // Reset retry count on successful fetch
      retryCountRef.current = 0;

      if (!response.ok) {
        if (response.status === 404) {
          // Job not found - this shouldn't happen with fresh generation
          // Clear saved job and restart generation
          await AsyncStorage.removeItem("current_job_id");
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          // Retry the generation automatically
          devLog("Job not found, restarting generation...");
          setTimeout(() => startGeneration(), 1000);
          return;
        }
        const errorText = await response.text().catch(() => "");
        throw new Error(`Server error (${response.status}): ${errorText || "Please try again"}`);
      }

      const job = await response.json();

      devLog(
        `Job status: ${job.status}, progress: ${job.progress}, pages: ${job.pagesCompleted ?? job.pages?.length ?? 0}`
      );

      setProgress(job.progress);

      if (job.status === "processing") {
        const total =
          typeof job.pagesTotal === "number" && job.pagesTotal > 0
            ? job.pagesTotal
            : route.params.pagesCount;
        const done = typeof job.pagesCompleted === "number" ? job.pagesCompleted : 0;
        if (typeof total === "number" && total > 0) {
          setPagesProgressLabel(`${Math.min(done, total)} of ${total} pages ready`);
        } else {
          setPagesProgressLabel(null);
        }
      } else {
        setPagesProgressLabel(null);
      }

      if (job.status === "completed") {
        // Guard against duplicate navigation from multiple poll callbacks
        if (hasNavigatedRef.current) {
          devLog("Already navigated, skipping duplicate completion");
          return;
        }
        hasNavigatedRef.current = true;

        devLog("Comic generation completed! Saving to history...");
        
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        // Clear saved job ID
        await AsyncStorage.removeItem("current_job_id");

        const comicTitle = job.title || route.params.title || "My Comic";

        // Check if server already auto-saved this comic
        const serverSaved = job.savedToLibrary === true;
        devLog(`Comic completion - server saved: ${serverSaved}`);

        let comicIdForPreviewUrls: number | undefined =
          typeof job.libraryComicId === "number" ? job.libraryComicId : undefined;

        // Only client-side save if server didn't already save (fallback — server ingests to S3)
        if (token && !serverSaved) {
          try {
            const savedPages = job.pages.map((page: any) => ({
              pageNumber: page.pageNumber,
              imageUrl: page.imageUrl,
              panelImages: page.panelImages,
              scenes: page.scenes,
              panels: page.panels,
              pageType: page.pageType,
            }));

            devLog("Saving comic via client fallback (server ingests images to S3)...");
            const saveResponse = await fetch(new URL("/api/comics", getApiUrl()).toString(), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: comicTitle,
                style: route.params.style || "Comic",
                characterNames: route.params.characters?.map((c: any) => c.name) || [],
                pages: savedPages,
              }),
            });

            if (saveResponse.ok) {
              devLog("Comic auto-saved to history via client");
              try {
                const body = await saveResponse.json();
                if (typeof body.comic?.id === "number") {
                  comicIdForPreviewUrls = body.comic.id;
                }
              } catch {
                /* ignore malformed JSON */
              }
            } else {
              console.error("Failed to auto-save comic:", await saveResponse.text());
            }
          } catch (saveError) {
            console.error("Auto-save error:", saveError);
          }
        }

        let pagesForPreview = job.pages;
        if (token && comicIdForPreviewUrls != null) {
          const urlPages = await fetchComicPagesForPreview(String(comicIdForPreviewUrls), token);
          if (urlPages && urlPages.length > 0) {
            // Keep generation mode / type / copy from the job if metadata is missing (avoids wrong Preview branch for page 0).
            pagesForPreview = urlPages.map((p, i) => {
              const idx = p.serverPageIndex ?? i;
              const j = job.pages[idx] as any;
              if (!j) return p;
              return {
                ...p,
                generationMode: p.generationMode ?? j.generationMode,
                pageType: p.pageType ?? j.pageType,
                scenes: p.scenes ?? j.scenes,
                panels: p.panels ?? j.panels,
              };
            });
            devLog("Preview will use stored comic image URLs (S3/CDN where available)");
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Refresh history in the background so the History tab stays up to date
        triggerHistoryRefresh(token);

        // Navigate to preview - comic is already saved (either by server or client)
        navigation.replace("Preview", {
          pages: pagesForPreview,
          isReadOnly: false,
          alreadySaved: true,
          title: comicTitle,
        });
      } else if (job.status === "failed") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        await AsyncStorage.removeItem("current_job_id");

        setError(friendlyJobFailureMessage(job.error));
        setIsGenerating(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    } catch (err: any) {
      // For network/timeout errors, silently retry without showing error
      const isNetworkError = err.name === "AbortError" || 
        err.message?.includes("network") || 
        err.message?.includes("fetch") ||
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("Network request failed");
      
      if (isNetworkError && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        if (__DEV__ && retryCountRef.current % 10 === 0) {
          devLog(`Network retry ${retryCountRef.current}/${MAX_RETRIES}: ${err.message || err.name}`);
        }
        return;
      }
      
      // Stop the polling interval FIRST to prevent re-entry
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      devLog("Retries exhausted, attempting final recovery check...");
      
      try {
        const savedJobId = await AsyncStorage.getItem("current_job_id");
        if (savedJobId) {
          const baseUrl = getApiUrl();
          const recoveryUrl = new URL(`/api/job/${savedJobId}?_t=${Date.now()}`, baseUrl).href;
          
          const recoveryController = new AbortController();
          const recoveryTimeout = setTimeout(() => recoveryController.abort(), 120000);
          
          const recoveryResponse = await fetch(recoveryUrl, {
            method: 'POST',
            signal: recoveryController.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkStatus: true }),
          });
          clearTimeout(recoveryTimeout);
          
          if (recoveryResponse.ok) {
            const job = await recoveryResponse.json();
            devLog("Recovery check result:", job.status);
            
            if (job.status === "completed") {
              retryCountRef.current = 0;
              pollJobStatus(savedJobId);
              return;
            } else if (job.status === "processing") {
              devLog("Comic still processing, restarting polling...");
              retryCountRef.current = 0;
              startPolling(savedJobId);
              return;
            }
          }
        }
      } catch (recoveryErr) {
        devLog("Recovery check failed:", recoveryErr);
      }
      
      console.error("Poll error after retries:", err.message || err.name, err);
      
      let errorMessage =
        "Connection lost during generation. Your comic may still be processing — check History in a few minutes.";
      if (err.message?.includes("Job not found")) {
        errorMessage = "Your comic session expired. Please create a new comic.";
      } else if (err.message && err.name !== "AbortError") {
        errorMessage = friendlyJobFailureMessage(err.message);
      }
      
      setError(errorMessage);
      setIsGenerating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRetry = async () => {
    setError(null);
    setProgress(0);
    setPagesProgressLabel(null);
    retryCountRef.current = 0;
    setIsGenerating(true);
    setJobId(null);
    await AsyncStorage.removeItem("current_job_id");
    startGeneration();
  };

  const handleGoBack = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    await AsyncStorage.removeItem("current_job_id");
    navigation.goBack();
  };

  // Get style-specific colors for UI
  const currentStyle = route.params.style || "Comic";
  const styleColors = STYLE_COLORS[currentStyle as keyof typeof STYLE_COLORS] || STYLE_COLORS.Comic;

  // Style-specific title
  const getTitle = () => {
    switch (currentStyle) {
      case "Manga": return "Creating Your Manga!";
      case "Manhwa": return "Creating Your Manhwa!";
      default: return "Creating Your Comic!";
    }
  };

  return (
    <ComicBackground intensity="medium">
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
      >
      {/* Lottie animation - transparent and smooth */}
      <View style={styles.mainImageWrapper}>
        <LottieView
          source={LOADER_ANIMATION}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
      </View>

      {insufficientCredits ? (
        <View style={styles.errorContainer}>
          <ThemedText type="h1" style={[styles.title, { color: "#FFA500" }]}>
            Not Enough Credits
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            You need more credits to generate this comic. Get more credits to continue creating amazing stories!
          </ThemedText>
          <View style={styles.buttonColumn}>
            <Button
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Main" }],
                });
                setTimeout(() => {
                  navigation.navigate("Subscription" as any);
                }, 100);
              }}
              style={styles.wideButton}
              testID="button-get-credits"
            >
              Get More Credits
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Main" }],
                });
                setTimeout(() => {
                  navigation.navigate("EarnCredits" as any);
                }, 100);
              }}
              style={styles.wideButton}
              testID="button-earn-free"
            >
              Earn Free Credits
            </Button>
            <Button
              variant="outline"
              onPress={handleGoBack}
              style={styles.wideButton}
              testID="button-go-back-credits"
            >
              Go Back
            </Button>
          </View>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText type="h1" style={[styles.title, { color: theme.error }]}>
            Oops!
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            {error}
          </ThemedText>
          <View style={styles.buttonRow}>
            <Button
              variant="outline"
              onPress={handleGoBack}
              style={styles.button}
              testID="button-go-back"
            >
              Go Back
            </Button>
            <Button
              onPress={handleRetry}
              style={styles.button}
              testID="button-retry"
            >
              Retry
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <ThemedText type="h1" style={[styles.title, { color: styleColors.primary }]}>
            {getTitle()}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.message, { color: theme.textSecondary }]}
          >
            {LOADING_MESSAGES[messageIndex]}
          </ThemedText>

          <GlassProgressBar progress={progress} style={currentStyle} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {Math.round(progress)}%
            {pagesProgressLabel ? ` · ${pagesProgressLabel}` : ""}
          </ThemedText>

          <ThemedText
            type="small"
            style={[styles.backgroundNote, { color: theme.textSecondary }]}
          >
            You can switch apps - your comic will keep generating!
          </ThemedText>
        </View>
      )}
      </View>
    </ComicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: "hidden",
  },
  mainImageWrapper: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
    zIndex: 1,
  },
  lottieAnimation: {
    width: 280,
    height: 280,
  },
  progressContainer: {
    alignItems: "center",
    width: "100%",
  },
  errorContainer: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  progressBar: {
    width: "100%",
    height: 16,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  progressFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  buttonColumn: {
    flexDirection: "column",
    gap: Spacing.md,
    width: "100%",
    alignItems: "center",
  },
  button: {
    minWidth: 120,
  },
  wideButton: {
    minWidth: 200,
    width: "80%",
  },
  backgroundNote: {
    marginTop: Spacing["2xl"],
    textAlign: "center",
    fontStyle: "italic",
  },
});
