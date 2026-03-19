import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Colors, Spacing, Fonts, BorderRadius } from "@/constants/theme";
import FooterTextAd from "@/components/FooterTextAd";
import BannerAd from "@/components/BannerAd";

interface CreditSettings {
  adsCreditsReward: number;
  maxAdsPerDay: number;
}

export default function EarnCreditsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user, token, refreshUser, updateCredits } = useAuth();
  const [isWatching, setIsWatching] = useState(false);
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);

  useEffect(() => {
    fetchSettings();
    if (user) {
      setAdsWatchedToday(user.adsWatchedToday || 0);
    }
  }, [user]);

  async function fetchSettings() {
    try {
      const response = await fetch(new URL("/api/credits/settings", getApiUrl()).toString());
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch credit settings:", error);
    }
  }

  async function handleWatchAd() {
    if (!token || !settings) return;
    
    if (adsWatchedToday >= settings.maxAdsPerDay) {
      Alert.alert("Daily Limit Reached", "You've watched the maximum number of ads for today. Come back tomorrow!");
      return;
    }

    setIsWatching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const response = await fetch(new URL("/api/credits/watch-ad", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateCredits(data.newBalance);
        setAdsWatchedToday(data.adsWatchedToday);
        Alert.alert(
          "Credits Earned!",
          `You earned ${data.creditsEarned} credits!\n\nNew balance: ${data.newBalance} credits`
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", data.error || "Failed to process ad reward");
      }
    } catch (error: any) {
      console.error("Watch ad error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsWatching(false);
    }
  }

  const adsRemaining = settings ? settings.maxAdsPerDay - adsWatchedToday : 0;
  const canWatchAd = adsRemaining > 0 && !isWatching;

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: Spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Earn Free Credits</Text>
          <Text style={styles.subtitle}>
            Watch video ads to earn credits for generating comics
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Your Credits</Text>
            <Text style={styles.statValue}>{user?.credits || 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Ads Watched Today</Text>
            <Text style={styles.statValue}>{adsWatchedToday} / {settings?.maxAdsPerDay || 5}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Credits per Ad</Text>
            <Text style={styles.statValueHighlight}>+{settings?.adsCreditsReward || 25}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Daily Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(adsWatchedToday / (settings?.maxAdsPerDay || 5)) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {adsRemaining > 0 ? `${adsRemaining} ads remaining today` : "Daily limit reached"}
          </Text>
        </View>

        <Pressable
          style={[styles.watchButton, !canWatchAd && styles.watchButtonDisabled]}
          onPress={handleWatchAd}
          disabled={!canWatchAd}
        >
          {isWatching ? (
            <View style={styles.watchingContent}>
              <ActivityIndicator color="#fff" style={{ marginRight: 12 }} />
              <Text style={styles.watchButtonText}>Playing Ad...</Text>
            </View>
          ) : (
            <View style={styles.watchButtonContent}>
              <Feather name="play-circle" size={24} color="#fff" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.watchButtonText}>Watch Video Ad</Text>
                <Text style={styles.watchButtonSubtext}>
                  Earn {settings?.adsCreditsReward || 25} credits
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={Colors.light.accent} />
          <Text style={styles.infoText}>
            In Expo Go, ads are simulated. Real video ads will appear in the production app after deployment.
          </Text>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>How It Works</Text>
          <View style={styles.tipRow}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>1</Text>
            </View>
            <Text style={styles.tipText}>Tap "Watch Video Ad" button</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>2</Text>
            </View>
            <Text style={styles.tipText}>Watch the complete video ad</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>3</Text>
            </View>
            <Text style={styles.tipText}>Receive your credits instantly</Text>
          </View>
        </View>

        <Pressable
          style={styles.subscribeCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate("Subscription" as never);
          }}
        >
          <LinearGradient
            colors={["#0EA5E9", "#0284C7", "#0369A1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subscribeGradient}
          >
            <View style={styles.subscribeIconContainer}>
              <Feather name="star" size={24} color="#FFF" />
            </View>
            <View style={styles.subscribeTextContainer}>
              <Text style={styles.subscribeTitle}>Want More Credits?</Text>
              <Text style={styles.subscribeSubtitle}>
                Subscribe for instant credits
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#FFF" />
          </LinearGradient>
        </Pressable>

        <BannerAd />
      </ScrollView>
      <FooterTextAd />
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  statsCard: {
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.light.text,
  },
  statValueHighlight: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.light.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.xs,
  },
  progressContainer: {
    marginBottom: Spacing.xl,
  },
  progressLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: 6,
  },
  progressText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  watchButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  watchButtonDisabled: {
    backgroundColor: Colors.light.textSecondary,
    opacity: 0.6,
  },
  watchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  watchingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  watchButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#fff",
  },
  watchButtonSubtext: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#EEF6FF",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.light.accent,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  tipsCard: {
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  tipsTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: Spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  tipNumberText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.light.primary,
  },
  tipText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  subscribeCard: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  subscribeGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  subscribeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  subscribeTextContainer: {
    flex: 1,
  },
  subscribeTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFF",
    marginBottom: 2,
  },
  subscribeSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
});
