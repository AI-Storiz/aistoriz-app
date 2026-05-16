import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Remote push is not available in Expo Go on Android (SDK 53+).
 * Returns false for web, simulators, and Expo Go on Android.
 */
export function isPushNotificationsSupported(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  if (!Device.isDevice) {
    return false;
  }
  // Expo Go on Android doesn't support push notifications (SDK 53+)
  if (Constants.appOwnership === "expo" && Platform.OS === "android") {
    return false;
  }
  return true;
}

export type ExpoPushRegistration = {
  token: string;
  platform: typeof Platform.OS;
};

/**
 * Requests permission and returns an Expo push token, or null when unsupported / denied.
 */
export async function registerExpoPushToken(): Promise<ExpoPushRegistration | null> {
  try {
    if (!isPushNotificationsSupported()) {
      if (Constants.appOwnership === "expo" && Platform.OS === "android") {
        console.log("[Push] Push notifications are not available in Expo Go on Android. Install a development build or production APK to enable notifications.");
      }
      return null;
    }

    const Notifications = await import("expo-notifications");

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Notification permission denied by user");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("[Push] No EAS project ID found - cannot register push token");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("[Push] Successfully registered push token");
    return { token: tokenData.data, platform: Platform.OS };
  } catch (error) {
    console.error("[Push] Failed to register push token:", error);
    return null;
  }
}
