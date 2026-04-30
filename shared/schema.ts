import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userId: text("user_id").notNull().unique(),
  credits: integer("credits").default(20).notNull(),
  subscriptionStatus: text("subscription_status").default("none").notNull(),
  subscriptionPlan: text("subscription_plan"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  revenuecatId: text("revenuecat_id"),
  adsWatchedToday: integer("ads_watched_today").default(0).notNull(),
  lastAdWatchDate: date("last_ad_watch_date"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationCode: text("verification_code"),
  verificationCodeExpiresAt: timestamp("verification_code_expires_at"),
  passwordResetCode: text("password_reset_code"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  usersId: varchar("users_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const creditSettings = pgTable("credit_settings", {
  id: serial("id").primaryKey(),
  baseCost: integer("base_cost").default(20).notNull(),
  costPerPage: integer("cost_per_page").default(15).notNull(),
  adsCreditsReward: integer("ads_credits_reward").default(25).notNull(),
  maxAdsPerDay: integer("max_ads_per_day").default(5).notNull(),
  weeklyPlanCredits: integer("weekly_plan_credits").default(270).notNull(),
  weeklyPlanPrice: text("weekly_plan_price").default("7.02").notNull(),
  yearlyPlanCredits: integer("yearly_plan_credits").default(3000).notNull(),
  yearlyPlanPrice: text("yearly_plan_price").default("69.00").notNull(),
  topUp1Credits: integer("top_up_1_credits").default(100).notNull(),
  topUp1Price: text("top_up_1_price").default("2.99").notNull(),
  topUp2Credits: integer("top_up_2_credits").default(500).notNull(),
  topUp2Price: text("top_up_2_price").default("9.99").notNull(),
  topUp3Credits: integer("top_up_3_credits").default(1000).notNull(),
  topUp3Price: text("top_up_3_price").default("19.99").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(creditTransactions),
  characters: many(userCharacters),
  comics: many(userComics),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.usersId],
    references: [users.id],
  }),
}));

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  storyPrompt: text("story_prompt").notNull(),
  style: text("style").notNull(),
  pagesCount: integer("pages_count").default(6).notNull(),
  scenesPerPage: integer("scenes_per_page").default(6).notNull(),
  tone: text("tone"),
  audience: text("audience"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  referenceImageUrl: text("reference_image_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const generatedPages = pgTable("generated_pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  pageNumber: integer("page_number").notNull(),
  imageUrl: text("image_url"),
  scenes: jsonb("scenes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const comicJobs = pgTable("comic_jobs", {
  id: text("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").default("pending").notNull(),
  progress: integer("progress").default(0).notNull(),
  title: text("title"),
  style: text("style"),
  pagesCount: integer("pages_count"),
  pages: jsonb("pages").default([]).notNull(),
  error: text("error"),
  /** Set when the finished job was persisted to `user_comics` so clients can open Preview with API image URLs. */
  libraryComicId: integer("library_comic_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User characters - stored per user for cross-device sync
export const userCharacters = pgTable("user_characters", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  photoUri: text("photo_uri"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User saved comics - stored per user for cross-device sync
export const userComics = pgTable("user_comics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  style: text("style").notNull(),
  characterNames: jsonb("character_names").default([]).notNull(),
  pages: jsonb("pages").default([]).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userCharactersRelations = relations(userCharacters, ({ one }) => ({
  user: one(users, {
    fields: [userCharacters.userId],
    references: [users.id],
  }),
}));

export const userComicsRelations = relations(userComics, ({ one }) => ({
  user: one(users, {
    fields: [userComics.userId],
    references: [users.id],
  }),
}));

// Rate limit settings - admin configurable
export const rateLimitSettings = pgTable("rate_limit_settings", {
  id: serial("id").primaryKey(),
  maxGenerationsPerHour: integer("max_generations_per_hour").default(5).notNull(),
  maxGenerationsPerDay: integer("max_generations_per_day").default(20).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// OAuth settings - store Google OAuth client IDs
export const oauthSettings = pgTable("oauth_settings", {
  id: serial("id").primaryKey(),
  googleWebClientId: text("google_web_client_id"),
  googleIosClientId: text("google_ios_client_id"),
  googleAndroidClientId: text("google_android_client_id"),
  enabled: boolean("enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Generation audit logs - track all generation attempts
export const generationAuditLogs = pgTable("generation_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: text("user_email"),
  action: text("action").notNull(), // 'generation_started', 'generation_completed', 'generation_failed', 'rate_limited', 'insufficient_credits'
  status: text("status").notNull(), // 'success', 'failed', 'blocked'
  creditsUsed: integer("credits_used").default(0),
  pagesCount: integer("pages_count"),
  style: text("style"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional data like job ID, title, etc.
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const generationAuditLogsRelations = relations(generationAuditLogs, ({ one }) => ({
  user: one(users, {
    fields: [generationAuditLogs.userId],
    references: [users.id],
  }),
}));

// Referral settings - admin configurable
export const referralSettings = pgTable("referral_settings", {
  id: serial("id").primaryKey(),
  inviterCredits: integer("inviter_credits").default(50).notNull(),
  inviteeCredits: integer("invitee_credits").default(25).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Referral bounties - time-limited special promotions
export const referralBounties = pgTable("referral_bounties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userIds: jsonb("user_ids").default([]).notNull(),
  bonusInviterCredits: integer("bonus_inviter_credits").default(0).notNull(),
  bonusInviteeCredits: integer("bonus_invitee_credits").default(0).notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Referral history - track all referral events
export const referralHistory = pgTable("referral_history", {
  id: serial("id").primaryKey(),
  inviterId: varchar("inviter_id").references(() => users.id, { onDelete: "set null" }),
  inviterEmail: text("inviter_email"),
  inviteeId: varchar("invitee_id").references(() => users.id, { onDelete: "set null" }),
  inviteeEmail: text("invitee_email"),
  referralCode: text("referral_code").notNull(),
  inviterCreditsAwarded: integer("inviter_credits_awarded").default(0).notNull(),
  inviteeCreditsAwarded: integer("invitee_credits_awarded").default(0).notNull(),
  bountyId: integer("bounty_id").references(() => referralBounties.id, { onDelete: "set null" }),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const referralHistoryRelations = relations(referralHistory, ({ one }) => ({
  inviter: one(users, {
    fields: [referralHistory.inviterId],
    references: [users.id],
  }),
  bounty: one(referralBounties, {
    fields: [referralHistory.bountyId],
    references: [referralBounties.id],
  }),
}));

// Internal Ads - admin managed advertisements
export const internalAds = pgTable("internal_ads", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'text' or 'banner'
  title: text("title").notNull(),
  content: text("content"), // Text content for text ads
  imageUrl: text("image_url"), // Image URL for banner ads
  linkUrl: text("link_url"), // Optional click-through URL
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Ad impressions - track when users see ads for frequency limiting
export const adImpressions = pgTable("ad_impressions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  adId: integer("ad_id").references(() => internalAds.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Ad settings - admin configurable frequency limits
export const adSettings = pgTable("ad_settings", {
  id: serial("id").primaryKey(),
  maxImpressionsPerHour: integer("max_impressions_per_hour").default(3).notNull(),
  maxImpressionsPerDay: integer("max_impressions_per_day").default(10).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  exemptSubscribers: boolean("exempt_subscribers").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const artStyles = pgTable("art_styles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  unlockCost: integer("unlock_cost").default(100).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const artStyleSettings = pgTable("art_style_settings", {
  id: serial("id").primaryKey(),
  unlockAllCost: integer("unlock_all_cost").default(500).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userUnlockedStyles = pgTable("user_unlocked_styles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  styleId: integer("style_id").references(() => artStyles.id, { onDelete: "cascade" }),
  allStylesUnlocked: boolean("all_styles_unlocked").default(false).notNull(),
  unlockedAt: timestamp("unlocked_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const adImpressionsRelations = relations(adImpressions, ({ one }) => ({
  user: one(users, {
    fields: [adImpressions.userId],
    references: [users.id],
  }),
  ad: one(internalAds, {
    fields: [adImpressions.adId],
    references: [internalAds.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type CreditSettings = typeof creditSettings.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedPageSchema = createInsertSchema(generatedPages).omit({
  id: true,
  createdAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type GeneratedPage = typeof generatedPages.$inferSelect;
export type InsertGeneratedPage = z.infer<typeof insertGeneratedPageSchema>;
export type ComicJob = typeof comicJobs.$inferSelect;
export type UserCharacter = typeof userCharacters.$inferSelect;
export type UserComic = typeof userComics.$inferSelect;
export type RateLimitSettings = typeof rateLimitSettings.$inferSelect;
export type OAuthSettings = typeof oauthSettings.$inferSelect;
export type GenerationAuditLog = typeof generationAuditLogs.$inferSelect;
export type ReferralSettings = typeof referralSettings.$inferSelect;
export type ReferralBounty = typeof referralBounties.$inferSelect;
export type ReferralHistory = typeof referralHistory.$inferSelect;
export type InternalAd = typeof internalAds.$inferSelect;
export type AdImpression = typeof adImpressions.$inferSelect;
export type AdSettings = typeof adSettings.$inferSelect;

// Push notification tokens - stores Expo push tokens per device
export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  deviceName: text("device_name"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  comicComplete: boolean("comic_complete").default(true).notNull(),
  lowCredits: boolean("low_credits").default(true).notNull(),
  referralSuccess: boolean("referral_success").default(true).notNull(),
  promotions: boolean("promotions").default(true).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Notification history - log of sent notifications
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // 'comic_complete', 'low_credits', 'referral_success', 'broadcast'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"), // Additional data payload
  status: text("status").default("sent").notNull(), // 'sent', 'delivered', 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Admin notification settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  lowCreditsThreshold: integer("low_credits_threshold").default(20).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, {
    fields: [pushTokens.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
}));

export type PushToken = typeof pushTokens.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NotificationHistoryEntry = typeof notificationHistory.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type ArtStyle = typeof artStyles.$inferSelect;
export type ArtStyleSettings = typeof artStyleSettings.$inferSelect;
export type UserUnlockedStyle = typeof userUnlockedStyles.$inferSelect;
