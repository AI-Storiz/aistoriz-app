import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
  weeklyPlanCredits: number;
  weeklyPlanPrice: string;
  yearlyPlanCredits: number;
  yearlyPlanPrice: string;
  topUp1Credits: number;
  topUp1Price: string;
  topUp2Credits: number;
  topUp2Price: string;
  topUp3Credits: number;
  topUp3Price: string;
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "yearly">("yearly");

  useEffect(() => {
    fetchSettings();
  }, []);

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

  function handleSubscribe() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Subscription Coming Soon",
      "In-app purchases will be available after the app is published to the App Store and Google Play.\n\nFor now, you can earn credits by watching video ads!",
      [
        { text: "OK", style: "cancel" },
        {
          text: "Earn Free Credits",
          onPress: () => navigation.navigate("EarnCredits" as never),
        },
      ]
    );
  }

  function handleTopUp(credits: number, price: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Credit Top-Up Coming Soon",
      `Purchasing ${credits} credits for $${price} will be available after the app is published to the App Store and Google Play.\n\nFor now, you can earn credits by watching video ads!`,
      [
        { text: "OK", style: "cancel" },
        {
          text: "Earn Free Credits",
          onPress: () => navigation.navigate("EarnCredits" as never),
        },
      ]
    );
  }

  const isSubscribed = user?.subscriptionStatus && user.subscriptionStatus !== "none";

  const weeklyCredits = settings?.weeklyPlanCredits || 300;
  const weeklyPrice = settings?.weeklyPlanPrice || "6.99";
  const yearlyCredits = settings?.yearlyPlanCredits || 3000;
  const yearlyPrice = settings?.yearlyPlanPrice || "69.00";
  const yearlySavings = Math.round((1 - (parseFloat(yearlyPrice) / (parseFloat(weeklyPrice) * 52))) * 100);
  
  const topUp1Credits = settings?.topUp1Credits || 100;
  const topUp1Price = settings?.topUp1Price || "2.99";
  const topUp2Credits = settings?.topUp2Credits || 500;
  const topUp2Price = settings?.topUp2Price || "9.99";
  const topUp3Credits = settings?.topUp3Credits || 1000;
  const topUp3Price = settings?.topUp3Price || "19.99";

  return (
    <View style={styles.wrapper}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: Spacing.xl },
      ]}
    >
      <Pressable
        style={styles.watchAdsCard}
        onPress={() => navigation.navigate("EarnCredits" as never)}
      >
        <LinearGradient
          colors={["#9B7BFF", "#7C5CE0", "#6B4FCF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.watchAdsGradient}
        >
          <View style={styles.watchAdsIconContainer}>
            <Feather name="play-circle" size={28} color="#000" />
          </View>
          <View style={styles.watchAdsTextContainer}>
            <Text style={styles.watchAdsTitle}>
              Watch Ads & Earn Free Credits
            </Text>
            <Text style={styles.watchAdsSubtitle}>
              Tap to start earning now
            </Text>
          </View>
          <Feather name="chevron-right" size={24} color="#FFF" />
        </LinearGradient>
      </Pressable>

      <View style={styles.header}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Get More Credits</Text>
        <Text style={styles.subtitle}>
          Subscribe to generate unlimited comics
        </Text>
      </View>

      <BannerAd />

      <View style={styles.currentCredits}>
        <Text style={styles.currentCreditsLabel}>Current Balance</Text>
        <Text style={styles.currentCreditsValue}>{user?.credits || 0} credits</Text>
      </View>

      <View style={styles.plansContainer}>
        <Pressable
          style={[styles.planCard, selectedPlan === "weekly" && styles.planCardSelected]}
          onPress={() => {
            setSelectedPlan("weekly");
            Haptics.selectionAsync();
          }}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Weekly</Text>
            {selectedPlan === "weekly" ? (
              <Feather name="check-circle" size={24} color={Colors.light.primary} />
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </View>
          <Text style={styles.planCredits}>{weeklyCredits} credits</Text>
          <Text style={styles.planPrice}>${weeklyPrice}/week</Text>
          <Text style={styles.planPer}>~${(parseFloat(weeklyPrice) / weeklyCredits * 100).toFixed(1)}¢ per credit</Text>
        </Pressable>

        <Pressable
          style={[styles.planCard, selectedPlan === "yearly" && styles.planCardSelected]}
          onPress={() => {
            setSelectedPlan("yearly");
            Haptics.selectionAsync();
          }}
        >
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Yearly</Text>
            {selectedPlan === "yearly" ? (
              <Feather name="check-circle" size={24} color={Colors.light.primary} />
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </View>
          <Text style={styles.planCredits}>{yearlyCredits} credits</Text>
          <Text style={styles.planPrice}>${yearlyPrice}/year</Text>
          <Text style={styles.planPer}>~${(parseFloat(yearlyPrice) / yearlyCredits * 100).toFixed(1)}¢ per credit</Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {yearlySavings}%</Text>
          </View>
        </Pressable>
      </View>

      {isSubscribed ? (
        <View style={styles.topUpSection}>
          <Text style={styles.topUpTitle}>Credit Top-Up</Text>
          <Text style={styles.topUpSubtitle}>Need more credits? Add them to your balance instantly.</Text>
          <View style={styles.topUpCardsRow}>
            <Pressable
              style={styles.topUpCard}
              onPress={() => handleTopUp(topUp1Credits, topUp1Price)}
            >
              <Feather name="zap" size={20} color={Colors.light.primary} style={styles.topUpIcon} />
              <Text style={styles.topUpCredits}>{topUp1Credits}</Text>
              <Text style={styles.topUpCreditsLabel}>credits</Text>
              <Text style={styles.topUpPrice}>${topUp1Price}</Text>
              <Text style={styles.topUpPer}>~{(parseFloat(topUp1Price) / topUp1Credits * 100).toFixed(1)}¢ each</Text>
            </Pressable>
            
            <Pressable
              style={styles.topUpCard}
              onPress={() => handleTopUp(topUp2Credits, topUp2Price)}
            >
              <Feather name="zap" size={20} color={Colors.light.primary} style={styles.topUpIcon} />
              <Text style={styles.topUpCredits}>{topUp2Credits}</Text>
              <Text style={styles.topUpCreditsLabel}>credits</Text>
              <Text style={styles.topUpPrice}>${topUp2Price}</Text>
              <Text style={styles.topUpPer}>~{(parseFloat(topUp2Price) / topUp2Credits * 100).toFixed(1)}¢ each</Text>
            </Pressable>
            
            <Pressable
              style={[styles.topUpCard, styles.topUpCardBest]}
              onPress={() => handleTopUp(topUp3Credits, topUp3Price)}
            >
              <View style={styles.topUpBestBadge}>
                <Text style={styles.topUpBestText}>BEST VALUE</Text>
              </View>
              <Feather name="zap" size={20} color={Colors.light.primary} style={styles.topUpIcon} />
              <Text style={styles.topUpCredits}>{topUp3Credits}</Text>
              <Text style={styles.topUpCreditsLabel}>credits</Text>
              <Text style={styles.topUpPrice}>${topUp3Price}</Text>
              <Text style={styles.topUpPer}>~{(parseFloat(topUp3Price) / topUp3Credits * 100).toFixed(1)}¢ each</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Pressable style={styles.subscribeButton} onPress={handleSubscribe}>
        <Text style={styles.subscribeButtonText}>
          Subscribe for ${selectedPlan === "weekly" ? weeklyPrice : yearlyPrice}
        </Text>
      </Pressable>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>What you get:</Text>
        <View style={styles.featureRow}>
          <Feather name="check" size={20} color={Colors.light.primary} />
          <Text style={styles.featureText}>Credits refresh every billing period</Text>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check" size={20} color={Colors.light.primary} />
          <Text style={styles.featureText}>Generate multi-page AI comics</Text>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check" size={20} color={Colors.light.primary} />
          <Text style={styles.featureText}>All art styles included</Text>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check" size={20} color={Colors.light.primary} />
          <Text style={styles.featureText}>Export to PDF, JPG, or ZIP</Text>
        </View>
        <View style={styles.featureRow}>
          <Feather name="check" size={20} color={Colors.light.primary} />
          <Text style={styles.featureText}>Cancel anytime</Text>
        </View>
      </View>

      <Pressable
        style={styles.freeCreditsButton}
        onPress={() => navigation.navigate("EarnCredits" as never)}
      >
        <Feather name="gift" size={20} color={Colors.light.primary} />
        <Text style={styles.freeCreditsText}>Or earn free credits by watching ads</Text>
      </Pressable>

      <Text style={styles.termsText}>
        Auto-renews. Cancel anytime in your account settings.{"\n"}
        By subscribing, you agree to our Terms and Privacy Policy.
      </Text>
    </ScrollView>
    <FooterTextAd />
    <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  watchAdsCard: {
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  watchAdsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  watchAdsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  watchAdsTextContainer: {
    flex: 1,
  },
  watchAdsTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: "#FFF",
  },
  watchAdsSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  currentCredits: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  currentCreditsLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.light.primaryDark,
  },
  currentCreditsValue: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.light.primaryDark,
  },
  plansContainer: {
    marginBottom: Spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  planCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  planName: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.light.text,
  },
  radioEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  planCredits: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.light.text,
  },
  planPer: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 16,
    backgroundColor: Colors.light.yellow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  bestValueText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.light.text,
  },
  savingsBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: Colors.light.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: "#fff",
  },
  subscribeButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  subscribeButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: "#fff",
  },
  features: {
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  freeCreditsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  freeCreditsText: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
  },
  termsText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  topUpSection: {
    marginBottom: Spacing.xl,
  },
  topUpTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  topUpSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  topUpCardsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  topUpCard: {
    flex: 1,
    backgroundColor: Colors.light.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  topUpCardBest: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
  },
  topUpIcon: {
    marginBottom: Spacing.xs,
  },
  topUpCredits: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.light.text,
  },
  topUpCreditsLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  topUpPrice: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.light.primary,
  },
  topUpPer: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  topUpBestBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    backgroundColor: Colors.light.yellow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  topUpBestText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.light.text,
  },
});
