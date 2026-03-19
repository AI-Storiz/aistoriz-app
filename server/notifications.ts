import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { storage } from "./storage";

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload,
  type: string = "general"
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await storage.getNotificationSettings();
    if (!settings.enabled) {
      return { success: false, error: "Notifications are disabled" };
    }

    const prefs = await storage.getNotificationPreferences(userId);
    
    if (prefs) {
      if (type === "comic_complete" && !prefs.comicComplete) {
        return { success: false, error: "User has disabled comic complete notifications" };
      }
      if (type === "low_credits" && !prefs.lowCredits) {
        return { success: false, error: "User has disabled low credits notifications" };
      }
      if (type === "referral_success" && !prefs.referralSuccess) {
        return { success: false, error: "User has disabled referral notifications" };
      }
      if (type === "promotions" && !prefs.promotions) {
        return { success: false, error: "User has disabled promotion notifications" };
      }
    }

    const tokens = await storage.getUserPushTokens(userId);
    if (tokens.length === 0) {
      return { success: false, error: "No push tokens registered for user" };
    }

    const messages: ExpoPushMessage[] = [];
    for (const tokenRecord of tokens) {
      if (!Expo.isExpoPushToken(tokenRecord.token)) {
        console.warn(`Invalid Expo push token: ${tokenRecord.token}`);
        continue;
      }
      
      messages.push({
        to: tokenRecord.token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      });
    }

    if (messages.length === 0) {
      return { success: false, error: "No valid push tokens found" };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending notification chunk:", error);
      }
    }

    const successCount = tickets.filter((t) => t.status === "ok").length;
    const failCount = tickets.filter((t) => t.status === "error").length;

    await storage.logNotification(
      userId,
      type,
      payload.title,
      payload.body,
      successCount > 0 ? "sent" : "failed",
      payload.data,
      failCount > 0 ? `${failCount} of ${tickets.length} failed` : undefined
    );

    return { success: successCount > 0 };
  } catch (error) {
    console.error("Error sending push notification:", error);
    await storage.logNotification(
      userId,
      type,
      payload.title,
      payload.body,
      "failed",
      payload.data,
      error instanceof Error ? error.message : "Unknown error"
    );
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendBroadcastNotification(
  payload: NotificationPayload,
  type: string = "broadcast"
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const settings = await storage.getNotificationSettings();
    if (!settings.enabled) {
      return { success: false, sent: 0, failed: 0 };
    }

    const allTokens = await storage.getAllActivePushTokens();
    if (allTokens.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = [];
    for (const tokenRecord of allTokens) {
      if (!Expo.isExpoPushToken(tokenRecord.token)) {
        continue;
      }
      
      messages.push({
        to: tokenRecord.token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      });
    }

    if (messages.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending broadcast chunk:", error);
      }
    }

    const successCount = tickets.filter((t) => t.status === "ok").length;
    const failCount = tickets.filter((t) => t.status === "error").length;

    await storage.logNotification(
      null,
      type,
      payload.title,
      payload.body,
      successCount > 0 ? "sent" : "failed",
      { ...payload.data, recipientCount: allTokens.length },
      failCount > 0 ? `${failCount} of ${tickets.length} failed` : undefined
    );

    return { success: successCount > 0, sent: successCount, failed: failCount };
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    return { success: false, sent: 0, failed: 0 };
  }
}

export async function sendComicCompleteNotification(
  userId: string,
  comicTitle: string,
  comicId?: number
): Promise<{ success: boolean }> {
  return sendPushNotification(
    userId,
    {
      title: "Your Comic is Ready!",
      body: `"${comicTitle}" has finished generating. Tap to view!`,
      data: { screen: "comic", comicId },
    },
    "comic_complete"
  );
}

export async function sendLowCreditsNotification(
  userId: string,
  currentCredits: number
): Promise<{ success: boolean }> {
  return sendPushNotification(
    userId,
    {
      title: "Running Low on Credits",
      body: `You have ${currentCredits} credits left. Get more to keep creating!`,
      data: { screen: "subscription" },
    },
    "low_credits"
  );
}

export async function sendReferralSuccessNotification(
  userId: string,
  creditsEarned: number
): Promise<{ success: boolean }> {
  return sendPushNotification(
    userId,
    {
      title: "Referral Bonus Earned!",
      body: `Someone used your code! You earned ${creditsEarned} credits.`,
      data: { screen: "profile" },
    },
    "referral_success"
  );
}
