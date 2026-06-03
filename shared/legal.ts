/** Legal copy shared by web templates and in-app screens (keep in sync). */

export const LEGAL_APP_NAME = "AI Storiz";
export const LEGAL_DEVELOPER_NAME = "Fio Creatives";
export const LEGAL_LAST_UPDATED = "June 2026";

/** Single support contact for privacy, deletion, and legal inquiries (web + in-app). */
export const LEGAL_CONTACT_EMAIL = "fiocreativesolutions@gmail.com";

export const LEGAL_PRIVACY_CONTACT_EMAIL = LEGAL_CONTACT_EMAIL;
export const LEGAL_ACCOUNT_DELETION_EMAIL = LEGAL_CONTACT_EMAIL;

export const LEGAL_PRIVACY_POLICY_URL =
  "https://aistorizapi.fiocreatives.com/privacy";
export const LEGAL_ACCOUNT_DELETION_URL =
  "https://aistorizapi.fiocreatives.com/account-deletion";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      `This Privacy Policy describes how ${LEGAL_DEVELOPER_NAME} ("we", "us", or "our") collects, uses, shares, and protects information when you use the ${LEGAL_APP_NAME} mobile application and related services (the "Service").`,
      `By using ${LEGAL_APP_NAME}, you agree to the practices described in this policy. If you do not agree, please do not use the Service.`,
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: ["We collect the following categories of information:"],
    bullets: [
      "Account information: email address, password (stored in hashed form), and profile details you provide when you register or sign in.",
      "User content: story prompts, character names and descriptions, character photos you upload, and AI-generated comic pages and related metadata.",
      "Usage and app data: comics you save, credit balance and transaction history, referral codes, art style preferences, and in-app settings.",
      "Device and technical data: device type, operating system, app version, push notification tokens, and diagnostic logs needed to operate and secure the Service.",
      "Advertising data: advertising identifiers and interaction data when ads are shown (see Third-Party Services).",
      "Payment-related data: subscription and purchase status processed through Google Play or Apple App Store (we do not receive your full payment card number).",
    ],
  },
  {
    title: "How We Use Your Information",
    paragraphs: ["We use personal information to:"],
    bullets: [
      "Create and manage your account and authenticate you.",
      "Generate, store, and display your comics and characters.",
      "Process credit purchases, subscriptions, referrals, and support requests.",
      "Send service-related emails (verification, password reset) and push notifications you enable.",
      "Improve app performance, fix errors, prevent fraud, and enforce our Terms of Service.",
      "Display advertisements and measure ad performance where applicable.",
    ],
  },
  {
    title: "How We Share Your Information",
    paragraphs: [
      "We do not sell your personal information. We share information only as described below:",
    ],
    bullets: [
      "Service providers: cloud hosting, email delivery, and AI image generation partners (including OpenAI and Replicate) that process prompts and content needed to provide the Service, subject to their policies and our instructions.",
      "Payment platforms: Google Play and Apple App Store for in-app purchases and subscriptions.",
      "Advertising partners: Google AdMob (or similar) for ad delivery and measurement on supported devices.",
      "Legal and safety: when required by law, to protect rights and safety, or to respond to lawful requests from authorities.",
    ],
  },
  {
    title: "Permissions",
    paragraphs: [
      `${LEGAL_APP_NAME} may request device permissions to provide features you choose to use:`,
      "You can change many permissions in your device settings. Some features may not work if required permissions are denied.",
    ],
    bullets: [
      "Photos / camera: to add character images for comic creation.",
      "Notifications: to send comic-ready alerts and optional promotional messages if enabled.",
      "Network access: to sync your account and generate content.",
    ],
  },
  {
    title: "Data Storage and Security",
    paragraphs: [
      "Account and comic data are stored on secure servers. We use reasonable technical and organizational measures to protect personal information, including encryption in transit (HTTPS) and access controls.",
      "Some content may also be stored on your device for offline viewing. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Data Retention and Deletion",
    paragraphs: [
      "We retain personal information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements.",
      `You may request deletion of your account and associated data at any time. See our Account & Data Deletion page (${LEGAL_ACCOUNT_DELETION_URL}) or use Delete Account in the app Profile settings. Deletion requests are typically processed within 30 days.`,
      "We may retain limited information where required for legal, security, fraud prevention, or payment record purposes, as described on our account deletion page.",
    ],
  },
  {
    title: "Your Rights and Choices",
    paragraphs: [
      "Depending on your location, you may have the right to access, correct, or delete personal information, export your comic history where available, opt out of promotional communications, and withdraw consent where applicable.",
      `To exercise these rights, contact us at ${LEGAL_PRIVACY_CONTACT_EMAIL} or use the account deletion process above.`,
    ],
    bullets: [
      "Access, correct, or delete personal information we hold about you.",
      "Export your comic history where the app provides export features.",
      "Opt out of promotional communications.",
      "Withdraw consent where processing is based on consent, subject to legal limitations.",
    ],
  },
  {
    title: "Children's Privacy",
    paragraphs: [
      `${LEGAL_APP_NAME} is not directed to children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will delete it.`,
    ],
  },
  {
    title: "International Users",
    paragraphs: [
      "Your information may be processed in countries other than your own, including the United States, where our service providers operate. We take steps designed to protect your information consistent with this policy.",
    ],
  },
  {
    title: "Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We will post the updated policy at the same URL and update the \"Last updated\" date. Continued use of the Service after changes means you accept the revised policy.",
    ],
  },
  {
    title: "Contact Us",
    paragraphs: [
      `Questions about this Privacy Policy or our data practices may be sent to ${LEGAL_DEVELOPER_NAME} at ${LEGAL_PRIVACY_CONTACT_EMAIL}.`,
    ],
  },
];

export const ACCOUNT_DELETION_SECTIONS: LegalSection[] = [
  {
    title: "Request account deletion",
    paragraphs: [
      `You can request deletion of your ${LEGAL_APP_NAME} account and associated personal data using either method below.`,
    ],
    bullets: [
      `In the app: open Profile → Delete Account, then follow the instructions to email us from your registered address.`,
      `On the web: email ${LEGAL_ACCOUNT_DELETION_EMAIL} from the address linked to your account.`,
    ],
  },
  {
    title: "What to include",
    paragraphs: [
      "Please include the email address you used to register for AI Storiz. If you signed in with a third-party provider, include that email and note the sign-in method.",
    ],
  },
  {
    title: "Active subscriptions",
    paragraphs: [
      "If you have an active subscription through Google Play or the App Store, cancel it in your store subscription settings before or when you request account deletion. Canceling the subscription does not automatically delete your account.",
    ],
  },
  {
    title: "What we delete",
    paragraphs: [
      "When we process a verified deletion request, we delete or anonymize:",
    ],
    bullets: [
      "Your user account and login credentials",
      "Saved story prompts and generated comics stored on our servers",
      "Uploaded character photos and related metadata",
      "App usage history, credits history, and referral data tied to your account",
      "Push notification tokens associated with your account",
    ],
  },
  {
    title: "What we may retain",
    paragraphs: [
      "We may retain limited information only where necessary for legal compliance, security, fraud prevention, dispute resolution, or payment and tax records. Any retained data is minimized and protected.",
    ],
  },
  {
    title: "Processing time",
    paragraphs: [
      "We aim to complete verified deletion requests within 30 days. You will receive confirmation by email when deletion is finished, when possible.",
    ],
  },
];
