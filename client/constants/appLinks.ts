export {
  LEGAL_CONTACT_EMAIL as SUPPORT_EMAIL,
  LEGAL_CONTACT_EMAIL as ACCOUNT_DELETION_SUPPORT_EMAIL,
  LEGAL_PRIVACY_POLICY_URL as PRIVACY_POLICY_URL,
  LEGAL_ACCOUNT_DELETION_URL as ACCOUNT_DELETION_URL,
} from "@shared/legal";

/** Public store / deep links for invites. Replace iOS URL with your App Store ID when live. */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.aistoriz.storiz";

/** Update with real App Store listing URL when the app is published. */
export const APP_STORE_URL = "https://apps.apple.com/app/ai-storiz/id0000000000";

export const INVITE_MESSAGE = (referralCode: string, inviteeCredits: number) =>
  `Create amazing AI comics with AI Storiz! Download the app and use my referral code ${referralCode} — you'll get ${inviteeCredits} free credits.\n\n` +
  `Android: ${PLAY_STORE_URL}\n` +
  `iOS: ${APP_STORE_URL}`;
