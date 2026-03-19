import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Clipboard,
  Platform,
  Share,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/contexts/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  bg: "#E5E7EB",
  card: "#F9FAFB",
  accent: "#0EA5E9",
  text: "#1F2937",
  dim: "#6B7280",
  error: "#EF4444",
  success: "#10B981",
};

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  isDestructive,
}: SettingsItemProps) {
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && { backgroundColor: COLORS.bg },
      ]}
    >
      <View style={[styles.settingsIcon, { backgroundColor: isDestructive ? `${COLORS.error}15` : `${COLORS.accent}15` }]}>
        <Feather
          name={icon as any}
          size={20}
          color={isDestructive ? COLORS.error : COLORS.accent}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsTitle, isDestructive && { color: COLORS.error }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color={COLORS.dim} />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, refreshUser } = useAuth();

  const [hdQuality, setHdQuality] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifPrefs, isLoading: loadingNotifPrefs } = useQuery<{
    id: number;
    userId: string;
    comicComplete: boolean;
    lowCredits: boolean;
    referralSuccess: boolean;
    promotions: boolean;
  }>({
    queryKey: ["/api/notifications/preferences"],
    enabled: !!user?.emailVerified,
  });

  const updateNotifPrefsMutation = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      return apiRequest("POST", "/api/notifications/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });

  const registerPushTokenMutation = useMutation({
    mutationFn: async (data: { token: string; platform: string; deviceName?: string }) => {
      return apiRequest("POST", "/api/notifications/register", data);
    },
  });

  const { data: referralStats } = useQuery<{
    referralCode: string | null;
    totalReferrals: number;
    creditsEarned: number;
    inviterCredits: number;
    inviteeCredits: number;
    enabled: boolean;
  }>({
    queryKey: ["/api/referral/stats"],
    enabled: !!user?.emailVerified,
  });

  useEffect(() => {
    loadSettings();
    refreshUser();
  }, []);

  const loadSettings = async () => {
    try {
      const storedHd = await AsyncStorage.getItem("setting_hd_quality");
      if (storedHd !== null) setHdQuality(storedHd === "true");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const notificationsEnabled = notifPrefs
    ? notifPrefs.comicComplete || notifPrefs.lowCredits || notifPrefs.referralSuccess || notifPrefs.promotions
    : true;

  const handleQualityToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHdQuality(value);
    await AsyncStorage.setItem("setting_hd_quality", value.toString());
  };

  const registerForPushNotifications = useCallback(async () => {
    try {
      if (Platform.OS === "web") return null;

      const isExpoGo = Constants.appOwnership === "expo";
      if (isExpoGo && Platform.OS === "android") {
        Alert.alert("Not Available", "Push notifications are not available in Expo Go on Android.");
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert("Notifications Disabled", "Enable notifications in your device settings.");
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      await registerPushTokenMutation.mutateAsync({
        token: token.data,
        platform: Platform.OS,
        deviceName: Device.deviceName || Device.modelName || undefined,
      });

      return token.data;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }, [registerPushTokenMutation]);

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value) {
      const token = await registerForPushNotifications();
      if (!token && Platform.OS !== "web") return;
    }
    
    updateNotifPrefsMutation.mutate({
      comicComplete: value,
      lowCredits: value,
      referralSuccess: value,
      promotions: value,
    });
  };

  const getStorageKey = () => user ? `saved_comics_${user.id}` : "saved_comics";

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will delete all your saved comics. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.removeItem(getStorageKey());
            Alert.alert("Done", "Your comic history has been cleared.");
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) await logout();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
          },
        },
      ]);
    }
  };

  const copyUserId = () => {
    if (user?.userId) {
      Clipboard.setString(user.userId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "Your User ID has been copied to clipboard.");
    }
  };

  const copyReferralCode = () => {
    const code = referralStats?.referralCode || user?.referralCode;
    if (code) {
      Clipboard.setString(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "Your referral code has been copied to clipboard.");
    }
  };

  const shareReferralCode = async () => {
    const code = referralStats?.referralCode || user?.referralCode;
    if (!code) return;
    
    const inviteeCredits = referralStats?.inviteeCredits || 25;
    const message = `Join AI Storiz!\nUse my referral code: ${code}\n\nSign up and get ${inviteeCredits} free credits!`;
    
    try {
      await Share.share({ message, title: "Join AI Storiz" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleSupport = async () => {
    const userId = user?.userId || "Not logged in";
    const subject = encodeURIComponent("AI Storiz Support Request");
    const body = encodeURIComponent(`User ID: ${userId}\n\nPlease describe your issue:\n\n`);
    const mailtoUrl = `mailto:info@aidynamiz.com?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Email Not Available", `Please send an email to info@aidynamiz.com with your User ID: ${userId}`);
      }
    } catch (error) {
      Alert.alert("Email Not Available", `Please send an email to info@aidynamiz.com`);
    }
  };

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      >
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.bigTitle}>Your</Text>
          <Text style={styles.bigTitleAccent}>profile</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={styles.avatarSection}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.profileLogo}
              resizeMode="contain"
            />
            <View style={styles.avatarInfo}>
              <Text style={styles.username}>{user?.email?.split("@")[0] || "Comic Creator"}</Text>
              <Text style={styles.email}>{user?.email || ""}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            style={styles.creditsCard}
            onPress={() => navigation.navigate("Subscription")}
          >
            <View style={styles.creditsCardContent}>
              <View>
                <Text style={styles.creditsCardLabel}>YOUR CREDITS</Text>
                <Text style={styles.creditsCardValue}>{user?.credits || 0}</Text>
              </View>
              <View style={styles.getCreditsButton}>
                <Feather name="plus" size={18} color={COLORS.accent} />
                <Text style={styles.getCreditsText}>Get More</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Pressable
            style={styles.earnCreditsCard}
            onPress={() => navigation.navigate("EarnCredits")}
          >
            <View style={styles.earnIconCircle}>
              <Feather name="play-circle" size={24} color={COLORS.card} />
            </View>
            <View style={styles.earnContent}>
              <Text style={styles.earnTitle}>Watch Ads & Earn Free Credits</Text>
              <Text style={styles.earnSubtitle}>Tap to start earning now</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.card} />
          </Pressable>
        </Animated.View>

        {user?.emailVerified && referralStats?.enabled !== false ? (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Feather name="users" size={20} color={COLORS.accent} />
                <Text style={styles.referralTitle}>Invite Friends</Text>
              </View>
              <Text style={styles.referralSubtitle}>
                Share your code and you both earn {referralStats?.inviterCredits || 25} credits!
              </Text>
              
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCode}>
                  {referralStats?.referralCode || user?.referralCode || "---"}
                </Text>
              </View>
              
              <View style={styles.referralActions}>
                <Pressable style={styles.referralBtnSecondary} onPress={copyReferralCode}>
                  <Feather name="copy" size={18} color={COLORS.text} />
                  <Text style={styles.referralBtnSecondaryText}>Copy</Text>
                </Pressable>
                <Pressable style={styles.referralBtnPrimary} onPress={shareReferralCode}>
                  <Feather name="share-2" size={18} color={COLORS.card} />
                  <Text style={styles.referralBtnPrimaryText}>Share</Text>
                </Pressable>
              </View>
              
              {(referralStats?.totalReferrals || 0) > 0 ? (
                <View style={styles.referralStats}>
                  <View style={styles.referralStatItem}>
                    <Text style={styles.referralStatValue}>{referralStats?.totalReferrals || 0}</Text>
                    <Text style={styles.referralStatLabel}>Friends</Text>
                  </View>
                  <View style={styles.referralStatItem}>
                    <Text style={[styles.referralStatValue, { color: COLORS.success }]}>
                      {referralStats?.creditsEarned || 0}
                    </Text>
                    <Text style={styles.referralStatLabel}>Earned</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.section}>
            <SettingsItem
              icon="hash"
              title="User ID"
              subtitle={user?.userId || "Not available"}
              onPress={copyUserId}
              rightElement={<Feather name="copy" size={18} color={COLORS.dim} />}
            />
            <SettingsItem
              icon="credit-card"
              title="Subscription"
              subtitle={user?.subscriptionStatus === "active" 
                ? `${user.subscriptionPlan} plan - Active`
                : "No active subscription"}
              onPress={() => navigation.navigate("Subscription")}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.section}>
            <SettingsItem
              icon="bell"
              title="Notifications"
              subtitle="Get notified when comics are ready"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: COLORS.bg, true: COLORS.accent }}
                  thumbColor={COLORS.card}
                  disabled={loadingNotifPrefs || updateNotifPrefsMutation.isPending}
                />
              }
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <View style={styles.section}>
            <SettingsItem
              icon="trash-2"
              title="Clear History"
              subtitle="Delete all saved comics"
              onPress={handleClearHistory}
              isDestructive
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.section}>
            <SettingsItem icon="book" title="Story Hints" subtitle="Tips for creating amazing comics" onPress={() => navigation.navigate("StoryHints")} />
            <SettingsItem icon="info" title="About AI Storiz" onPress={() => navigation.navigate("About")} />
            <SettingsItem icon="mail" title="Support" onPress={handleSupport} />
            <SettingsItem icon="shield" title="Privacy Policy" onPress={() => navigation.navigate("Privacy")} />
            <SettingsItem icon="file-text" title="Terms of Service" onPress={() => navigation.navigate("Terms")} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).springify()}>
          <View style={styles.section}>
            <SettingsItem
              icon="log-out"
              title="Sign Out"
              onPress={handleLogout}
              isDestructive
            />
          </View>
        </Animated.View>
      </ScrollView>
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
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarInfo: {
    flex: 1,
    marginLeft: 14,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  email: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  creditsCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  creditsCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creditsCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    fontFamily: "Nunito_700Bold",
    marginBottom: 4,
  },
  creditsCardValue: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.card,
    fontFamily: "Nunito_700Bold",
  },
  getCreditsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  getCreditsText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.accent,
    fontFamily: "Nunito_600SemiBold",
  },
  earnCreditsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9B7BFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  earnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  earnContent: {
    flex: 1,
    marginLeft: 14,
  },
  earnTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
    fontFamily: "Nunito_700Bold",
  },
  earnSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  referralCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  referralSubtitle: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginBottom: 16,
  },
  referralCodeBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 4,
    fontFamily: "Nunito_700Bold",
  },
  referralActions: {
    flexDirection: "row",
    gap: 12,
  },
  referralBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  referralBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  referralBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  referralBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.card,
    fontFamily: "Nunito_600SemiBold",
  },
  referralStats: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg,
    gap: 20,
  },
  referralStatItem: {
    alignItems: "center",
  },
  referralStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
  },
  referralStatLabel: {
    fontSize: 12,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
    fontFamily: "Nunito_700Bold",
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsContent: {
    flex: 1,
    marginLeft: 14,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  settingsSubtitle: {
    fontSize: 13,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
});
