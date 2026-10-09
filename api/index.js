var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adImpressions: () => adImpressions,
  adImpressionsRelations: () => adImpressionsRelations,
  adSettings: () => adSettings,
  aiSettings: () => aiSettings,
  artStyleSettings: () => artStyleSettings,
  artStyles: () => artStyles,
  characters: () => characters,
  comicJobs: () => comicJobs,
  creditSettings: () => creditSettings,
  creditTransactions: () => creditTransactions,
  creditTransactionsRelations: () => creditTransactionsRelations,
  generatedPages: () => generatedPages,
  generationAuditLogs: () => generationAuditLogs,
  generationAuditLogsRelations: () => generationAuditLogsRelations,
  insertCharacterSchema: () => insertCharacterSchema,
  insertGeneratedPageSchema: () => insertGeneratedPageSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertUserSchema: () => insertUserSchema,
  internalAds: () => internalAds,
  loginUserSchema: () => loginUserSchema,
  notificationHistory: () => notificationHistory,
  notificationHistoryRelations: () => notificationHistoryRelations,
  notificationPreferences: () => notificationPreferences,
  notificationPreferencesRelations: () => notificationPreferencesRelations,
  notificationSettings: () => notificationSettings,
  oauthSettings: () => oauthSettings,
  projects: () => projects,
  pushTokens: () => pushTokens,
  pushTokensRelations: () => pushTokensRelations,
  rateLimitSettings: () => rateLimitSettings,
  referralBounties: () => referralBounties,
  referralHistory: () => referralHistory,
  referralHistoryRelations: () => referralHistoryRelations,
  referralSettings: () => referralSettings,
  registerUserSchema: () => registerUserSchema,
  userCharacters: () => userCharacters,
  userCharactersRelations: () => userCharactersRelations,
  userComics: () => userComics,
  userComicsRelations: () => userComicsRelations,
  userUnlockedStyles: () => userUnlockedStyles,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
function insertFieldMask(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}
function pickInsertSchema(schema, keys) {
  return schema.pick(insertFieldMask(keys));
}
function omitInsertSchema(schema, keys) {
  return schema.omit(insertFieldMask(keys));
}
var users, creditTransactions, creditSettings, usersRelations, creditTransactionsRelations, projects, characters, generatedPages, comicJobs, aiSettings, userCharacters, userComics, userCharactersRelations, userComicsRelations, rateLimitSettings, oauthSettings, generationAuditLogs, generationAuditLogsRelations, referralSettings, referralBounties, referralHistory, referralHistoryRelations, internalAds, adImpressions, adSettings, artStyles, artStyleSettings, userUnlockedStyles, adImpressionsRelations, insertUserSchema, loginUserSchema, registerUserSchema, insertProjectSchema, insertCharacterSchema, insertGeneratedPageSchema, pushTokens, notificationPreferences, notificationHistory, notificationSettings, pushTokensRelations, notificationPreferencesRelations, notificationHistoryRelations;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    creditTransactions = pgTable("credit_transactions", {
      id: serial("id").primaryKey(),
      usersId: varchar("users_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      amount: integer("amount").notNull(),
      type: text("type").notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    creditSettings = pgTable("credit_settings", {
      id: serial("id").primaryKey(),
      baseCost: integer("base_cost").default(20).notNull(),
      costPerPage: integer("cost_per_page").default(15).notNull(),
      adsCreditsReward: integer("ads_credits_reward").default(25).notNull(),
      maxAdsPerDay: integer("max_ads_per_day").default(5).notNull(),
      weeklyPlanCredits: integer("weekly_plan_credits").default(270).notNull(),
      weeklyPlanPrice: text("weekly_plan_price").default("7.02").notNull(),
      yearlyPlanCredits: integer("yearly_plan_credits").default(3e3).notNull(),
      yearlyPlanPrice: text("yearly_plan_price").default("69.00").notNull(),
      topUp1Credits: integer("top_up_1_credits").default(100).notNull(),
      topUp1Price: text("top_up_1_price").default("2.99").notNull(),
      topUp2Credits: integer("top_up_2_credits").default(500).notNull(),
      topUp2Price: text("top_up_2_price").default("9.99").notNull(),
      topUp3Credits: integer("top_up_3_credits").default(1e3).notNull(),
      topUp3Price: text("top_up_3_price").default("19.99").notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      transactions: many(creditTransactions),
      characters: many(userCharacters),
      comics: many(userComics)
    }));
    creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
      user: one(users, {
        fields: [creditTransactions.usersId],
        references: [users.id]
      })
    }));
    projects = pgTable("projects", {
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
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    characters = pgTable("characters", {
      id: serial("id").primaryKey(),
      projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      type: text("type").notNull(),
      referenceImageUrl: text("reference_image_url"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    generatedPages = pgTable("generated_pages", {
      id: serial("id").primaryKey(),
      projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
      pageNumber: integer("page_number").notNull(),
      imageUrl: text("image_url"),
      scenes: jsonb("scenes"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    comicJobs = pgTable("comic_jobs", {
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
      /** Full generate-comic body so the worker can run the pipeline without the HTTP request. */
      requestPayload: jsonb("request_payload"),
      /** Updated while a worker is running this job. Stale processing rows are failed by the worker. */
      heartbeatAt: timestamp("heartbeat_at"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    aiSettings = pgTable("ai_settings", {
      id: integer("id").primaryKey(),
      settings: jsonb("settings").notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    userCharacters = pgTable("user_characters", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      name: text("name").notNull(),
      photoUri: text("photo_uri"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    userComics = pgTable("user_comics", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      title: text("title").notNull(),
      style: text("style").notNull(),
      characterNames: jsonb("character_names").default([]).notNull(),
      pages: jsonb("pages").default([]).notNull(),
      /** True while a generation job is writing pages to S3; hidden from library lists until published. */
      isDraft: boolean("is_draft").default(false).notNull(),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    userCharactersRelations = relations(userCharacters, ({ one }) => ({
      user: one(users, {
        fields: [userCharacters.userId],
        references: [users.id]
      })
    }));
    userComicsRelations = relations(userComics, ({ one }) => ({
      user: one(users, {
        fields: [userComics.userId],
        references: [users.id]
      })
    }));
    rateLimitSettings = pgTable("rate_limit_settings", {
      id: serial("id").primaryKey(),
      maxGenerationsPerHour: integer("max_generations_per_hour").default(5).notNull(),
      maxGenerationsPerDay: integer("max_generations_per_day").default(20).notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    oauthSettings = pgTable("oauth_settings", {
      id: serial("id").primaryKey(),
      googleWebClientId: text("google_web_client_id"),
      googleIosClientId: text("google_ios_client_id"),
      googleAndroidClientId: text("google_android_client_id"),
      enabled: boolean("enabled").default(false).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    generationAuditLogs = pgTable("generation_audit_logs", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
      userEmail: text("user_email"),
      action: text("action").notNull(),
      // 'generation_started', 'generation_completed', 'generation_failed', 'rate_limited', 'insufficient_credits'
      status: text("status").notNull(),
      // 'success', 'failed', 'blocked'
      creditsUsed: integer("credits_used").default(0),
      pagesCount: integer("pages_count"),
      style: text("style"),
      ipAddress: text("ip_address"),
      userAgent: text("user_agent"),
      errorMessage: text("error_message"),
      metadata: jsonb("metadata"),
      // Additional data like job ID, title, etc.
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    generationAuditLogsRelations = relations(generationAuditLogs, ({ one }) => ({
      user: one(users, {
        fields: [generationAuditLogs.userId],
        references: [users.id]
      })
    }));
    referralSettings = pgTable("referral_settings", {
      id: serial("id").primaryKey(),
      inviterCredits: integer("inviter_credits").default(50).notNull(),
      inviteeCredits: integer("invitee_credits").default(25).notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    referralBounties = pgTable("referral_bounties", {
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
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    referralHistory = pgTable("referral_history", {
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
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    referralHistoryRelations = relations(referralHistory, ({ one }) => ({
      inviter: one(users, {
        fields: [referralHistory.inviterId],
        references: [users.id]
      }),
      bounty: one(referralBounties, {
        fields: [referralHistory.bountyId],
        references: [referralBounties.id]
      })
    }));
    internalAds = pgTable("internal_ads", {
      id: serial("id").primaryKey(),
      type: text("type").notNull(),
      // 'text' or 'banner'
      title: text("title").notNull(),
      content: text("content"),
      // Text content for text ads
      imageUrl: text("image_url"),
      // Image URL for banner ads
      linkUrl: text("link_url"),
      // Optional click-through URL
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    adImpressions = pgTable("ad_impressions", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      adId: integer("ad_id").references(() => internalAds.id, { onDelete: "cascade" }).notNull(),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    adSettings = pgTable("ad_settings", {
      id: serial("id").primaryKey(),
      maxImpressionsPerHour: integer("max_impressions_per_hour").default(3).notNull(),
      maxImpressionsPerDay: integer("max_impressions_per_day").default(10).notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      exemptSubscribers: boolean("exempt_subscribers").default(true).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    artStyles = pgTable("art_styles", {
      id: serial("id").primaryKey(),
      name: text("name").notNull().unique(),
      displayOrder: integer("display_order").default(0).notNull(),
      isPremium: boolean("is_premium").default(false).notNull(),
      unlockCost: integer("unlock_cost").default(100).notNull(),
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    artStyleSettings = pgTable("art_style_settings", {
      id: serial("id").primaryKey(),
      unlockAllCost: integer("unlock_all_cost").default(500).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    userUnlockedStyles = pgTable("user_unlocked_styles", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      styleId: integer("style_id").references(() => artStyles.id, { onDelete: "cascade" }),
      allStylesUnlocked: boolean("all_styles_unlocked").default(false).notNull(),
      unlockedAt: timestamp("unlocked_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    adImpressionsRelations = relations(adImpressions, ({ one }) => ({
      user: one(users, {
        fields: [adImpressions.userId],
        references: [users.id]
      }),
      ad: one(internalAds, {
        fields: [adImpressions.adId],
        references: [internalAds.id]
      })
    }));
    insertUserSchema = pickInsertSchema(
      createInsertSchema(users),
      ["email", "password"]
    );
    loginUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });
    registerUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });
    insertProjectSchema = omitInsertSchema(createInsertSchema(projects), ["id", "createdAt", "updatedAt"]);
    insertCharacterSchema = omitInsertSchema(createInsertSchema(characters), ["id", "createdAt"]);
    insertGeneratedPageSchema = omitInsertSchema(createInsertSchema(generatedPages), ["id", "createdAt"]);
    pushTokens = pgTable("push_tokens", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      token: text("token").notNull().unique(),
      platform: text("platform").notNull(),
      // 'ios', 'android', 'web'
      deviceName: text("device_name"),
      isActive: boolean("is_active").default(true).notNull(),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    notificationPreferences = pgTable("notification_preferences", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
      comicComplete: boolean("comic_complete").default(true).notNull(),
      lowCredits: boolean("low_credits").default(true).notNull(),
      referralSuccess: boolean("referral_success").default(true).notNull(),
      promotions: boolean("promotions").default(true).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    notificationHistory = pgTable("notification_history", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
      type: text("type").notNull(),
      // 'comic_complete', 'low_credits', 'referral_success', 'broadcast'
      title: text("title").notNull(),
      body: text("body").notNull(),
      data: jsonb("data"),
      // Additional data payload
      status: text("status").default("sent").notNull(),
      // 'sent', 'delivered', 'failed'
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    notificationSettings = pgTable("notification_settings", {
      id: serial("id").primaryKey(),
      enabled: boolean("enabled").default(true).notNull(),
      lowCreditsThreshold: integer("low_credits_threshold").default(20).notNull(),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
    });
    pushTokensRelations = relations(pushTokens, ({ one }) => ({
      user: one(users, {
        fields: [pushTokens.userId],
        references: [users.id]
      })
    }));
    notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
      user: one(users, {
        fields: [notificationPreferences.userId],
        references: [users.id]
      })
    }));
    notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
      user: one(users, {
        fields: [notificationHistory.userId],
        references: [users.id]
      })
    }));
  }
});

// server/supabaseRootCa.ts
var supabaseRootCa;
var init_supabaseRootCa = __esm({
  "server/supabaseRootCa.ts"() {
    "use strict";
    supabaseRootCa = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`;
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool,
  waitForDatabase: () => waitForDatabase
});
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
function poolLimits() {
  if (process.env.VERCEL) {
    return { min: 0, max: 1, idleTimeoutMillis: 1e4 };
  }
  if (process.env.COMIC_WORKER === "1") {
    return { min: 0, max: 5, idleTimeoutMillis: 3e4 };
  }
  const min = process.env.NODE_ENV === "production" ? 2 : 1;
  return { min, max: 10, idleTimeoutMillis: 3e4 };
}
function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  const limits = poolLimits();
  const config = {
    connectionString,
    min: limits.min,
    max: limits.max,
    idleTimeoutMillis: limits.idleTimeoutMillis,
    // Hosted Postgres cold starts can exceed 5s; allow more time before giving up.
    connectionTimeoutMillis: 15e3
  };
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    const host = url.hostname;
    const needsSsl = sslmode === "require" || host.includes("neon.tech") || host.includes("supabase.co") || host.includes("pooler.supabase.com");
    if (needsSsl) {
      const supabaseHost = host.includes("supabase.co") || host.includes("pooler.supabase.com");
      config.ssl = supabaseHost ? { rejectUnauthorized: true, ca: supabaseRootCa } : { rejectUnauthorized: true };
    }
  } catch {
  }
  return config;
}
async function waitForDatabase(options) {
  const attempts = options?.attempts ?? 4;
  const delayMs = options?.delayMs ?? 1500;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      if (attempt > 1) {
        console.log(`[db] Connected on attempt ${attempt}`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === attempts) {
        console.error(
          `[db] Could not connect after ${attempts} attempts: ${message}`
        );
        console.error(
          "[db] Check DATABASE_URL, VPN/firewall, and that the database accepts connections."
        );
        return false;
      }
      console.warn(
        `[db] Connection attempt ${attempt}/${attempts} failed (${message}); retrying...`
      );
      await new Promise((resolve2) => setTimeout(resolve2, delayMs * attempt));
    }
  }
  return false;
}
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_supabaseRootCa();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool(buildPoolConfig());
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/comicS3.ts
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pLimit from "p-limit";
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchRemoteImageForIngest(url) {
  let lastErr;
  for (let attempt = 1; attempt <= REMOTE_SOURCE_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (res.ok) {
        return res;
      }
      if (res.status >= 500 && attempt < REMOTE_SOURCE_FETCH_ATTEMPTS) {
        await sleep(REMOTE_SOURCE_FETCH_RETRY_MS * attempt);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < REMOTE_SOURCE_FETCH_ATTEMPTS) {
        await sleep(REMOTE_SOURCE_FETCH_RETRY_MS * attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
function addOrigin(set, raw) {
  const t = (raw ?? "").trim();
  if (!t)
    return;
  try {
    set.add(new URL(t).origin);
  } catch {
  }
}
function storageHost() {
  if (!SUPABASE_URL)
    return "";
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return "";
  }
}
function getClient() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabase;
}
function comicS3ErrorPayload(err) {
  const out = {
    error: err.message,
    code: err.code
  };
  const expose = err.details && (process.env.COMIC_S3_DEBUG === "1" || process.env.NODE_ENV !== "production");
  if (expose) {
    out.details = err.details;
  }
  return out;
}
function assertComicS3Configured() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !BUCKET) {
    throw new ComicS3Error(
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and COMIC_STORAGE_BUCKET are required",
      "S3_NOT_CONFIGURED"
    );
  }
}
function publicObjectUrl(key) {
  return `${PUBLIC_BASE}/${key}`;
}
function isComicAssetUrl(url) {
  const t = (url ?? "").trim();
  if (t.length === 0) {
    return true;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") {
      return false;
    }
    return ALLOWED_ORIGINS.has(u.origin);
  } catch {
    return false;
  }
}
function stripNonAssetImagesFromComicPagesJson(pages) {
  if (!Array.isArray(pages)) {
    return [];
  }
  return pages.map((raw) => {
    if (raw == null || typeof raw !== "object") {
      return raw;
    }
    const src = raw;
    const p = { ...src };
    for (const key of ["imageUrl", "imageUri"]) {
      const v = p[key];
      if (typeof v === "string" && v.trim() && !isComicAssetUrl(v)) {
        p[key] = "";
      }
    }
    const pan = p.panelImages;
    if (Array.isArray(pan)) {
      p.panelImages = pan.map(
        (cell) => typeof cell === "string" && cell.trim() && !isComicAssetUrl(cell) ? "" : cell
      );
    }
    return p;
  });
}
async function uploadCharacterPhotoToS3OrThrow(userId, imageData) {
  assertComicS3Configured();
  const t = (imageData ?? "").trim();
  if (t.length === 0) {
    return "";
  }
  if (isOnOurStorageHttps(t)) {
    return t;
  }
  const subPath = `photo-${randomBytes(10).toString("hex")}`;
  let body;
  let contentType;
  let ext;
  if (t.startsWith("data:")) {
    const decoded = bufferFromDataUri(t);
    body = decoded.buffer;
    contentType = decoded.contentType;
    ext = decoded.ext;
  } else if (t.startsWith("https://") || t.startsWith("http://")) {
    const res = await fetch(t, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) {
      throw new ComicS3Error(
        `Failed to fetch character photo (${res.status})`,
        "INGEST_FAILED"
      );
    }
    body = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") || "image/png";
    ext = extFromContentType(contentType, "png");
  } else {
    throw new ComicS3Error("Invalid character photo: expected data or http(s) URL", "INGEST_FAILED");
  }
  if (body.length === 0) {
    throw new ComicS3Error("Empty character photo body", "INGEST_FAILED");
  }
  const key = `${PREFIX}/character-photos/${userId}/${subPath}.${ext}`;
  await putS3ObjectOrThrow(
    key,
    body,
    contentType,
    "public, max-age=31536000, immutable"
  );
  return publicObjectUrl(key);
}
function isOnOurStorageHttps(url) {
  const t = url.trim();
  if (t.length === 0) {
    return true;
  }
  if (!PUBLIC_BASE || !t.startsWith("https://")) {
    return false;
  }
  return t === PUBLIC_BASE || t.startsWith(`${PUBLIC_BASE}/`);
}
function mediaReferenceNeedsS3Upload(value) {
  return typeof value === "string" && value.trim().length > 0 && !isOnOurStorageHttps(value);
}
function comicPagesNeedS3Ingest(pages) {
  if (!Array.isArray(pages)) {
    return false;
  }
  for (const raw of pages) {
    if (raw == null || typeof raw !== "object") {
      continue;
    }
    const o = raw;
    if (mediaReferenceNeedsS3Upload(o.imageUrl) || mediaReferenceNeedsS3Upload(o.imageUri)) {
      return true;
    }
    const pan = o.panelImages;
    if (!Array.isArray(pan)) {
      continue;
    }
    for (const c of pan) {
      if (mediaReferenceNeedsS3Upload(c)) {
        return true;
      }
    }
  }
  return false;
}
function extFromContentType(contentType, fallback) {
  if (!contentType)
    return fallback;
  const c = contentType.toLowerCase().split(";")[0].trim();
  if (c === "image/jpeg" || c === "image/jpg")
    return "jpg";
  if (c === "image/png")
    return "png";
  if (c === "image/webp")
    return "webp";
  if (c === "image/gif")
    return "gif";
  return fallback;
}
function bufferFromDataUri(dataUri) {
  const m = dataUri.trim().match(/^data:image\/([\w.+-]+);base64,([\s\S]*)$/i);
  if (!m) {
    throw new ComicS3Error("Invalid data URI (expected data:image/...;base64,)");
  }
  const subtype = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, "");
  if (!b64) {
    throw new ComicS3Error("Empty data URI payload");
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length === 0) {
    throw new ComicS3Error("Empty decoded image");
  }
  const normalized = subtype === "jpg" ? "jpeg" : subtype;
  const contentType = `image/${normalized}`;
  return {
    buffer,
    contentType,
    ext: extFromContentType(contentType, "png")
  };
}
async function uploadComicFieldToS3OrThrow(userId, comicId, pageIndex, fieldKey, imageData) {
  const t = imageData.trim();
  if (t.length === 0) {
    return "";
  }
  if (isOnOurStorageHttps(t)) {
    return t;
  }
  const subPath = `p${pageIndex}-${fieldKey}-${randomBytes(8).toString("hex")}`;
  let body;
  let contentType;
  let ext;
  if (t.startsWith("data:")) {
    const decoded = bufferFromDataUri(t);
    body = decoded.buffer;
    contentType = decoded.contentType;
    ext = decoded.ext;
  } else if (t.startsWith("https://") || t.startsWith("http://")) {
    const res = await fetchRemoteImageForIngest(t);
    if (!res.ok) {
      throw new ComicS3Error(
        `Failed to fetch source image (${res.status}) for field ${fieldKey}`
      );
    }
    body = Buffer.from(await res.arrayBuffer());
    contentType = res.headers.get("content-type") || "image/png";
    ext = extFromContentType(contentType, "png");
  } else {
    throw new ComicS3Error(`Invalid image for ${fieldKey}: expected data or http(s) URL`);
  }
  if (body.length === 0) {
    throw new ComicS3Error("Empty image body");
  }
  const key = `${PREFIX}/${userId}/${comicId}/${subPath}.${ext}`;
  await putS3ObjectOrThrow(
    key,
    body,
    contentType,
    "public, max-age=31536000, immutable"
  );
  return publicObjectUrl(key);
}
async function putS3ObjectOrThrow(key, body, contentType, cacheControl) {
  const { error } = await getClient().storage.from(BUCKET).upload(key, body, {
    contentType,
    cacheControl,
    upsert: false
  });
  if (!error)
    return;
  const detail = `${error.name || "StorageError"}: ${error.message}`.trim();
  console.error(`[comicS3] Storage upload failed`, {
    bucket: BUCKET,
    key,
    name: error.name,
    message: error.message
  });
  throw new ComicS3Error("Storage upload failed", "INGEST_FAILED", detail);
}
async function uploadTestPngToS3(userId) {
  assertComicS3Configured();
  const t0 = Date.now();
  const key = `${PREFIX}/_s3_test/${userId}/ping-${t0}.png`;
  await putS3ObjectOrThrow(key, PING_PNG_1X1, "image/png", "public, max-age=60");
  return {
    key,
    url: publicObjectUrl(key),
    durationMs: Date.now() - t0,
    bucket: BUCKET,
    region: storageHost()
  };
}
function assertPageFieldsAreAssetUrls(page, pageIndex) {
  const requireUrl = (field, val) => {
    if (val == null || val === "")
      return;
    if (typeof val !== "string" || !isComicAssetUrl(val)) {
      throw new ComicS3Error(`Page ${pageIndex} ${field}: expected S3/ CDN https URL after ingest`);
    }
  };
  requireUrl("imageUrl", page.imageUrl);
  requireUrl("imageUri", page.imageUri);
  const panels = page.panelImages;
  if (!Array.isArray(panels)) {
    return;
  }
  for (let i = 0; i < panels.length; i++) {
    const cell = panels[i];
    if (cell == null)
      continue;
    if (typeof cell !== "string") {
      throw new ComicS3Error(`Page ${pageIndex} panelImages[${i}]: string URL required`);
    }
    if (cell.trim() && !isComicAssetUrl(cell)) {
      throw new ComicS3Error(`Page ${pageIndex} panelImages[${i}]: S3/ CDN https URL required`);
    }
  }
}
function assertPersistedComicPagesAreAssetUrlsOnly(pages, context) {
  if (pages == null) {
    return;
  }
  if (!Array.isArray(pages)) {
    throw new ComicS3Error(`${context}: pages must be an array`);
  }
  for (let i = 0; i < pages.length; i++) {
    const raw = pages[i];
    if (raw == null || typeof raw !== "object") {
      continue;
    }
    assertPageFieldsAreAssetUrls(raw, i);
  }
}
function comicPageIsImageEmpty(p) {
  if (p == null || typeof p !== "object") {
    return true;
  }
  const o = p;
  const str = (v) => typeof v === "string" ? v.trim() : "";
  if (str(o.imageUrl) || str(o.imageUri)) {
    return false;
  }
  const pan = o.panelImages;
  if (!Array.isArray(pan)) {
    return true;
  }
  return !pan.some((c) => typeof c === "string" && c.trim().length > 0);
}
function normalizeComicPagesOrder(pages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { pages, changed: false };
  }
  const out = [...pages];
  let stripped = 0;
  while (out.length > 0 && comicPageIsImageEmpty(out[0])) {
    out.shift();
    stripped += 1;
  }
  if (stripped === 0) {
    return { pages, changed: false };
  }
  const renumbered = out.map((p, idx) => {
    if (p == null || typeof p !== "object") {
      return p;
    }
    return { ...p, pageNumber: idx + 1 };
  });
  return { pages: renumbered, changed: true };
}
async function ingestComicPagesToS3(userId, comicId, pages) {
  assertComicS3Configured();
  if (!Array.isArray(pages)) {
    throw new ComicS3Error("comic `pages` must be an array");
  }
  const out = [];
  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const raw = pages[pIdx];
    if (raw == null || typeof raw !== "object") {
      throw new ComicS3Error(`Page ${pIdx} must be an object`);
    }
    out.push({ ...raw });
  }
  const limit = pLimit(UPLOAD_CONCURRENCY);
  const tasks = [];
  for (let pIdx = 0; pIdx < out.length; pIdx++) {
    const page = out[pIdx];
    if (typeof page.imageUrl === "string" && page.imageUrl.trim()) {
      const v = page.imageUrl;
      tasks.push(
        limit(async () => {
          page.imageUrl = await uploadComicFieldToS3OrThrow(userId, comicId, pIdx, "imageUrl", v);
        })
      );
    }
    if (typeof page.imageUri === "string" && page.imageUri.trim()) {
      const v = page.imageUri;
      tasks.push(
        limit(async () => {
          page.imageUri = await uploadComicFieldToS3OrThrow(userId, comicId, pIdx, "imageUri", v);
        })
      );
    }
    const panelImages = page.panelImages;
    if (Array.isArray(panelImages)) {
      for (let j = 0; j < panelImages.length; j++) {
        const cell = panelImages[j];
        if (cell == null)
          continue;
        if (typeof cell !== "string") {
          throw new ComicS3Error(
            `Page ${pIdx} panelImages[${j}]: string (data or http(s) URL) required`
          );
        }
        if (!cell.trim()) {
          continue;
        }
        const idx = j;
        const cellRef = cell;
        tasks.push(
          limit(async () => {
            panelImages[idx] = await uploadComicFieldToS3OrThrow(
              userId,
              comicId,
              pIdx,
              `panel-${idx}`,
              cellRef
            );
          })
        );
      }
    }
  }
  if (tasks.length === 0) {
    for (let pIdx = 0; pIdx < out.length; pIdx++) {
      assertPageFieldsAreAssetUrls(out[pIdx], pIdx);
    }
    return out;
  }
  await Promise.all(tasks);
  for (let pIdx = 0; pIdx < out.length; pIdx++) {
    assertPageFieldsAreAssetUrls(out[pIdx], pIdx);
  }
  return out;
}
var BUCKET, SUPABASE_URL, SERVICE_ROLE_KEY, PREFIX, UPLOAD_CONCURRENCY, FETCH_TIMEOUT_MS, REMOTE_SOURCE_FETCH_ATTEMPTS, REMOTE_SOURCE_FETCH_RETRY_MS, PUBLIC_BASE, ALLOWED_ORIGINS, supabase, ComicS3Error, PING_PNG_1X1;
var init_comicS3 = __esm({
  "server/comicS3.ts"() {
    "use strict";
    BUCKET = (process.env.COMIC_STORAGE_BUCKET || "").trim();
    SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
    SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    PREFIX = (process.env.COMIC_S3_KEY_PREFIX || "comic-assets").replace(/^\/+|\/+$/g, "");
    UPLOAD_CONCURRENCY = (() => {
      const n = parseInt(process.env.COMIC_S3_CONCURRENCY || "16", 10);
      if (Number.isNaN(n) || n < 1)
        return 16;
      return Math.min(32, n);
    })();
    FETCH_TIMEOUT_MS = 12e4;
    REMOTE_SOURCE_FETCH_ATTEMPTS = 3;
    REMOTE_SOURCE_FETCH_RETRY_MS = 500;
    PUBLIC_BASE = SUPABASE_URL && BUCKET ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}` : "";
    ALLOWED_ORIGINS = (() => {
      const s = /* @__PURE__ */ new Set();
      addOrigin(s, SUPABASE_URL);
      const legacy = process.env.COMIC_LEGACY_ASSET_ORIGINS || "";
      for (const part of legacy.split(",")) {
        addOrigin(s, part);
      }
      addOrigin(s, process.env.COMIC_CDN_BASE_URL);
      const legacyBucket = (process.env.COMIC_S3_BUCKET || "").trim();
      const legacyRegion = (process.env.COMIC_S3_REGION || process.env.AWS_REGION || "us-east-1").trim();
      if (legacyBucket) {
        s.add(`https://${legacyBucket}.s3.${legacyRegion}.amazonaws.com`);
        s.add(`https://${legacyBucket}.s3.amazonaws.com`);
      }
      return s;
    })();
    supabase = null;
    ComicS3Error = class extends Error {
      constructor(message, code = "INGEST_FAILED", details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ComicS3Error";
      }
    };
    PING_PNG_1X1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8l8kAAAAASUVORK5CYII=",
      "base64"
    );
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  storage: () => storage
});
import { eq, sql as sql2, and, desc, gte, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
function generateUserId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "USR-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_comicS3();
    DatabaseStorage = class {
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user || void 0;
      }
      async createUser(email, password, verificationCode, verificationCodeExpiresAt) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateUserId();
        const referralCode = await this.generateUniqueReferralCode();
        const [user] = await db.insert(users).values({
          email,
          password: hashedPassword,
          userId,
          credits: 20,
          subscriptionStatus: "none",
          emailVerified: false,
          verificationCode: verificationCode || null,
          verificationCodeExpiresAt: verificationCodeExpiresAt || null,
          referralCode
        }).returning();
        return user;
      }
      async verifyEmail(id, code) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        if (!user) {
          return { success: false, error: "User not found" };
        }
        if (user.emailVerified) {
          return { success: false, error: "Email already verified" };
        }
        if (!user.verificationCode) {
          return { success: false, error: "No verification code set" };
        }
        if (user.verificationCode !== code) {
          return { success: false, error: "Invalid verification code" };
        }
        if (user.verificationCodeExpiresAt && /* @__PURE__ */ new Date() > user.verificationCodeExpiresAt) {
          return { success: false, error: "Verification code expired" };
        }
        await db.update(users).set({
          emailVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id));
        return { success: true };
      }
      async setEmailVerified(id) {
        const [user] = await db.update(users).set({
          emailVerified: true,
          verificationCode: null,
          verificationCodeExpiresAt: null,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id)).returning();
        return !!user;
      }
      async resendVerificationCode(id, newCode, expiresAt) {
        const [user] = await db.update(users).set({
          verificationCode: newCode,
          verificationCodeExpiresAt: expiresAt,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id)).returning();
        return !!user;
      }
      async setPasswordResetCode(email, code, expiresAt) {
        const [user] = await db.update(users).set({
          passwordResetCode: code,
          passwordResetExpiresAt: expiresAt,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.email, email)).returning();
        return !!user;
      }
      async resetPassword(email, code, newPassword) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
          return { success: false, error: "User not found" };
        }
        if (!user.passwordResetCode) {
          return { success: false, error: "No password reset requested" };
        }
        if (user.passwordResetCode !== code) {
          return { success: false, error: "Invalid reset code" };
        }
        if (user.passwordResetExpiresAt && /* @__PURE__ */ new Date() > user.passwordResetExpiresAt) {
          return { success: false, error: "Reset code expired" };
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(users).set({
          password: hashedPassword,
          passwordResetCode: null,
          passwordResetExpiresAt: null,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.email, email));
        return { success: true };
      }
      async updateUserCredits(id, amount) {
        const [user] = await db.update(users).set({
          credits: sql2`${users.credits} + ${amount}`,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id)).returning();
        return user || void 0;
      }
      async recordTransaction(userId, amount, type, description) {
        const [transaction] = await db.insert(creditTransactions).values({
          usersId: userId,
          amount,
          type,
          description
        }).returning();
        return transaction;
      }
      async getUserTransactions(userId) {
        return await db.select().from(creditTransactions).where(eq(creditTransactions.usersId, userId)).orderBy(sql2`${creditTransactions.createdAt} DESC`).limit(50);
      }
      async getCreditSettings() {
        const [settings] = await db.select().from(creditSettings);
        if (!settings) {
          const [newSettings] = await db.insert(creditSettings).values({}).returning();
          return newSettings;
        }
        return settings;
      }
      async updateCreditSettings(updates) {
        const existing = await this.getCreditSettings();
        const [settings] = await db.update(creditSettings).set({
          ...updates,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(creditSettings.id, existing.id)).returning();
        return settings;
      }
      async incrementAdsWatched(id) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const [user] = await db.select().from(users).where(eq(users.id, id));
        if (!user)
          return void 0;
        const lastAdDate = user.lastAdWatchDate ? String(user.lastAdWatchDate).split("T")[0] : null;
        const adsCount = lastAdDate === today ? user.adsWatchedToday + 1 : 1;
        const [updatedUser] = await db.update(users).set({
          adsWatchedToday: adsCount,
          lastAdWatchDate: sql2`CURRENT_DATE`,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id)).returning();
        return updatedUser || void 0;
      }
      async resetDailyAdsCount(id) {
        await db.update(users).set({
          adsWatchedToday: 0,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, id));
      }
      async getAllUsers() {
        const allUsers = await db.select().from(users).orderBy(sql2`${users.createdAt} DESC`);
        return allUsers;
      }
      async getAdminStats() {
        const allUsers = await db.select().from(users);
        const allTransactions = await db.select().from(creditTransactions);
        const totalUsers = allUsers.length;
        const verifiedUsers = allUsers.filter((u) => u.emailVerified).length;
        const unverifiedUsers = totalUsers - verifiedUsers;
        const activeSubscriptions = allUsers.filter((u) => u.subscriptionStatus === "weekly" || u.subscriptionStatus === "yearly").length;
        const totalCreditsIssued = allTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalCreditsUsed = Math.abs(allTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
        return {
          totalUsers,
          verifiedUsers,
          unverifiedUsers,
          activeSubscriptions,
          totalCreditsIssued,
          totalCreditsUsed
        };
      }
      async updateUserByAdmin(id, updates) {
        const updateData = { updatedAt: sql2`CURRENT_TIMESTAMP` };
        if (updates.credits !== void 0) {
          updateData.credits = updates.credits;
        }
        if (updates.subscriptionStatus !== void 0) {
          updateData.subscriptionStatus = updates.subscriptionStatus;
        }
        const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
        return updatedUser || void 0;
      }
      // User Characters CRUD
      async getUserCharacters(userId) {
        const characters2 = await db.select().from(userCharacters).where(eq(userCharacters.userId, userId)).orderBy(desc(userCharacters.createdAt));
        return characters2;
      }
      async createUserCharacter(userId, name, photoUri) {
        const [character] = await db.insert(userCharacters).values({
          userId,
          name,
          photoUri: photoUri || null
        }).returning();
        return character;
      }
      async updateUserCharacter(id, userId, updates) {
        const updateData = { updatedAt: /* @__PURE__ */ new Date() };
        if (updates.name !== void 0)
          updateData.name = updates.name;
        if (updates.photoUri !== void 0)
          updateData.photoUri = updates.photoUri;
        const [character] = await db.update(userCharacters).set(updateData).where(and(eq(userCharacters.id, id), eq(userCharacters.userId, userId))).returning();
        return character || void 0;
      }
      async deleteUserCharacter(id, userId) {
        const result = await db.delete(userCharacters).where(and(eq(userCharacters.id, id), eq(userCharacters.userId, userId))).returning();
        return result.length > 0;
      }
      // User Comics CRUD
      async getUserComics(userId) {
        const comics = await db.select().from(userComics).where(and(eq(userComics.userId, userId), ne(userComics.isDraft, true))).orderBy(desc(userComics.createdAt));
        return comics;
      }
      async getUserComicsLightweight(userId) {
        const comics = await db.select({
          id: userComics.id,
          title: userComics.title,
          style: userComics.style,
          characterNames: userComics.characterNames,
          createdAt: userComics.createdAt,
          thumbnailAssetUrl: sql2`
          (
            SELECT COALESCE(
              NULLIF(BTRIM(p.val->>'imageUrl'), ''),
              NULLIF(BTRIM(p.val->>'imageUri'), ''),
              (
                SELECT NULLIF(BTRIM(txt), '')
                FROM jsonb_array_elements_text(COALESCE(p.val->'panelImages', '[]'::jsonb)) AS t(txt)
                WHERE NULLIF(BTRIM(txt), '') IS NOT NULL
                LIMIT 1
              )
            )
            FROM jsonb_array_elements(COALESCE(${userComics.pages}, '[]'::jsonb))
              WITH ORDINALITY AS p(val, ord)
            WHERE COALESCE(
              NULLIF(BTRIM(p.val->>'imageUrl'), ''),
              NULLIF(BTRIM(p.val->>'imageUri'), ''),
              (
                SELECT NULLIF(BTRIM(txt2), '')
                FROM jsonb_array_elements_text(COALESCE(p.val->'panelImages', '[]'::jsonb)) AS t2(txt2)
                WHERE NULLIF(BTRIM(txt2), '') IS NOT NULL
                LIMIT 1
              )
            ) IS NOT NULL
            ORDER BY p.ord
            LIMIT 1
          )
        `.as("thumbnailAssetUrl")
        }).from(userComics).where(and(eq(userComics.userId, userId), ne(userComics.isDraft, true))).orderBy(desc(userComics.createdAt));
        return comics;
      }
      /**
       * Strips leading pages with no images and renumbers pageNumber. Persists when changed
       * so list metadata, thumbnails, and /page/0/... all match the same array.
       */
      async ensureComicPagesNormalized(id, userId) {
        const [row] = await db.select({ pages: userComics.pages }).from(userComics).where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
        if (!row?.pages) {
          return;
        }
        const stripped = stripNonAssetImagesFromComicPagesJson(row.pages);
        const { pages: next } = normalizeComicPagesOrder(stripped);
        const unchanged = JSON.stringify(next) === JSON.stringify(row.pages);
        if (!unchanged) {
          await db.update(userComics).set({ pages: next, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
        }
      }
      async getUserComicById(id, userId) {
        await this.ensureComicPagesNormalized(id, userId);
        const [comic] = await db.select().from(userComics).where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
        return comic;
      }
      async getUserComicMetadata(id, userId) {
        await this.ensureComicPagesNormalized(id, userId);
        const [comic] = await db.select({
          id: userComics.id,
          userId: userComics.userId,
          title: userComics.title,
          style: userComics.style,
          characterNames: userComics.characterNames,
          createdAt: userComics.createdAt,
          pagesMetadata: sql2`(
          SELECT jsonb_agg(jsonb_build_object(
            'pageNumber', page->>'pageNumber',
            'pageType', page->>'pageType',
            'panelCount', COALESCE(jsonb_array_length(page->'panelImages'), 0),
            'panels', page->'panels',
            'scenes', page->'scenes',
            'imageUrl', NULLIF(btrim(coalesce(page->>'imageUrl', '')), ''),
            'imageUri', NULLIF(btrim(coalesce(page->>'imageUri', '')), ''),
            'panelImages', COALESCE(page->'panelImages', '[]'::jsonb),
            'hasImageUrl', (
              length(btrim(coalesce(page->>'imageUrl', ''))) > 0
              OR length(btrim(coalesce(page->>'imageUri', ''))) > 0
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(
                  COALESCE(page->'panelImages', '[]'::jsonb)
                ) AS t(val)
                WHERE length(btrim(val)) > 0
              )
            ),
            'generationMode', page->>'generationMode'
          ))
          FROM jsonb_array_elements(${userComics.pages}) AS page
        )`
        }).from(userComics).where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
        if (!comic)
          return void 0;
        return {
          id: comic.id,
          userId: comic.userId,
          title: comic.title,
          style: comic.style,
          characterNames: comic.characterNames,
          createdAt: comic.createdAt,
          pagesMetadata: comic.pagesMetadata || []
        };
      }
      /**
       * First non-empty imageUrl / imageUri / panel in array order. Shared by thumbnails and
       * cover `panel/-1` fallback when slot 0 is blank but a later page has art.
       */
      firstNonEmptyImageFromPages(pages) {
        for (const raw of pages) {
          if (raw == null || typeof raw !== "object") {
            continue;
          }
          const p = raw;
          const u = typeof p.imageUrl === "string" ? p.imageUrl.trim() : "";
          if (u) {
            return u;
          }
          const iu = typeof p.imageUri === "string" ? p.imageUri.trim() : "";
          if (iu) {
            return iu;
          }
          const pan = p.panelImages;
          if (Array.isArray(pan)) {
            for (const cell of pan) {
              if (typeof cell === "string" && cell.trim()) {
                return cell.trim();
              }
            }
          }
        }
        return null;
      }
      /** Resolves the image URL for a panel (`panelIndex === -1` = full-page or first panel fallback). */
      async getComicPanelImage(comicId, userId, pageIndex, panelIndex) {
        const safePageIdx = Math.max(0, Math.min(512, Math.floor(pageIndex)));
        const safePanelIdx = Math.floor(panelIndex);
        const comic = await this.getUserComicById(comicId, userId);
        if (!comic?.pages || !Array.isArray(comic.pages)) {
          return null;
        }
        const page = comic.pages[safePageIdx];
        if (page == null || typeof page !== "object") {
          console.log(`Image not found: comic=${comicId}, page=${safePageIdx}, panel=${safePanelIdx}`);
          return null;
        }
        const p = page;
        if (safePanelIdx === -1) {
          const u = typeof p.imageUrl === "string" ? p.imageUrl.trim() : "";
          if (u) {
            return u;
          }
          const i = typeof p.imageUri === "string" ? p.imageUri.trim() : "";
          if (i) {
            return i;
          }
          const pan2 = p.panelImages;
          if (Array.isArray(pan2)) {
            for (const cell2 of pan2) {
              if (typeof cell2 === "string" && cell2.trim()) {
                return cell2.trim();
              }
            }
          }
          if (safePageIdx === 0) {
            const fromAny = this.firstNonEmptyImageFromPages(comic.pages);
            if (fromAny) {
              return fromAny;
            }
          }
          console.log(`Image not found: comic=${comicId}, page=${safePageIdx}, panel=${safePanelIdx}`);
          return null;
        }
        const pan = p.panelImages;
        if (!Array.isArray(pan) || safePanelIdx < 0 || safePanelIdx >= pan.length) {
          console.log(`Image not found: comic=${comicId}, page=${safePageIdx}, panel=${safePanelIdx}`);
          return null;
        }
        const cell = pan[safePanelIdx];
        const t = typeof cell === "string" && cell.trim() ? cell.trim() : "";
        if (!t) {
          console.log(`Image not found: comic=${comicId}, page=${safePageIdx}, panel=${safePanelIdx}`);
          return null;
        }
        return t;
      }
      /**
       * First available image URL in `pages` order (cover may be empty; skips blank slots).
       * Used for list thumbnails, not a specific page index.
       */
      async getComicFirstImageUrl(comicId, userId) {
        const comic = await this.getUserComicById(comicId, userId);
        if (!comic?.pages || !Array.isArray(comic.pages)) {
          return null;
        }
        return this.firstNonEmptyImageFromPages(comic.pages);
      }
      async createUserComic(userId, data) {
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          assertPersistedComicPagesAreAssetUrlsOnly(data.pages, "user_comics.insert");
        }
        const [comic] = await db.insert(userComics).values({
          userId,
          title: data.title,
          style: data.style,
          characterNames: data.characterNames,
          pages: data.pages,
          isDraft: data.isDraft ?? false
        }).returning();
        return comic;
      }
      async updateUserComic(id, userId, updates) {
        if (updates.pages !== void 0 && Array.isArray(updates.pages) && updates.pages.length > 0) {
          assertPersistedComicPagesAreAssetUrlsOnly(updates.pages, `user_comics.update:${id}`);
        }
        const updateData = { updatedAt: /* @__PURE__ */ new Date() };
        if (updates.title !== void 0)
          updateData.title = updates.title;
        if (updates.pages !== void 0)
          updateData.pages = updates.pages;
        if (updates.isDraft !== void 0)
          updateData.isDraft = updates.isDraft;
        const [comic] = await db.update(userComics).set(updateData).where(and(eq(userComics.id, id), eq(userComics.userId, userId))).returning();
        return comic || void 0;
      }
      async deleteUserComic(id, userId) {
        const result = await db.delete(userComics).where(and(eq(userComics.id, id), eq(userComics.userId, userId))).returning();
        return result.length > 0;
      }
      // Rate Limit Settings
      async getRateLimitSettings() {
        const [settings] = await db.select().from(rateLimitSettings).limit(1);
        if (!settings) {
          const [newSettings] = await db.insert(rateLimitSettings).values({
            maxGenerationsPerHour: 5,
            maxGenerationsPerDay: 20,
            enabled: true
          }).returning();
          return newSettings;
        }
        return settings;
      }
      async updateRateLimitSettings(updates) {
        const currentSettings = await this.getRateLimitSettings();
        const [updated] = await db.update(rateLimitSettings).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(rateLimitSettings.id, currentSettings.id)).returning();
        return updated;
      }
      // OAuth Settings
      async getOAuthSettings() {
        const [settings] = await db.select().from(oauthSettings).limit(1);
        if (!settings) {
          const [newSettings] = await db.insert(oauthSettings).values({
            googleWebClientId: null,
            googleIosClientId: null,
            googleAndroidClientId: null,
            enabled: false
          }).returning();
          return newSettings;
        }
        return settings;
      }
      async updateOAuthSettings(updates) {
        const currentSettings = await this.getOAuthSettings();
        const [updated] = await db.update(oauthSettings).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(oauthSettings.id, currentSettings.id)).returning();
        return updated;
      }
      // Check if user is rate limited
      async checkUserRateLimit(userId) {
        const settings = await this.getRateLimitSettings();
        if (!settings.enabled) {
          return { allowed: true, hourlyCount: 0, dailyCount: 0 };
        }
        const now = /* @__PURE__ */ new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1e3);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
        const hourlyLogs = await db.select().from(generationAuditLogs).where(
          and(
            eq(generationAuditLogs.userId, userId),
            eq(generationAuditLogs.action, "generation_started"),
            gte(generationAuditLogs.createdAt, oneHourAgo)
          )
        );
        const hourlyCount = hourlyLogs.length;
        const dailyLogs = await db.select().from(generationAuditLogs).where(
          and(
            eq(generationAuditLogs.userId, userId),
            eq(generationAuditLogs.action, "generation_started"),
            gte(generationAuditLogs.createdAt, oneDayAgo)
          )
        );
        const dailyCount = dailyLogs.length;
        if (hourlyCount >= settings.maxGenerationsPerHour) {
          return {
            allowed: false,
            reason: `Hourly limit reached (${settings.maxGenerationsPerHour}/hour)`,
            hourlyCount,
            dailyCount
          };
        }
        if (dailyCount >= settings.maxGenerationsPerDay) {
          return {
            allowed: false,
            reason: `Daily limit reached (${settings.maxGenerationsPerDay}/day)`,
            hourlyCount,
            dailyCount
          };
        }
        return { allowed: true, hourlyCount, dailyCount };
      }
      // Audit Logging
      async createAuditLog(data) {
        const [log2] = await db.insert(generationAuditLogs).values(data).returning();
        return log2;
      }
      async getAuditLogs(options) {
        let query = db.select().from(generationAuditLogs);
        const conditions = [];
        if (options?.userId) {
          conditions.push(eq(generationAuditLogs.userId, options.userId));
        }
        if (options?.action) {
          conditions.push(eq(generationAuditLogs.action, options.action));
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        const logs = await query.orderBy(desc(generationAuditLogs.createdAt)).limit(options?.limit || 100).offset(options?.offset || 0);
        const [countResult] = await db.select({ count: sql2`count(*)::int` }).from(generationAuditLogs);
        return { logs, total: countResult?.count || 0 };
      }
      async getAuditStats() {
        const now = /* @__PURE__ */ new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
        const [stats] = await db.select({
          totalGenerations: sql2`count(*) filter (where action = 'generation_started')::int`,
          successfulGenerations: sql2`count(*) filter (where action = 'generation_completed')::int`,
          failedGenerations: sql2`count(*) filter (where action = 'generation_failed')::int`,
          rateLimitedAttempts: sql2`count(*) filter (where action = 'rate_limited')::int`,
          insufficientCreditsAttempts: sql2`count(*) filter (where action = 'insufficient_credits')::int`
        }).from(generationAuditLogs);
        const [last24HoursResult] = await db.select({ count: sql2`count(*)::int` }).from(generationAuditLogs).where(
          and(
            eq(generationAuditLogs.action, "generation_started"),
            gte(generationAuditLogs.createdAt, oneDayAgo)
          )
        );
        const [last7DaysResult] = await db.select({ count: sql2`count(*)::int` }).from(generationAuditLogs).where(
          and(
            eq(generationAuditLogs.action, "generation_started"),
            gte(generationAuditLogs.createdAt, sevenDaysAgo)
          )
        );
        return {
          totalGenerations: stats?.totalGenerations || 0,
          successfulGenerations: stats?.successfulGenerations || 0,
          failedGenerations: stats?.failedGenerations || 0,
          rateLimitedAttempts: stats?.rateLimitedAttempts || 0,
          insufficientCreditsAttempts: stats?.insufficientCreditsAttempts || 0,
          last24Hours: last24HoursResult?.count || 0,
          last7Days: last7DaysResult?.count || 0
        };
      }
      // Referral System Functions
      generateReferralCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      }
      async generateUniqueReferralCode() {
        let attempts = 0;
        while (attempts < 100) {
          const code = this.generateReferralCode();
          const existing = await db.select().from(users).where(eq(users.referralCode, code));
          if (existing.length === 0) {
            return code;
          }
          attempts++;
        }
        throw new Error("Failed to generate unique referral code");
      }
      async setUserReferralCode(userId, code) {
        const [user] = await db.update(users).set({
          referralCode: code,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, userId)).returning();
        return user || void 0;
      }
      async getUserByReferralCode(code) {
        const [user] = await db.select().from(users).where(eq(users.referralCode, code));
        return user || void 0;
      }
      async setUserReferredBy(userId, referrerId) {
        const [user] = await db.update(users).set({
          referredBy: referrerId,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(users.id, userId)).returning();
        return user || void 0;
      }
      async getReferralSettings() {
        const [settings] = await db.select().from(referralSettings).limit(1);
        if (!settings) {
          const [newSettings] = await db.insert(referralSettings).values({
            inviterCredits: 50,
            inviteeCredits: 25,
            enabled: true
          }).returning();
          return newSettings;
        }
        return settings;
      }
      async updateReferralSettings(updates) {
        const currentSettings = await this.getReferralSettings();
        const [updated] = await db.update(referralSettings).set({
          ...updates,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(referralSettings.id, currentSettings.id)).returning();
        return updated;
      }
      async createReferralBounty(data) {
        const [bounty] = await db.insert(referralBounties).values({
          name: data.name,
          description: data.description || null,
          userIds: data.userIds,
          bonusInviterCredits: data.bonusInviterCredits,
          bonusInviteeCredits: data.bonusInviteeCredits,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          enabled: true
        }).returning();
        return bounty;
      }
      async updateReferralBounty(id, updates) {
        const [bounty] = await db.update(referralBounties).set({
          ...updates,
          updatedAt: sql2`CURRENT_TIMESTAMP`
        }).where(eq(referralBounties.id, id)).returning();
        return bounty || void 0;
      }
      async deleteReferralBounty(id) {
        const result = await db.delete(referralBounties).where(eq(referralBounties.id, id)).returning();
        return result.length > 0;
      }
      async getAllReferralBounties() {
        return await db.select().from(referralBounties).orderBy(desc(referralBounties.createdAt));
      }
      async getActiveBountyForUser(userId) {
        const now = /* @__PURE__ */ new Date();
        const bounties = await db.select().from(referralBounties).where(eq(referralBounties.enabled, true));
        for (const bounty of bounties) {
          const userIds = bounty.userIds;
          if (userIds.includes(userId) && new Date(bounty.startsAt) <= now && new Date(bounty.endsAt) >= now) {
            return bounty;
          }
        }
        return void 0;
      }
      async createReferralHistory(data) {
        const [history] = await db.insert(referralHistory).values({
          inviterId: data.inviterId,
          inviterEmail: data.inviterEmail,
          inviteeId: data.inviteeId,
          inviteeEmail: data.inviteeEmail,
          referralCode: data.referralCode,
          inviterCreditsAwarded: data.inviterCreditsAwarded,
          inviteeCreditsAwarded: data.inviteeCreditsAwarded,
          bountyId: data.bountyId || null,
          status: data.status
        }).returning();
        return history;
      }
      async getReferralHistory(options) {
        let query = db.select().from(referralHistory);
        if (options?.inviterId) {
          query = query.where(eq(referralHistory.inviterId, options.inviterId));
        }
        const history = await query.orderBy(desc(referralHistory.createdAt)).limit(options?.limit || 100).offset(options?.offset || 0);
        const [countResult] = await db.select({ count: sql2`count(*)::int` }).from(referralHistory);
        return { history, total: countResult?.count || 0 };
      }
      async getReferralStats() {
        const allHistory = await db.select().from(referralHistory);
        const totalReferrals = allHistory.length;
        const completedReferrals = allHistory.filter((h) => h.status === "completed").length;
        const totalCreditsAwarded = allHistory.reduce((sum, h) => sum + (h.inviterCreditsAwarded || 0) + (h.inviteeCreditsAwarded || 0), 0);
        return { totalReferrals, completedReferrals, totalCreditsAwarded };
      }
      async getUserReferralStats(userId) {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        const history = await db.select().from(referralHistory).where(eq(referralHistory.inviterId, userId));
        const completedReferrals = history.filter((h) => h.status === "completed");
        const creditsEarned = completedReferrals.reduce((sum, h) => sum + (h.inviterCreditsAwarded || 0), 0);
        return {
          referralCode: user?.referralCode || null,
          totalReferrals: completedReferrals.length,
          creditsEarned
        };
      }
      // Internal Ads Methods
      async getAdSettings() {
        const [settings] = await db.select().from(adSettings).limit(1);
        if (!settings) {
          const [newSettings] = await db.insert(adSettings).values({
            maxImpressionsPerHour: 3,
            maxImpressionsPerDay: 10,
            enabled: true,
            exemptSubscribers: true
          }).returning();
          return newSettings;
        }
        return settings;
      }
      async updateAdSettings(updates) {
        const currentSettings = await this.getAdSettings();
        const [updated] = await db.update(adSettings).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(adSettings.id, currentSettings.id)).returning();
        return updated;
      }
      async getAllAds() {
        return await db.select().from(internalAds).orderBy(desc(internalAds.createdAt));
      }
      async getActiveAds(type) {
        if (type) {
          return await db.select().from(internalAds).where(and(eq(internalAds.isActive, true), eq(internalAds.type, type)));
        }
        return await db.select().from(internalAds).where(eq(internalAds.isActive, true));
      }
      async getAdById(id) {
        const [ad] = await db.select().from(internalAds).where(eq(internalAds.id, id));
        return ad || void 0;
      }
      async createAd(data) {
        const [ad] = await db.insert(internalAds).values({
          type: data.type,
          title: data.title,
          content: data.content,
          imageUrl: data.imageUrl,
          linkUrl: data.linkUrl,
          isActive: data.isActive ?? true
        }).returning();
        return ad;
      }
      async updateAd(id, updates) {
        const [updated] = await db.update(internalAds).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(internalAds.id, id)).returning();
        return updated || void 0;
      }
      async deleteAd(id) {
        const result = await db.delete(internalAds).where(eq(internalAds.id, id));
        return true;
      }
      async recordAdImpression(userId, adId) {
        await db.insert(adImpressions).values({
          userId,
          adId
        });
      }
      async canShowAd(userId, isSubscriber) {
        const settings = await this.getAdSettings();
        if (!settings.enabled) {
          return { allowed: false, reason: "Ads are disabled" };
        }
        if (isSubscriber && settings.exemptSubscribers) {
          return { allowed: false, reason: "Subscribers are exempt from ads" };
        }
        const now = /* @__PURE__ */ new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1e3);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
        const hourlyImpressions = await db.select().from(adImpressions).where(
          and(
            eq(adImpressions.userId, userId),
            gte(adImpressions.createdAt, oneHourAgo)
          )
        );
        if (hourlyImpressions.length >= settings.maxImpressionsPerHour) {
          return { allowed: false, reason: "Hourly impression limit reached" };
        }
        const dailyImpressions = await db.select().from(adImpressions).where(
          and(
            eq(adImpressions.userId, userId),
            gte(adImpressions.createdAt, oneDayAgo)
          )
        );
        if (dailyImpressions.length >= settings.maxImpressionsPerDay) {
          return { allowed: false, reason: "Daily impression limit reached" };
        }
        return { allowed: true };
      }
      async getRandomAd(type) {
        const ads = await this.getActiveAds(type);
        if (ads.length === 0)
          return null;
        return ads[Math.floor(Math.random() * ads.length)];
      }
      // Push Notification Functions
      async registerPushToken(userId, token, platform, deviceName) {
        const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, token));
        if (existing.length > 0) {
          const [updated] = await db.update(pushTokens).set({
            userId,
            platform,
            deviceName,
            isActive: true,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(pushTokens.token, token)).returning();
          return updated;
        }
        const [created] = await db.insert(pushTokens).values({
          userId,
          token,
          platform,
          deviceName,
          isActive: true
        }).returning();
        return created;
      }
      async unregisterPushToken(token) {
        await db.update(pushTokens).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(pushTokens.token, token));
        return true;
      }
      async getUserPushTokens(userId) {
        return await db.select().from(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
      }
      async getAllActivePushTokens() {
        return await db.select().from(pushTokens).where(eq(pushTokens.isActive, true));
      }
      async getActiveTokenCount() {
        const result = await db.select({ count: sql2`count(*)` }).from(pushTokens).where(eq(pushTokens.isActive, true));
        return result[0]?.count || 0;
      }
      // Notification Preferences
      async getNotificationPreferences(userId) {
        const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
        return prefs || null;
      }
      async updateNotificationPreferences(userId, updates) {
        const existing = await this.getNotificationPreferences(userId);
        if (existing) {
          const [updated] = await db.update(notificationPreferences).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(notificationPreferences.userId, userId)).returning();
          return updated;
        }
        const [created] = await db.insert(notificationPreferences).values({
          userId,
          ...updates
        }).returning();
        return created;
      }
      // Notification History
      async logNotification(userId, type, title, body, status = "sent", data, errorMessage) {
        const [entry] = await db.insert(notificationHistory).values({
          userId,
          type,
          title,
          body,
          status,
          data,
          errorMessage
        }).returning();
        return entry;
      }
      async getNotificationHistory(limit = 100, offset = 0) {
        return await db.select().from(notificationHistory).orderBy(desc(notificationHistory.createdAt)).limit(limit).offset(offset);
      }
      // Notification Settings (Admin)
      async getNotificationSettings() {
        const [settings] = await db.select().from(notificationSettings);
        if (settings)
          return settings;
        const [created] = await db.insert(notificationSettings).values({
          enabled: true,
          lowCreditsThreshold: 20
        }).returning();
        return created;
      }
      async updateNotificationSettings(updates) {
        const current = await this.getNotificationSettings();
        const [updated] = await db.update(notificationSettings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(notificationSettings.id, current.id)).returning();
        return updated;
      }
      // Art Styles
      async getArtStyles() {
        return await db.select().from(artStyles).orderBy(artStyles.displayOrder);
      }
      async getArtStyleSettings() {
        const [settings] = await db.select().from(artStyleSettings);
        if (!settings) {
          const [newSettings] = await db.insert(artStyleSettings).values({}).returning();
          return newSettings;
        }
        return settings;
      }
      async updateArtStyleSettings(updates) {
        const existing = await this.getArtStyleSettings();
        const [settings] = await db.update(artStyleSettings).set({ ...updates, updatedAt: sql2`CURRENT_TIMESTAMP` }).where(eq(artStyleSettings.id, existing.id)).returning();
        return settings;
      }
      async createArtStyle(data) {
        const [style] = await db.insert(artStyles).values(data).returning();
        return style;
      }
      async updateArtStyle(id, updates) {
        const [style] = await db.update(artStyles).set({ ...updates, updatedAt: sql2`CURRENT_TIMESTAMP` }).where(eq(artStyles.id, id)).returning();
        return style;
      }
      async deleteArtStyle(id) {
        const result = await db.delete(artStyles).where(eq(artStyles.id, id));
        return true;
      }
      async seedDefaultArtStyles() {
        const existing = await db.select().from(artStyles);
        if (existing.length > 0)
          return;
        const defaults = [
          { name: "Comic", displayOrder: 0, isPremium: false, unlockCost: 0 },
          { name: "Manga", displayOrder: 1, isPremium: false, unlockCost: 0 },
          { name: "Manhwa", displayOrder: 2, isPremium: false, unlockCost: 0 },
          { name: "Graphic", displayOrder: 3, isPremium: true, unlockCost: 100 },
          { name: "Kawaii", displayOrder: 4, isPremium: true, unlockCost: 100 },
          { name: "Noir", displayOrder: 5, isPremium: true, unlockCost: 100 },
          { name: "Anime", displayOrder: 6, isPremium: true, unlockCost: 100 },
          { name: "Afro", displayOrder: 7, isPremium: true, unlockCost: 100 }
        ];
        for (const style of defaults) {
          await db.insert(artStyles).values(style);
        }
      }
      async getUserUnlockedStyles(userId) {
        return await db.select().from(userUnlockedStyles).where(eq(userUnlockedStyles.userId, userId));
      }
      async hasUserUnlockedAllStyles(userId) {
        const [result] = await db.select().from(userUnlockedStyles).where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.allStylesUnlocked, true)));
        return !!result;
      }
      async unlockStyleForUser(userId, styleId) {
        const [existing] = await db.select().from(userUnlockedStyles).where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.styleId, styleId)));
        if (existing)
          return existing;
        const [unlocked] = await db.insert(userUnlockedStyles).values({ userId, styleId }).returning();
        return unlocked;
      }
      async unlockAllStylesForUser(userId) {
        const [existing] = await db.select().from(userUnlockedStyles).where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.allStylesUnlocked, true)));
        if (existing)
          return existing;
        const [unlocked] = await db.insert(userUnlockedStyles).values({ userId, allStylesUnlocked: true }).returning();
        return unlocked;
      }
      async revokeUserStyle(userId, styleId) {
        await db.delete(userUnlockedStyles).where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.styleId, styleId)));
      }
      async revokeAllUserStyles(userId) {
        await db.delete(userUnlockedStyles).where(eq(userUnlockedStyles.userId, userId));
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/worker.ts
import "dotenv/config";
import { waitUntil } from "@vercel/functions";
function isWorkerCli() {
  return process.argv.some(
    (arg) => /[/\\]server[/\\]worker\.(ts|js)$/.test(arg)
  );
}
function pollMs() {
  const n = parseInt(process.env.WORKER_POLL_MS || String(DEFAULT_POLL_MS), 10);
  return Number.isFinite(n) && n >= 250 ? n : DEFAULT_POLL_MS;
}
function staleMs() {
  const n = parseInt(process.env.JOB_STALE_MS || String(DEFAULT_STALE_MS), 10);
  return Number.isFinite(n) && n >= 1e3 ? n : DEFAULT_STALE_MS;
}
function sleep2(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function importWorkerDeps() {
  const { and: and3, eq: eq3, isNull, lt, or, sql: sql3 } = await import("drizzle-orm");
  const { db: db2, waitForDatabase: waitForDatabase2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const { comicJobs: comicJobs2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
  const { ensureAiSettingsLoaded: ensureAiSettingsLoaded2, processComicJob: processComicJob2, refundCreditsForFailedJob: refundCreditsForFailedJob2, requeuePayloadAfterStall: requeuePayloadAfterStall2 } = await Promise.resolve().then(() => (init_routes(), routes_exports));
  return {
    db: db2,
    comicJobs: comicJobs2,
    storage: storage2,
    processComicJob: processComicJob2,
    refundCreditsForFailedJob: refundCreditsForFailedJob2,
    ensureAiSettingsLoaded: ensureAiSettingsLoaded2,
    requeuePayloadAfterStall: requeuePayloadAfterStall2,
    waitForDatabase: waitForDatabase2,
    and: and3,
    eq: eq3,
    isNull,
    lt,
    or,
    sql: sql3
  };
}
function loadDeps() {
  if (!depsPromise) {
    depsPromise = importWorkerDeps();
  }
  return depsPromise;
}
function isGeneratePayload(value) {
  if (!value || typeof value !== "object")
    return false;
  const row = value;
  return typeof row.storyPrompt === "string" && typeof row.style === "string";
}
async function abandonProcessingJob(deps, jobId, message, staleCutoff) {
  const { and: and3, eq: eq3, isNull, lt, or, db: db2, comicJobs: comicJobs2, storage: storage2, refundCreditsForFailedJob: refundCreditsForFailedJob2 } = deps;
  const staleClause = staleCutoff !== void 0 ? or(isNull(comicJobs2.heartbeatAt), lt(comicJobs2.heartbeatAt, staleCutoff)) : void 0;
  const updated = await db2.update(comicJobs2).set({
    status: "failed",
    error: message,
    pages: [],
    updatedAt: /* @__PURE__ */ new Date()
  }).where(
    staleClause ? and3(eq3(comicJobs2.id, jobId), eq3(comicJobs2.status, "processing"), staleClause) : and3(eq3(comicJobs2.id, jobId), eq3(comicJobs2.status, "processing"))
  ).returning({
    id: comicJobs2.id,
    userId: comicJobs2.userId,
    libraryComicId: comicJobs2.libraryComicId,
    progress: comicJobs2.progress,
    pagesCount: comicJobs2.pagesCount,
    title: comicJobs2.title,
    style: comicJobs2.style,
    createdAt: comicJobs2.createdAt
  });
  if (updated.length === 0)
    return;
  const job = updated[0];
  const draftId = job.libraryComicId;
  if (draftId != null) {
    await db2.update(comicJobs2).set({ libraryComicId: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(comicJobs2.id, jobId));
  }
  if (job.userId && draftId != null) {
    await storage2.deleteUserComic(draftId, job.userId).catch(() => {
    });
  }
  await refundCreditsForFailedJob2({
    id: job.id,
    userId: job.userId ?? void 0,
    status: "failed",
    progress: job.progress,
    pages: [],
    pagesCount: job.pagesCount ?? void 0,
    title: job.title ?? void 0,
    style: job.style ?? void 0,
    createdAt: new Date(job.createdAt).getTime()
  });
}
async function failStaleJobs(deps, limit, staleOverrideMs) {
  const { and: and3, eq: eq3, isNull, lt, or, db: db2, comicJobs: comicJobs2, requeuePayloadAfterStall: requeuePayloadAfterStall2 } = deps;
  const cutoff = new Date(Date.now() - (staleOverrideMs ?? staleMs()));
  const stale = await db2.select({
    id: comicJobs2.id,
    heartbeatAt: comicJobs2.heartbeatAt,
    requestPayload: comicJobs2.requestPayload
  }).from(comicJobs2).where(
    and3(
      eq3(comicJobs2.status, "processing"),
      or(isNull(comicJobs2.heartbeatAt), lt(comicJobs2.heartbeatAt, cutoff))
    )
  );
  const batch = limit === void 0 ? stale : stale.slice(0, limit);
  for (const job of batch) {
    const nextPayload = requeuePayloadAfterStall2(job.requestPayload);
    if (!nextPayload) {
      console.log(`[worker] Stale job ${job.id} cannot resume; failing it`);
      await abandonProcessingJob(deps, job.id, "Generation stalled. Please try again.", cutoff);
      continue;
    }
    const released = await db2.update(comicJobs2).set({
      status: "pending",
      requestPayload: nextPayload,
      error: null,
      heartbeatAt: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and3(
        eq3(comicJobs2.id, job.id),
        eq3(comicJobs2.status, "processing"),
        or(isNull(comicJobs2.heartbeatAt), lt(comicJobs2.heartbeatAt, cutoff))
      )
    ).returning({ id: comicJobs2.id });
    if (released.length > 0) {
      console.log(`[worker] Requeued stale job ${job.id} for the next step`);
    }
  }
}
async function claimPendingJob(deps) {
  const result = await deps.db.execute(deps.sql`
    UPDATE comic_jobs
    SET status = 'processing',
        heartbeat_at = NOW(),
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM comic_jobs
      WHERE status = 'pending'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, request_payload
  `);
  const rows = result.rows;
  return rows[0] ?? null;
}
async function runClaimedJob(deps, claimed, options) {
  if (!isGeneratePayload(claimed.request_payload)) {
    console.error(`[worker] Job ${claimed.id} has no generation payload`);
    await abandonProcessingJob(deps, claimed.id, "Generation request was missing. Please try again.");
    return;
  }
  console.log(`[worker] Claimed job ${claimed.id}`);
  const beat = setInterval(() => {
    void deps.db.update(deps.comicJobs).set({ heartbeatAt: /* @__PURE__ */ new Date() }).where(deps.eq(deps.comicJobs.id, claimed.id)).catch((error) => {
      console.error(`[worker] Heartbeat failed for ${claimed.id}:`, error);
    });
  }, HEARTBEAT_MS);
  try {
    await deps.processComicJob(claimed.id, claimed.request_payload, options);
  } catch (error) {
    console.error(`[worker] Job ${claimed.id} crashed:`, error);
    await abandonProcessingJob(deps, claimed.id, "Generation failed. Please try again.");
  } finally {
    clearInterval(beat);
  }
}
async function runBoundedServerlessStep() {
  const deps = await loadDeps();
  const ready = await deps.waitForDatabase();
  if (!ready) {
    console.error("[worker] Database unavailable.");
    return;
  }
  try {
    await deps.ensureAiSettingsLoaded();
  } catch (error) {
    console.error("[worker] Failed to load AI settings:", error);
    return;
  }
  await failStaleJobs(deps, SERVERLESS_STALE_LIMIT, SERVERLESS_STALE_MS);
  const claimed = await claimPendingJob(deps);
  if (!claimed)
    return;
  await runClaimedJob(deps, claimed, { maxSteps: 1 });
}
async function drainComicJobs() {
  const deps = await loadDeps();
  const ready = await deps.waitForDatabase();
  if (!ready) {
    console.error("[worker] Database unavailable.");
    return;
  }
  try {
    await deps.ensureAiSettingsLoaded();
  } catch (error) {
    console.error("[worker] Failed to load AI settings:", error);
    return;
  }
  await failStaleJobs(deps);
  for (; ; ) {
    const claimed = await claimPendingJob(deps);
    if (!claimed)
      return;
    await runClaimedJob(deps, claimed);
  }
}
function scheduleComicWorker() {
  if (activePass)
    return;
  const task = (process.env.VERCEL ? runBoundedServerlessStep() : drainComicJobs()).catch((error) => {
    console.error("[worker] Pass failed:", error);
  }).finally(() => {
    activePass = null;
  });
  activePass = task;
  if (process.env.VERCEL) {
    try {
      waitUntil(task);
    } catch (error) {
      console.error("[worker] waitUntil failed:", error);
    }
  }
}
async function main() {
  const deps = await loadDeps();
  const ready = await deps.waitForDatabase();
  if (!ready) {
    console.error("[worker] Database unavailable. Exiting.");
    process.exit(1);
  }
  try {
    await deps.ensureAiSettingsLoaded();
  } catch (error) {
    console.error("[worker] Failed to load AI settings:", error);
    process.exit(1);
  }
  console.log("[worker] Comic generation worker started");
  for (; ; ) {
    try {
      await failStaleJobs(deps);
      const claimed = await claimPendingJob(deps);
      if (!claimed) {
        await sleep2(pollMs());
        continue;
      }
      await runClaimedJob(deps, claimed);
    } catch (error) {
      console.error("[worker] Loop error:", error);
      await sleep2(pollMs());
    }
  }
}
var DEFAULT_POLL_MS, DEFAULT_STALE_MS, HEARTBEAT_MS, depsPromise, SERVERLESS_STALE_LIMIT, SERVERLESS_STALE_MS, activePass;
var init_worker = __esm({
  "server/worker.ts"() {
    "use strict";
    if (isWorkerCli()) {
      process.env.COMIC_WORKER = "1";
    }
    DEFAULT_POLL_MS = 2e3;
    DEFAULT_STALE_MS = 18e4;
    HEARTBEAT_MS = 3e4;
    depsPromise = null;
    SERVERLESS_STALE_LIMIT = 5;
    SERVERLESS_STALE_MS = 75e3;
    activePass = null;
    if (isWorkerCli()) {
      void main().catch((error) => {
        console.error("[worker] Fatal:", error);
        process.exit(1);
      });
    }
  }
});

// server/email.ts
import { Resend } from "resend";
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return {
    client: new Resend(apiKey),
    fromEmail: FROM_EMAIL
  };
}
async function sendVerificationEmail(to, verificationCode, verificationUrl) {
  try {
    const { client, fromEmail } = getResendClient();
    console.log(`Attempting to send verification email to: ${to}`);
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: "Verify your email - AI Storiz",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">AI Storiz</h1>
              <p style="color: #666; margin-top: 8px;">Verify your email address</p>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Welcome to AI Storiz! Please use the verification code below to confirm your email address:
            </p>
            
            <div style="background: #E6FFF2; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #00D66A; letter-spacing: 8px;">${verificationCode}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              This code expires in 24 hours.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 32px; text-align: center;">
              If you didn't create an AI Storiz account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `
    });
    console.log("Verification email sent:", result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: error.message };
  }
}
async function sendPasswordResetEmail(to, resetCode, resetUrl) {
  try {
    const { client, fromEmail } = getResendClient();
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: "Reset your password - AI Storiz",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">AI Storiz</h1>
              <p style="color: #666; margin-top: 8px;">Password Reset Request</p>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Use the code below to set a new password:
            </p>
            
            <div style="background: #FFF9E6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #E5A800; letter-spacing: 8px;">${resetCode}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              This code expires in 1 hour.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 32px; text-align: center;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
        </html>
      `
    });
    console.log("Password reset email sent:", result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: error.message };
  }
}
async function sendWelcomeEmail(to) {
  try {
    const { client, fromEmail } = getResendClient();
    const result = await client.emails.send({
      from: `AI Storiz <${fromEmail}>`,
      to: [to],
      subject: "Welcome to AI Storiz!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF6F1; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00D66A; margin: 0; font-size: 28px;">Welcome to AI Storiz!</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your email has been verified. You're all set to create amazing AI-powered comics!
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              You've received <strong>20 free credits</strong> to get started. Here's what you can do:
            </p>
            
            <ul style="color: #333; font-size: 16px; line-height: 1.8;">
              <li>Create multi-page comic stories</li>
              <li>Choose from Comic, Manga, or Manhwa styles</li>
              <li>Add your own characters</li>
              <li>Export as PDF, JPG, or ZIP</li>
            </ul>
            
            <p style="color: #666; font-size: 14px; margin-top: 32px; text-align: center;">
              Happy creating!<br>The AI Storiz Team
            </p>
          </div>
        </body>
        </html>
      `
    });
    console.log("Welcome email sent:", result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: error.message };
  }
}
var configuredFrom, FROM_EMAIL;
var init_email = __esm({
  "server/email.ts"() {
    "use strict";
    configuredFrom = process.env.RESEND_FROM_EMAIL?.trim();
    FROM_EMAIL = configuredFrom && configuredFrom.toLowerCase() !== "fiocreativesolutions@gmail.com" ? configuredFrom : "noreply@fiocreatives.com";
  }
});

// server/notifications.ts
import expoSdk from "expo-server-sdk";
function resolveExpoConstructor() {
  const m = expoSdk;
  if (typeof m === "function")
    return m;
  if (m && typeof m === "object") {
    const o = m;
    const C = o.default ?? o.Expo;
    if (typeof C === "function")
      return C;
  }
  throw new Error("Could not load Expo client from expo-server-sdk");
}
async function sendPushNotification(userId, payload, type = "general") {
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
    const messages = [];
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
        data: payload.data || {}
      });
    }
    if (messages.length === 0) {
      return { success: false, error: "No valid push tokens found" };
    }
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
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
      failCount > 0 ? `${failCount} of ${tickets.length} failed` : void 0
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
async function sendBroadcastNotification(payload, type = "broadcast") {
  try {
    const settings = await storage.getNotificationSettings();
    if (!settings.enabled) {
      return { success: false, sent: 0, failed: 0 };
    }
    const allTokens = await storage.getAllActivePushTokens();
    if (allTokens.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }
    const messages = [];
    for (const tokenRecord of allTokens) {
      if (!Expo.isExpoPushToken(tokenRecord.token)) {
        continue;
      }
      messages.push({
        to: tokenRecord.token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data || {}
      });
    }
    if (messages.length === 0) {
      return { success: false, sent: 0, failed: 0 };
    }
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
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
      failCount > 0 ? `${failCount} of ${tickets.length} failed` : void 0
    );
    return { success: successCount > 0, sent: successCount, failed: failCount };
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    return { success: false, sent: 0, failed: 0 };
  }
}
async function sendComicCompleteNotification(userId, comicTitle, comicId) {
  return sendPushNotification(
    userId,
    {
      title: "Your Comic is Ready!",
      body: `"${comicTitle}" has finished generating. Tap to view!`,
      data: { screen: "comic", comicId }
    },
    "comic_complete"
  );
}
var Expo, expo;
var init_notifications = __esm({
  "server/notifications.ts"() {
    "use strict";
    init_storage();
    Expo = resolveExpoConstructor();
    expo = new Expo();
  }
});

// server/routes.ts
var routes_exports = {};
__export(routes_exports, {
  ensureAiSettingsLoaded: () => ensureAiSettingsLoaded,
  processComicJob: () => processComicJob,
  refundCreditsForFailedJob: () => refundCreditsForFailedJob,
  registerRoutes: () => registerRoutes,
  requeuePayloadAfterStall: () => requeuePayloadAfterStall
});
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt2 from "bcryptjs";
import jwt from "jsonwebtoken";
import { and as and2, eq as eq2 } from "drizzle-orm";
function sanitizeStoryPrompt(raw) {
  if (typeof raw !== "string")
    return "";
  let s = raw.trim();
  s = s.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s.slice(0, MAX_STORY_PROMPT_LENGTH);
}
function getBase64ImageSize(dataUri) {
  if (!dataUri || typeof dataUri !== "string")
    return null;
  const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match)
    return null;
  try {
    return Buffer.byteLength(match[1], "base64");
  } catch {
    return null;
  }
}
function detectImageMimeType(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bytes.length < 12)
    return null;
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    return "image/png";
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return "image/jpeg";
  }
  if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return "image/webp";
  }
  if (bytes[0] === 71 && bytes[1] === 73 && bytes[2] === 70) {
    return "image/gif";
  }
  return null;
}
async function createUserComicS3Only(userId, data) {
  assertComicS3Configured();
  const row = await storage.createUserComic(userId, {
    title: data.title,
    style: data.style,
    characterNames: data.characterNames,
    pages: [],
    isDraft: false
  });
  try {
    const ingested = await ingestComicPagesToS3(userId, row.id, data.pages);
    const { pages: normalizedPages } = normalizeComicPagesOrder(ingested);
    const updated = await storage.updateUserComic(row.id, userId, { pages: normalizedPages });
    if (!updated) {
      throw new ComicS3Error("Failed to persist comic pages after S3 ingest");
    }
    return updated;
  } catch (e) {
    await storage.deleteUserComic(row.id, userId).catch(() => {
    });
    throw e;
  }
}
function comicPagesContainNonAssetImages(pages) {
  if (!Array.isArray(pages)) {
    return false;
  }
  for (const raw of pages) {
    if (raw == null || typeof raw !== "object") {
      continue;
    }
    const p = raw;
    const u1 = typeof p.imageUrl === "string" ? p.imageUrl.trim() : "";
    if (u1 && !isComicAssetUrl(u1)) {
      return true;
    }
    const u2 = typeof p.imageUri === "string" ? p.imageUri.trim() : "";
    if (u2 && !isComicAssetUrl(u2)) {
      return true;
    }
    const pan = p.panelImages;
    if (Array.isArray(pan)) {
      for (const c of pan) {
        if (typeof c === "string" && c.trim() && !isComicAssetUrl(c)) {
          return true;
        }
      }
    }
  }
  return false;
}
async function tryIngestJobPagesToS3BeforeDiscard(job) {
  if (!job.userId || job.libraryComicId == null || !comicPagesContainNonAssetImages(job.pages)) {
    return;
  }
  try {
    await syncJobPagesToS3Library(job);
  } catch (e) {
    console.error("[comic-job] Failed to ingest pages to S3 before discarding draft:", e);
  }
}
async function ensureLibraryComicDraftForJob(job, params) {
  if (!job.userId || job.libraryComicId != null) {
    return;
  }
  assertComicS3Configured();
  const row = await storage.createUserComic(job.userId, {
    title: params.title || job.title || "Untitled Comic",
    style: params.style || job.style || "Comic",
    characterNames: params.characterNames,
    pages: [],
    isDraft: true
  });
  job.libraryComicId = row.id;
}
async function syncJobPagesToS3Library(job, opts) {
  if (!job.userId || job.libraryComicId == null) {
    return;
  }
  if (!Array.isArray(job.pages) || job.pages.length === 0) {
    return;
  }
  assertComicS3Configured();
  const pagesSnapshot = job.pages;
  const needIngest = comicPagesNeedS3Ingest(pagesSnapshot);
  const ingested = await ingestComicPagesToS3(job.userId, job.libraryComicId, pagesSnapshot);
  const { pages: normalizedPages, changed: pagesOrderChanged } = normalizeComicPagesOrder(ingested);
  const titleNow = job.title || "Untitled Comic";
  const titleAlreadyOnLibraryRow = job.libraryRowTitleSynced === titleNow;
  if (!needIngest && !pagesOrderChanged && !opts?.publish && titleAlreadyOnLibraryRow) {
    job.pages = normalizedPages;
    return;
  }
  await storage.updateUserComic(job.libraryComicId, job.userId, {
    title: titleNow,
    pages: normalizedPages,
    ...opts?.publish ? { isDraft: false } : {}
  });
  job.libraryRowTitleSynced = titleNow;
  job.pages = normalizedPages;
}
async function discardLibraryComicDraftIfUnused(job) {
  if (!job.userId || job.libraryComicId == null || job.savedToLibrary) {
    return;
  }
  await storage.deleteUserComic(job.libraryComicId, job.userId).catch(() => {
  });
  job.libraryComicId = void 0;
}
function requiredProductionSecret(name, devFallback) {
  const value = process.env[name]?.trim();
  if (value)
    return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set in production`);
  }
  return devFallback;
}
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
function generateVerificationCode() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function generateAdminToken() {
  const token = crypto.randomBytes(32).toString("hex");
  adminTokens.add(token);
  return token;
}
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return false;
  const token = authHeader.slice(7);
  return adminTokens.has(token);
}
function requireAdminAuth(req, res, next) {
  if (verifyAdminToken(req)) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}
function generateUserToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}
function getUserIdFromToken(req) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token)
    return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}
function requireUserAuth(req, res, next) {
  const userId = getUserIdFromToken(req);
  if (userId) {
    req.userId = userId;
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}
async function requireEmailVerified(req, res, next) {
  const userId = req.userId;
  if (!userId)
    return res.status(401).json({ error: "Authentication required" });
  const user = await storage.getUser(userId);
  if (!user)
    return res.status(401).json({ error: "User not found" });
  if (!user.emailVerified) {
    return res.status(403).json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" });
  }
  next();
}
function buildDefaultSettings() {
  const defaultSettings = {
    openai: {
      enabled: false,
      apiKey: "",
      isDefault: false
    },
    replicate: {
      enabled: false,
      apiKey: "",
      isDefault: false,
      models: {
        fluxSchnell: {
          enabled: true,
          modelId: "black-forest-labs/flux-schnell",
          cost: "$0.003/image"
        },
        flux11Pro: {
          enabled: false,
          modelId: "black-forest-labs/flux-1.1-pro",
          cost: "$0.04/image"
        },
        fluxKontextDev: {
          enabled: true,
          modelId: "black-forest-labs/flux-kontext-dev",
          cost: "$0.025/image"
        },
        consistentCharacter: {
          enabled: false,
          modelId: "fofr/consistent-character",
          cost: "$0.062/image"
        }
      },
      defaultModel: "fluxSchnell"
    },
    siliconflow: {
      enabled: false,
      apiKey: "",
      isDefault: false,
      models: {
        fluxKontextDev: {
          enabled: true,
          modelId: "black-forest-labs/FLUX.1-Kontext-dev",
          cost: "$0.015/image"
        },
        fluxKontextPro: {
          enabled: false,
          modelId: "black-forest-labs/FLUX.1-Kontext-pro",
          cost: "$0.04/image"
        }
      },
      defaultModel: "fluxKontextDev"
    },
    flux2pro: {
      enabled: false,
      apiKey: "",
      isDefault: false,
      models: {
        flux2Pro: {
          enabled: true,
          modelId: "black-forest-labs/flux-2-pro",
          cost: "$0.03/image"
        },
        flux2Flex: {
          enabled: false,
          modelId: "black-forest-labs/flux-2-flex",
          cost: "$0.06/MP"
        }
      },
      defaultModel: "flux2Pro"
    },
    stability: { enabled: false, apiKey: "", isDefault: false },
    geminiImage: {
      enabled: false,
      apiKey: "",
      model: "gemini-2.5-flash-image",
      models: {
        gemini25Flash: {
          enabled: true,
          modelId: "gemini-2.5-flash-image",
          cost: "$0.039/image (500 free/day)"
        },
        gemini3Pro: {
          enabled: false,
          modelId: "gemini-3-pro-image-preview",
          cost: "$0.039/image"
        }
      },
      defaultModel: "gemini25Flash"
    },
    defaultProvider: "openai",
    fallbackProvider: null,
    panelGenerationProvider: "siliconflow",
    comicGenerationMode: "multi-model",
    storyTextProvider: {
      provider: "openai",
      openaiModel: "gpt-4o",
      geminiModel: "gemini-2.0-flash",
      geminiApiKey: "",
      replicateModel: "meta/meta-llama-3-70b-instruct"
    }
  };
  return defaultSettings;
}
function mergeStoredSettings(stored) {
  const defaultSettings = buildDefaultSettings();
  if (!stored)
    return defaultSettings;
  const merged = { ...defaultSettings, ...stored };
  if (stored.replicate) {
    merged.replicate = {
      ...defaultSettings.replicate,
      ...stored.replicate,
      models: {
        ...defaultSettings.replicate.models,
        ...stored.replicate.models || {}
      }
    };
  }
  if (stored.siliconflow) {
    merged.siliconflow = {
      ...defaultSettings.siliconflow,
      ...stored.siliconflow,
      models: {
        ...defaultSettings.siliconflow.models,
        ...stored.siliconflow.models || {}
      }
    };
  }
  if (stored.flux2pro) {
    merged.flux2pro = {
      ...defaultSettings.flux2pro,
      ...stored.flux2pro,
      models: {
        ...defaultSettings.flux2pro.models,
        ...stored.flux2pro.models || {}
      }
    };
  }
  if (stored.geminiImage) {
    merged.geminiImage = {
      ...defaultSettings.geminiImage,
      ...stored.geminiImage,
      models: {
        ...defaultSettings.geminiImage.models,
        ...stored.geminiImage.models || {}
      }
    };
  }
  if (stored.storyTextProvider) {
    merged.storyTextProvider = {
      ...defaultSettings.storyTextProvider,
      ...stored.storyTextProvider
    };
  }
  return merged;
}
function readLegacySettingsFile() {
  try {
    if (!fs.existsSync(SETTINGS_FILE))
      return null;
    const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    console.log("[ai-settings] Importing .ai-settings.json into ai_settings");
    return mergeStoredSettings(stored);
  } catch (error) {
    console.error("Error loading .ai-settings.json:", error);
    return null;
  }
}
async function ensureAiSettingsLoaded() {
  const [existing] = await db.select().from(aiSettings).where(eq2(aiSettings.id, 1));
  if (existing?.settings) {
    aiSettings2 = mergeStoredSettings(existing.settings);
    return aiSettings2;
  }
  const imported = readLegacySettingsFile() ?? buildDefaultSettings();
  await db.insert(aiSettings).values({ id: 1, settings: imported, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoNothing();
  const [row] = await db.select().from(aiSettings).where(eq2(aiSettings.id, 1));
  aiSettings2 = mergeStoredSettings(row?.settings ?? imported);
  return aiSettings2;
}
async function saveSettings(settings) {
  const toSave = {
    ...settings,
    openai: { ...settings.openai },
    replicate: { ...settings.replicate },
    siliconflow: { ...settings.siliconflow },
    flux2pro: { ...settings.flux2pro },
    stability: { ...settings.stability },
    geminiImage: { ...settings.geminiImage },
    storyTextProvider: { ...settings.storyTextProvider }
  };
  await db.insert(aiSettings).values({ id: 1, settings: toSave, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
    target: aiSettings.id,
    set: { settings: toSave, updatedAt: /* @__PURE__ */ new Date() }
  });
  aiSettings2 = toSave;
}
function isStoredOpenAIKey(apiKey) {
  return !!apiKey && !apiKey.includes("DUMMY") && apiKey.length > 10 && apiKey.startsWith("sk-");
}
function getOpenAIClient() {
  const adminKey = aiSettings2.openai.apiKey;
  if (isStoredOpenAIKey(adminKey)) {
    return new OpenAI({
      apiKey: adminKey,
      baseURL: "https://api.openai.com/v1"
    });
  }
  const envKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  if (envKey && !envKey.includes("DUMMY") && envKey.length > 10) {
    return new OpenAI({
      apiKey: envKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
    });
  }
  throw new Error("OpenAI API key not configured. Please set a valid API key in the admin panel.");
}
async function generateTextWithGemini(systemPrompt, userPrompt, model, apiKey, responseFormat) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}

${userPrompt}` }] }
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192
    }
  };
  if (responseFormat?.type === "json_object") {
    body.generationConfig.responseMimeType = "application/json";
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
  const data = await response.json();
  const text2 = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text2)
    throw new Error("Gemini returned empty response");
  return text2;
}
async function generateTextWithReplicate(systemPrompt, userPrompt, model, apiKey) {
  const replicateApiKey = apiKey || aiSettings2.replicate.apiKey;
  if (!replicateApiKey)
    throw new Error("Replicate API key not configured");
  const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${replicateApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: {
        prompt: `${systemPrompt}

${userPrompt}`,
        max_tokens: 8192,
        temperature: 0.8
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${errText}`);
  }
  const prediction = await response.json();
  let result = prediction;
  const getUrl = prediction.urls?.get;
  if (getUrl) {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 2e3));
      const pollRes = await fetch(getUrl, {
        headers: { "Authorization": `Bearer ${replicateApiKey}` }
      });
      result = await pollRes.json();
      if (result.status === "succeeded")
        break;
      if (result.status === "failed" || result.status === "canceled") {
        throw new Error(`Replicate prediction ${result.status}: ${result.error || "unknown"}`);
      }
    }
  }
  const output = result.output;
  if (Array.isArray(output))
    return output.join("");
  if (typeof output === "string")
    return output;
  throw new Error("Replicate returned unexpected output format");
}
async function generateTextWithProvider(systemPrompt, userPrompt, responseFormat) {
  const textSettings = aiSettings2.storyTextProvider;
  const provider = textSettings.provider;
  if (provider === "gemini") {
    if (!textSettings.geminiApiKey)
      throw new Error("Gemini API key not configured in admin panel");
    return generateTextWithGemini(systemPrompt, userPrompt, textSettings.geminiModel, textSettings.geminiApiKey, responseFormat);
  }
  if (provider === "replicate") {
    const result = await generateTextWithReplicate(systemPrompt, userPrompt, textSettings.replicateModel, aiSettings2.replicate.apiKey);
    return result;
  }
  const openai = getOpenAIClient();
  const params = {
    model: textSettings.openaiModel || "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8
  };
  if (responseFormat)
    params.response_format = responseFormat;
  const response = await openai.chat.completions.create(params);
  return response.choices[0].message.content || "";
}
function readCheckpoint(payload) {
  if (!payload || typeof payload !== "object")
    return { v: 1 };
  const raw = payload._checkpoint;
  if (!raw || raw.v !== 1)
    return { v: 1 };
  return raw;
}
function requeuePayloadAfterStall(payload) {
  if (!payload || typeof payload !== "object")
    return null;
  const row = payload;
  if (typeof row.storyPrompt !== "string" || typeof row.style !== "string")
    return null;
  const checkpoint = readCheckpoint(payload);
  const stalls = (checkpoint.stalls ?? 0) + 1;
  if (stalls > MAX_COMIC_JOB_STALLS)
    return null;
  checkpoint.stalls = stalls;
  return { ...row, _checkpoint: checkpoint };
}
function userFacingJobPersistError(err) {
  if (err instanceof ComicS3Error) {
    if (err.code === "S3_NOT_CONFIGURED") {
      return "Comic storage is temporarily unavailable. Please try again in a few minutes.";
    }
    return "We couldn't upload your comic images. Please try again.";
  }
  const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "";
  if (/S3|PutObject|fetch source image|INGEST_FAILED/i.test(msg)) {
    return "We couldn't upload your comic images. Please try again.";
  }
  return "We couldn't save your comic progress. Please try again.";
}
async function persistCheckpointImages(job) {
  const checkpoint = job.requestPayload?._checkpoint;
  if (!checkpoint || !job.userId)
    return;
  const userId = job.userId;
  const store = (value) => uploadCharacterPhotoToS3OrThrow(userId, value);
  if (checkpoint.stylized) {
    for (const row of checkpoint.stylized) {
      if (row.url)
        continue;
      if (!row.base64)
        continue;
      const source = row.base64.startsWith("data:") || row.base64.startsWith("http") ? row.base64 : `data:${row.mimeType || "image/png"};base64,${row.base64}`;
      row.url = await store(source);
      row.base64 = "";
    }
  }
  if (checkpoint.comicCharacters) {
    for (const row of checkpoint.comicCharacters) {
      if (!row.imageUrl)
        continue;
      row.imageUrl = await store(row.imageUrl);
    }
  }
  if (checkpoint.villainAnchor) {
    checkpoint.villainAnchor = await store(checkpoint.villainAnchor);
  }
  if (checkpoint.partialPanels) {
    for (const panel of checkpoint.partialPanels.panels) {
      if (!panel.imageUrl)
        continue;
      panel.imageUrl = await store(panel.imageUrl);
    }
  }
}
async function saveJobToDb(job) {
  try {
    await persistCheckpointImages(job);
    if (job.userId && Array.isArray(job.pages) && job.pages.length > 0 && comicPagesNeedS3Ingest(job.pages)) {
      await ensureLibraryComicDraftForJob(job, {
        title: job.title || "Untitled Comic",
        style: job.style || "Comic",
        characterNames: job.characterNames || []
      });
      await syncJobPagesToS3Library(job);
    }
    const pagesColumn = Array.isArray(job.pages) && job.pages.length > 0 ? stripNonAssetImagesFromComicPagesJson(job.pages) : job.pages;
    const heartbeatAt = /* @__PURE__ */ new Date();
    const existingJob = await db.select().from(comicJobs).where(eq2(comicJobs.id, job.id)).limit(1);
    if (existingJob.length > 0) {
      await db.update(comicJobs).set({
        status: job.status,
        progress: job.progress,
        title: job.title || null,
        pages: pagesColumn,
        error: job.error || null,
        libraryComicId: job.libraryComicId ?? null,
        heartbeatAt,
        ...job.requestPayload ? { requestPayload: job.requestPayload } : {},
        updatedAt: heartbeatAt
      }).where(eq2(comicJobs.id, job.id));
    } else {
      await db.insert(comicJobs).values({
        id: job.id,
        userId: job.userId || null,
        status: job.status,
        progress: job.progress,
        title: job.title || null,
        style: job.style || null,
        pagesCount: job.pagesCount || null,
        pages: pagesColumn,
        error: job.error || null,
        libraryComicId: job.libraryComicId ?? null,
        requestPayload: job.requestPayload ?? null,
        heartbeatAt,
        updatedAt: heartbeatAt
      }).onConflictDoUpdate({
        target: comicJobs.id,
        set: {
          userId: job.userId || null,
          status: job.status,
          progress: job.progress,
          title: job.title || null,
          style: job.style || null,
          pagesCount: job.pagesCount || null,
          pages: job.pages,
          error: job.error || null,
          libraryComicId: job.libraryComicId ?? null,
          ...job.requestPayload ? { requestPayload: job.requestPayload } : {},
          heartbeatAt,
          updatedAt: heartbeatAt
        }
      });
    }
    job.pages = pagesColumn;
  } catch (error) {
    console.error("Error saving job to database:", error);
    if (!job.error) {
      job.error = userFacingJobPersistError(error);
    }
    try {
      await db.update(comicJobs).set({
        error: job.error || null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(comicJobs.id, job.id));
    } catch (persistErr) {
      console.error("Failed to persist job error to comic_jobs:", persistErr);
    }
  }
}
async function getJobFromDb(jobId) {
  try {
    const result = await db.select().from(comicJobs).where(eq2(comicJobs.id, jobId)).limit(1);
    if (result.length > 0) {
      const dbJob = result[0];
      const job = {
        id: dbJob.id,
        userId: dbJob.userId || void 0,
        status: dbJob.status,
        progress: dbJob.progress,
        title: dbJob.title || void 0,
        style: dbJob.style || void 0,
        pagesCount: dbJob.pagesCount || void 0,
        pages: stripNonAssetImagesFromComicPagesJson(dbJob.pages || []),
        error: dbJob.error || void 0,
        libraryComicId: dbJob.libraryComicId ?? void 0,
        requestPayload: dbJob.requestPayload ?? void 0,
        createdAt: new Date(dbJob.createdAt).getTime()
      };
      return job;
    }
  } catch (error) {
    console.error("Error loading job from database:", error);
  }
  return null;
}
function getActiveReplicateModel() {
  const { models, defaultModel } = aiSettings2.replicate;
  if (defaultModel === "flux11Pro" && models.flux11Pro.enabled) {
    return { modelId: models.flux11Pro.modelId, name: "FLUX 1.1 Pro" };
  }
  if (defaultModel === "fluxSchnell" && models.fluxSchnell.enabled) {
    return { modelId: models.fluxSchnell.modelId, name: "FLUX Schnell" };
  }
  if (models.flux11Pro.enabled) {
    return { modelId: models.flux11Pro.modelId, name: "FLUX 1.1 Pro" };
  }
  if (models.fluxSchnell.enabled) {
    return { modelId: models.fluxSchnell.modelId, name: "FLUX Schnell" };
  }
  return null;
}
async function pipelineImageResultFromRemoteOutputUrl(imageUrl, fallbackMimeType) {
  const t = (imageUrl || "").trim();
  if (!t) {
    return "";
  }
  if (process.env.COMIC_PIPELINE_FETCH_REMOTE_IMAGES_TO_DATA_URI === "1") {
    const imageResponse = await fetch(t, { signal: AbortSignal.timeout(REMOTE_IMAGE_FETCH_MS) });
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image (${imageResponse.status})`);
    }
    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imageResponse.headers.get("content-type") || fallbackMimeType;
    return `data:${contentType};base64,${base64}`;
  }
  if (t.startsWith("https://") || t.startsWith("http://")) {
    return t;
  }
  return t;
}
async function generateImageWithReplicate(prompt, aspectRatio = "1:1") {
  const apiKey = aiSettings2.replicate.apiKey;
  if (!apiKey)
    throw new Error("Replicate API key not configured");
  const activeModel = getActiveReplicateModel();
  if (!activeModel)
    throw new Error("No Replicate models enabled");
  console.log(`Using Replicate model: ${activeModel.name}`);
  const isFluxPro = activeModel.modelId.includes("flux-1.1-pro");
  const isFluxSchnell = activeModel.modelId.includes("flux-schnell");
  let inputPayload;
  if (isFluxPro) {
    inputPayload = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
      output_quality: 80,
      safety_tolerance: 2
    };
  } else if (isFluxSchnell) {
    inputPayload = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
      output_quality: 80,
      go_fast: true,
      num_outputs: 1
    };
  } else {
    const fallbackWidth = aspectRatio === "9:16" ? 576 : 1024;
    const fallbackHeight = aspectRatio === "9:16" ? 1024 : 1024;
    inputPayload = {
      prompt,
      width: fallbackWidth,
      height: fallbackHeight,
      num_outputs: 1
    };
  }
  const response = await fetch(`https://api.replicate.com/v1/models/${activeModel.modelId}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({ input: inputPayload })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }
  let result = await response.json();
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === "string" ? result.output : result.output?.[0];
    if (imageUrl) {
      return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/webp");
    }
    return "";
  }
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );
    result = await statusResponse.json();
    if (result.status === "succeeded") {
      const imageUrl = typeof result.output === "string" ? result.output : result.output?.[0];
      if (imageUrl) {
        return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/webp");
      }
      return "";
    }
    if (result.status === "failed") {
      throw new Error(result.error || "Image generation failed");
    }
  }
  throw new Error("Image generation timed out");
}
async function generateImageWithKontext(prompt, inputImageUrl, aspectRatio = "1:1") {
  const apiKey = aiSettings2.replicate.apiKey;
  if (!apiKey)
    throw new Error("Replicate API key not configured");
  if (!aiSettings2.replicate.models.fluxKontextDev.enabled) {
    throw new Error("FLUX Kontext is not enabled");
  }
  console.log("Using FLUX Kontext [dev] for character consistency");
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-dev/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({
      input: {
        prompt,
        input_image: inputImageUrl,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: 80,
        guidance: 2.5,
        num_inference_steps: 28,
        go_fast: true
      }
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate Kontext API error: ${error}`);
  }
  let result = await response.json();
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === "string" ? result.output : result.output?.[0];
    if (imageUrl) {
      return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/webp");
    }
    return "";
  }
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );
    result = await statusResponse.json();
    if (result.status === "succeeded") {
      const imageUrl = typeof result.output === "string" ? result.output : result.output?.[0];
      if (imageUrl) {
        return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/webp");
      }
      return "";
    }
    if (result.status === "failed") {
      throw new Error(result.error || "Kontext image generation failed");
    }
  }
  throw new Error("Kontext image generation timed out");
}
async function generateImageWithSiliconFlow(prompt, referenceImageUrls = [], aspectRatio = "1:1") {
  const apiKey = aiSettings2.siliconflow.apiKey;
  if (!apiKey)
    throw new Error("SiliconFlow API key not configured");
  const modelConfig = aiSettings2.siliconflow.models.fluxKontextDev;
  if (!modelConfig.enabled) {
    throw new Error("SiliconFlow FLUX Kontext is not enabled");
  }
  console.log(`Using SiliconFlow FLUX Kontext with ${referenceImageUrls.length} reference image(s)`);
  const requestBody = {
    model: modelConfig.modelId,
    prompt,
    image_size: aspectRatio === "9:16" ? "576x1024" : "1024x1024",
    num_inference_steps: 28,
    guidance_scale: 3.5
  };
  if (referenceImageUrls.length > 0) {
    requestBody.image = referenceImageUrls[0];
    if (referenceImageUrls.length > 1) {
      console.log(`Multi-reference mode: Using ${referenceImageUrls.length} character references`);
    }
  }
  const response = await fetch("https://api.siliconflow.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SiliconFlow API error: ${error}`);
  }
  const result = await response.json();
  if (result.images && result.images.length > 0) {
    const imageUrl = result.images[0].url;
    if (imageUrl) {
      return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/png");
    }
  }
  if (result.data && result.data.length > 0) {
    const imageData = result.data[0];
    if (imageData.url) {
      return await pipelineImageResultFromRemoteOutputUrl(imageData.url, "image/png");
    }
    if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }
  }
  throw new Error("SiliconFlow returned no image data");
}
async function generateImageWithFlux2Pro(prompt, referenceImageUrls = [], aspectRatio = "1:1") {
  const apiKey = aiSettings2.flux2pro.apiKey || aiSettings2.replicate.apiKey;
  if (!apiKey)
    throw new Error("FLUX.2 Pro / Replicate API key not configured");
  const modelConfig = aiSettings2.flux2pro.models.flux2Pro;
  if (!modelConfig || !modelConfig.enabled) {
    throw new Error("FLUX.2 Pro is not enabled");
  }
  console.log(`Using FLUX.2 Pro (Replicate) with ${referenceImageUrls.length} reference image(s)`);
  const input = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: "webp",
    output_quality: 80,
    safety_tolerance: 5
  };
  if (referenceImageUrls.length > 0) {
    const maxRefs = Math.min(referenceImageUrls.length, 8);
    input.input_images = referenceImageUrls.slice(0, maxRefs);
    console.log(`Multi-reference mode: Passing ${maxRefs} images via input_images array`);
    if (referenceImageUrls.length === 1) {
      input.prompt = `${prompt}. The character in this scene MUST look exactly like the person shown in the input image - preserve their exact face, hair, and physical features.`;
    } else if (referenceImageUrls.length >= 2) {
      input.prompt = `${prompt}. 
TWO DISTINCT CHARACTERS: 
- First character MUST look exactly like person in first input image (same face, hair, features)
- Second character MUST look exactly like person in second input image (same face, hair, features)
Both characters must be clearly visible and match their reference images precisely.`;
    }
  }
  const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({ input })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FLUX.2 Pro API error: ${error}`);
  }
  let result = await response.json();
  if (result.status === "starting" || result.status === "processing") {
    const pollUrl = result.urls?.get || `https://api.replicate.com/v1/predictions/${result.id}`;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve2) => setTimeout(resolve2, 1e3));
      const pollResponse = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      result = await pollResponse.json();
      if (result.status === "succeeded" || result.status === "failed")
        break;
    }
  }
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === "string" ? result.output : result.output?.[0];
    if (imageUrl) {
      return await pipelineImageResultFromRemoteOutputUrl(imageUrl, "image/webp");
    }
  }
  throw new Error(`FLUX.2 Pro generation failed: ${result.error || result.status}`);
}
async function generateImageWithConsistentCharacter(prompt, subjectImageUrl, outputFormat = "webp") {
  const apiKey = aiSettings2.replicate.apiKey;
  if (!apiKey)
    throw new Error("Replicate API key not configured");
  if (!aiSettings2.replicate.models.consistentCharacter.enabled) {
    throw new Error("Consistent Character model is not enabled");
  }
  console.log("Using fofr/consistent-character for character consistency");
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait=60"
    },
    body: JSON.stringify({
      version: "6d07be932f1a1dcab88b599a25863a98e50768597ab4ed3b6c099ef0f707dc05",
      input: {
        prompt,
        subject: subjectImageUrl,
        output_format: outputFormat,
        output_quality: 85,
        number_of_outputs: 1,
        randomise_poses: false,
        number_of_images_per_pose: 1
      }
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate Consistent Character API error: ${error}`);
  }
  let result = await response.json();
  if (result.status === "succeeded") {
    const outputs = result.output;
    if (outputs && outputs.length > 0) {
      const raw = outputs[0];
      if (typeof raw === "string" && raw.trim()) {
        return await pipelineImageResultFromRemoteOutputUrl(raw, "image/webp");
      }
    }
    return "";
  }
  for (let i = 0; i < 90; i++) {
    await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` }
      }
    );
    result = await statusResponse.json();
    if (result.status === "succeeded") {
      const outputs = result.output;
      if (outputs && outputs.length > 0) {
        const raw = outputs[0];
        if (typeof raw === "string" && raw.trim()) {
          return await pipelineImageResultFromRemoteOutputUrl(raw, "image/webp");
        }
      }
      return "";
    }
    if (result.status === "failed") {
      throw new Error(result.error || "Consistent Character image generation failed");
    }
  }
  throw new Error("Consistent Character image generation timed out");
}
async function generateImageWithStability(prompt, aspectRatio = "1:1") {
  const apiKey = aiSettings2.stability.apiKey;
  if (!apiKey)
    throw new Error("Stability API key not configured");
  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        prompt,
        output_format: "png",
        aspect_ratio: aspectRatio
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability API error: ${error}`);
  }
  const result = await response.json();
  if (result.image) {
    return `data:image/png;base64,${result.image}`;
  }
  throw new Error("No image returned from Stability AI");
}
async function detectOutfitFromPhoto(imageUrl, characterName) {
  const systemPrompt = `You are an outfit detector. Describe the clothing and accessories visible in the photo in detail.
Focus on: clothing type, colors, patterns, accessories, shoes if visible.
Be specific about colors (e.g., "navy blue" not just "blue").
Format: A concise description suitable for image generation prompts.
Example output: "wearing a red plaid flannel shirt, dark blue jeans, brown leather belt, white sneakers"`;
  const userText = "Describe the outfit/clothing this person is wearing. Be specific about colors and style.";
  try {
    console.log(`Detecting outfit for "${characterName}" from uploaded photo...`);
    const textSettings = aiSettings2.storyTextProvider;
    let outfit = "";
    if (textSettings.provider === "gemini" && textSettings.geminiApiKey) {
      const model = textSettings.geminiModel || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${textSettings.geminiApiKey}`;
      const body = {
        contents: [{
          role: "user",
          parts: [
            { text: `${systemPrompt}

${userText}` },
            { inlineData: void 0, fileData: void 0 }
          ]
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 }
      };
      if (imageUrl.startsWith("data:")) {
        const matches = imageUrl.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          body.contents[0].parts[1] = { inlineData: { mimeType: matches[1], data: matches[2] }, fileData: void 0 };
        }
      } else {
        body.contents[0].parts[1] = { inlineData: void 0, fileData: { mimeType: "image/jpeg", fileUri: imageUrl } };
      }
      body.contents[0].parts = body.contents[0].parts.filter((p) => p.text || p.inlineData || p.fileData);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Vision error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      outfit = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } else {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: textSettings.provider === "openai" ? textSettings.openaiModel || "gpt-4o" : "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 200
      });
      outfit = response.choices[0]?.message?.content?.trim() || "";
    }
    console.log(`Detected outfit for "${characterName}": ${outfit}`);
    return outfit;
  } catch (error) {
    console.error(`Failed to detect outfit for "${characterName}":`, error.message);
    return "";
  }
}
async function adaptOutfitToStory(originalOutfit, characterName, storyPrompt, style) {
  try {
    console.log(`Adapting outfit for "${characterName}" to story context...`);
    const systemPrompt = `You adapt character outfits to fit story contexts while keeping recognizable elements.

Rules:
1. If the story requires a specific role (knight, wizard, astronaut), adapt the outfit to that role
2. Keep distinctive colors from the original outfit (e.g., blue shirt \u2192 blue-accented armor)
3. Keep accessories like glasses, watches, jewelry if they were present
4. If the original outfit already fits the story, keep it as-is
5. Output ONLY the adapted outfit description, nothing else

Example:
- Original: "red t-shirt, blue jeans, glasses"
- Story: "A brave knight saves the kingdom"
- Adapted: "silver knight armor with red tunic underneath, blue cape, glasses"

Example 2:
- Original: "yellow sundress, sandals"
- Story: "A day at the beach"
- Adapted: "yellow sundress, sandals" (already fits, no change needed)`;
    const userMsg = `Character: ${characterName}
Original outfit: ${originalOutfit}
Story: ${storyPrompt}
Art style: ${style}

Adapt the outfit to fit the story while keeping recognizable colors/elements. Output ONLY the adapted outfit description.`;
    const adaptedOutfit = (await generateTextWithProvider(systemPrompt, userMsg)).trim() || originalOutfit;
    console.log(`Adapted outfit for "${characterName}": ${adaptedOutfit}`);
    return adaptedOutfit;
  } catch (error) {
    console.error(`Failed to adapt outfit for "${characterName}":`, error.message);
    return originalOutfit;
  }
}
async function generateImageWithOpenAI(prompt, aspectRatio = "1:1") {
  const openai = getOpenAIClient();
  console.log("Generating image with OpenAI, prompt length:", prompt.length);
  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: aspectRatio === "9:16" ? "1024x1792" : "1024x1024",
    n: 1
  });
  console.log("OpenAI image response received");
  const imageData = imageResponse.data;
  if (!imageData || imageData.length === 0) {
    throw new Error("No image data returned from OpenAI");
  }
  const imageBase64 = imageData[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("No base64 image data returned from OpenAI");
  }
  return `data:image/png;base64,${imageBase64}`;
}
async function generateImageWithGemini(prompt, referenceImageUrls, aspectRatio = "1:1") {
  const geminiSettings = aiSettings2.geminiImage;
  const apiKey = geminiSettings.apiKey || aiSettings2.storyTextProvider.geminiApiKey;
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Set it in the Gemini Image section or Story Text Provider section of the admin panel.");
  }
  const selectedModelKey = geminiSettings.defaultModel || "gemini25Flash";
  const modelConfig = geminiSettings.models[selectedModelKey];
  const modelId = modelConfig?.modelId || geminiSettings.model || "gemini-2.5-flash-image";
  console.log(`Generating image with Gemini model: ${modelId}`);
  const parts = [];
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    for (let i = 0; i < referenceImageUrls.length; i++) {
      const refUrl = referenceImageUrls[i];
      try {
        let base64Data;
        let mimeType = "image/png";
        if (refUrl.startsWith("data:")) {
          const match = refUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            continue;
          }
        } else {
          const imgResponse = await fetch(refUrl);
          if (!imgResponse.ok)
            continue;
          const buffer = await imgResponse.arrayBuffer();
          base64Data = Buffer.from(buffer).toString("base64");
          const contentType = imgResponse.headers.get("content-type");
          if (contentType)
            mimeType = contentType.split(";")[0];
        }
        parts.push({
          text: `Reference image ${i + 1} - use this character's exact appearance:`
        });
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      } catch (err) {
        console.warn(`Failed to load reference image ${i + 1} for Gemini: ${err.message}`);
      }
    }
  }
  parts.push({ text: prompt });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["Image"],
      temperature: 1
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image generation error (${response.status}): ${errText}`);
  }
  const data = await response.json();
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no image candidates");
  }
  const candidateParts = candidates[0]?.content?.parts;
  if (!candidateParts || candidateParts.length === 0) {
    throw new Error("Gemini returned no image parts");
  }
  for (const part of candidateParts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData) {
      const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
      const base64 = inlineData.data;
      console.log(`Gemini image generated successfully (${mimeType})`);
      return `data:${mimeType};base64,${base64}`;
    }
  }
  console.error("Gemini response parts:", JSON.stringify(candidateParts.map((p) => Object.keys(p))));
  throw new Error("Gemini response did not contain image data");
}
function getActiveProvider() {
  const defaultProvider = aiSettings2.defaultProvider;
  const providerConfig = aiSettings2[defaultProvider];
  if (providerConfig && typeof providerConfig === "object" && "enabled" in providerConfig && providerConfig.enabled) {
    if (defaultProvider === "openai") {
      const hasValidKey = aiSettings2.openai.apiKey && !aiSettings2.openai.apiKey.includes("DUMMY") && aiSettings2.openai.apiKey.length > 10 && aiSettings2.openai.apiKey.startsWith("sk-");
      if (hasValidKey) {
        return "openai";
      }
    } else if (defaultProvider === "replicate" && aiSettings2.replicate.apiKey) {
      return "replicate";
    } else if (defaultProvider === "stability" && aiSettings2.stability.apiKey) {
      return "stability";
    }
  }
  if (aiSettings2.replicate.enabled && aiSettings2.replicate.apiKey) {
    return "replicate";
  }
  if (aiSettings2.stability.enabled && aiSettings2.stability.apiKey) {
    return "stability";
  }
  if (aiSettings2.openai.enabled && aiSettings2.openai.apiKey && !aiSettings2.openai.apiKey.includes("DUMMY") && aiSettings2.openai.apiKey.length > 10 && aiSettings2.openai.apiKey.startsWith("sk-")) {
    return "openai";
  }
  throw new Error("No AI providers configured. Please set up API keys in the admin panel.");
}
async function generateImage(prompt, referenceImageUrls, aspectRatio) {
  const provider = getActiveProvider();
  const panelProvider = aiSettings2.panelGenerationProvider || "siliconflow";
  console.log(`Generating image with provider: ${provider}, panel provider: ${panelProvider}`);
  try {
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      if (panelProvider === "gemini") {
        const geminiKey = aiSettings2.geminiImage.apiKey || aiSettings2.storyTextProvider.geminiApiKey;
        if (geminiKey && aiSettings2.geminiImage.enabled) {
          console.log(`Using Gemini with ${referenceImageUrls.length} reference image(s) for character consistency`);
          return await generateImageWithGemini(prompt, referenceImageUrls, aspectRatio || "1:1");
        } else {
          console.log("Gemini Image not configured, falling back to SiliconFlow...");
        }
      }
      if (panelProvider === "flux2pro") {
        const apiKey = aiSettings2.flux2pro.apiKey || aiSettings2.replicate.apiKey;
        const modelEnabled = aiSettings2.flux2pro.models?.flux2Pro?.enabled;
        if (apiKey && modelEnabled) {
          console.log(`Using FLUX.2 Pro with ${referenceImageUrls.length} reference image(s) for character consistency`);
          return await generateImageWithFlux2Pro(prompt, referenceImageUrls, aspectRatio || "1:1");
        } else {
          console.log("FLUX.2 Pro not configured, falling back to SiliconFlow...");
        }
      }
      if (aiSettings2.siliconflow.enabled && aiSettings2.siliconflow.apiKey && aiSettings2.siliconflow.models.fluxKontextDev.enabled) {
        console.log(`Using SiliconFlow with ${referenceImageUrls.length} reference image(s) for character consistency`);
        return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
      }
      if (provider === "replicate" && aiSettings2.replicate.models.fluxKontextDev.enabled) {
        console.log(`Falling back to Replicate Kontext with first reference image`);
        return await generateImageWithKontext(prompt, referenceImageUrls[0], aspectRatio || "1:1");
      }
    }
    if (panelProvider === "gemini" && aiSettings2.geminiImage.enabled) {
      const geminiKey = aiSettings2.geminiImage.apiKey || aiSettings2.storyTextProvider.geminiApiKey;
      if (geminiKey) {
        return await generateImageWithGemini(prompt, void 0, aspectRatio || "1:1");
      }
    }
    switch (provider) {
      case "replicate":
        return await generateImageWithReplicate(prompt, aspectRatio || "1:1");
      case "stability":
        return await generateImageWithStability(prompt, aspectRatio || "1:1");
      case "openai":
      default:
        return await generateImageWithOpenAI(prompt, aspectRatio || "1:1");
    }
  } catch (error) {
    console.error(`Image generation error with ${provider}:`, error);
    const enabledProviders = getEnabledProviders().filter((p) => p !== provider);
    for (const altProvider of enabledProviders) {
      try {
        console.log(`Trying other enabled provider: ${altProvider}`);
        return await generateImageWithProvider(altProvider, prompt, referenceImageUrls, aspectRatio);
      } catch (altError) {
        console.error(`Enabled provider ${altProvider} also failed:`, altError.message);
      }
    }
    const fallbackProvider = aiSettings2.fallbackProvider;
    if (fallbackProvider && fallbackProvider !== provider && !enabledProviders.includes(fallbackProvider)) {
      try {
        console.log(`Trying admin-configured FALLBACK provider: ${fallbackProvider}`);
        return await generateImageWithProvider(fallbackProvider, prompt, referenceImageUrls, aspectRatio);
      } catch (fallbackError) {
        console.error(`FALLBACK provider ${fallbackProvider} also failed:`, fallbackError.message);
      }
    }
    throw error;
  }
}
function getEnabledProviders() {
  const enabled = [];
  if (aiSettings2.openai.enabled && aiSettings2.openai.apiKey && aiSettings2.openai.apiKey.length > 10 && aiSettings2.openai.apiKey.startsWith("sk-")) {
    enabled.push("openai");
  }
  if (aiSettings2.replicate.enabled && aiSettings2.replicate.apiKey) {
    enabled.push("replicate");
  }
  if (aiSettings2.siliconflow.enabled && aiSettings2.siliconflow.apiKey) {
    enabled.push("siliconflow");
  }
  if (aiSettings2.stability.enabled && aiSettings2.stability.apiKey) {
    enabled.push("stability");
  }
  if (aiSettings2.geminiImage.enabled && (aiSettings2.geminiImage.apiKey || aiSettings2.storyTextProvider.geminiApiKey)) {
    enabled.push("gemini");
  }
  return enabled;
}
async function generateImageWithProvider(provider, prompt, referenceImageUrls, aspectRatio) {
  if (provider === "gemini") {
    const geminiKey = aiSettings2.geminiImage.apiKey || aiSettings2.storyTextProvider.geminiApiKey;
    if (!geminiKey || geminiKey.length < 4) {
      throw new Error("Gemini API key not configured");
    }
  } else {
    const providerConfig = aiSettings2[provider];
    if (!providerConfig || typeof providerConfig !== "object" || !providerConfig.apiKey || providerConfig.apiKey.length < 4) {
      throw new Error(`Provider ${provider} is not configured with a valid API key`);
    }
  }
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    if (provider === "gemini") {
      return await generateImageWithGemini(prompt, referenceImageUrls, aspectRatio || "1:1");
    }
    if (provider === "siliconflow" && aiSettings2.siliconflow.models?.fluxKontextDev?.enabled) {
      return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
    }
    if (provider === "replicate" && aiSettings2.replicate.models?.fluxKontextDev?.enabled) {
      return await generateImageWithKontext(prompt, referenceImageUrls[0], aspectRatio || "1:1");
    }
  }
  switch (provider) {
    case "gemini":
      return await generateImageWithGemini(prompt, void 0, aspectRatio || "1:1");
    case "replicate":
      return await generateImageWithReplicate(prompt, aspectRatio || "1:1");
    case "stability":
      return await generateImageWithStability(prompt, aspectRatio || "1:1");
    case "siliconflow":
      return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
    case "openai":
    default:
      return await generateImageWithOpenAI(prompt, aspectRatio || "1:1");
  }
}
async function processComicJobGeminiFullPage(jobId, params, options) {
  const job = await getJobFromDb(jobId);
  if (!job || job.status === "completed")
    return;
  const budget = new JobStepBudget(params, options?.maxSteps);
  const checkpoint = budget.checkpoint;
  const { storyPrompt, style, characters: characters2, pagesCount, title, language } = params;
  const characterNames = (characters2 || []).map((c) => c.name).filter(Boolean);
  job.characterNames = characterNames;
  job.requestPayload = budget.payload();
  try {
    job.status = "processing";
    if (!checkpoint.story && job.pages.length === 0) {
      job.progress = 5;
    }
    await ensureLibraryComicDraftForJob(job, {
      title: job.title || title,
      style: job.style || style,
      characterNames
    });
    await saveJobToDb(job);
    const allCharacters = characters2 || [];
    const charactersWithImages = allCharacters.filter((c) => c.imageUri && (c.imageUri.startsWith("http") || c.imageUri.startsWith("data:"))).map((c) => ({ name: c.name, imageUri: c.imageUri, description: c.description || "" }));
    const characterDescriptions = (characters2 || []).map((c) => {
      if (c.description)
        return `${c.name}: ${c.description}`;
      return `${c.name} (${c.type})`;
    }).join("; ");
    const mainCharacterNames = (characters2 || []).map((c) => c.name).filter(Boolean);
    const characterNamesList = mainCharacterNames.length > 0 ? mainCharacterNames.join(", ") : "the main characters";
    const languageInstruction = language ? `IMPORTANT: Write ALL dialogue, narration, and text in ${language}.` : "";
    const titleInstruction = title ? `The comic title MUST be "${title}".` : "";
    const styleDescriptions = {
      Comic: "American comic book style with bold vibrant colors, dynamic action poses, halftone dots, thick black outlines",
      Manga: "Japanese manga style with black and white tones, expressive eyes, dramatic shading, clean linework",
      Manhwa: "Korean manhwa style with soft pastel colors, detailed characters, modern webtoon aesthetic",
      Graphic: "Mature graphic novel style with cinematic composition, realistic proportions, muted colors, dramatic shadows",
      Kawaii: "Kawaii chibi style with oversized heads, huge sparkly eyes, soft pastel colors, adorable proportions",
      Noir: "Film noir style, strictly black and white, high contrast dramatic shadows, moody atmospheric lighting",
      Anime: "Japanese anime style with full vibrant colors, large expressive eyes, clean cel-shaded coloring",
      Afro: "Afrofuturism art style with bold geometric African patterns, vibrant rich colors, futuristic sci-fi elements"
    };
    const narrativeArc = buildNarrativeArcForFullPage(pagesCount);
    const storySystemPrompt = `You are a professional comic book story writer who creates compelling, well-paced narratives with natural dialogue flow. Your stories read like real published comics \u2014 each page connects smoothly to the next, dialogue feels natural and advances the plot, and the emotional arc builds from beginning to end.
CRITICAL: Follow the user's story EXACTLY. Do not make up a different story.
Always respond with valid JSON.

=== GOLD STANDARD EXAMPLE \u2014 Study this story's flow pattern ===
Here is a perfect 5-page comic story ("Immune") that demonstrates ideal narrative flow. Use this as your quality benchmark:

PAGE 1 (Cover): Hero stands defiantly, ally behind him, setting established visually.
PAGE 2 (World-building + Character): Establishes the world (everyone has powers), shows the hero's problem (he has none), introduces the mysterious ally watching from shadows, ends on the hero's frustration.
  - Panel flow: Wide city \u2192 hero alone at school \u2192 ally watching \u2192 close-up of hero's emotion
  - Dialogue builds: "Everyone is special except me" \u2192 "I'm suffocating" \u2192 "He's the key" \u2192 "I wish I could do something"
  - Each panel shows a DIFFERENT scene but they ALL serve ONE purpose: establishing who the hero is and why he matters

PAGE 3 (Inciting incident + Ally revealed): Villain appears stealing powers (NEWS on screen), villain shown in action (defeating a hero), ally arrives urgently to the hero, hero learns HE is the solution.
  - Panel flow: News report \u2192 villain in action \u2192 ally lands before hero \u2192 hero's shocked reaction
  - Dialogue escalates: "What's going on?" \u2192 "Power is mine!" \u2192 "You're the only one immune!" \u2192 "Me? But I'm..."
  - CAUSE-EFFECT: Villain steals powers (cause) \u2192 ally needs hero's help (effect) \u2192 hero is shocked (reaction)

PAGE 4 (Action + Confrontation): Ally transfers powers to hero, hero punches villain, hero charges again, villain fires back.
  - Panel flow: Power transfer \u2192 first punch \u2192 hero flying in \u2192 villain's counterattack
  - Dialogue is SHORT and ACTION-DRIVEN: "Take my strength!" \u2192 "Argh!" \u2192 "This ends now!" \u2192 "You cannot defeat me!"
  - Every panel is a CONSECUTIVE MOMENT in the fight \u2014 like frames of an action movie

PAGE 5 (Resolution + Emotional payoff): Villain defeated, heroes celebrating, ally acknowledges hero, hero finds new confidence.
  - Panel flow: Villain down \u2192 heroes celebrating \u2192 ally smiles \u2192 hero looks at city with confidence
  - Dialogue wraps up emotionally: "Impossible!" \u2192 "We did it" \u2192 "No, YOU did it" \u2192 "Maybe I'm not so ordinary after all"
  - SATISFYING ENDING: The hero's arc is complete \u2014 from feeling powerless to realizing his uniqueness IS his power

KEY PATTERNS TO REPLICATE:
- Each page has ONE clear purpose (world-build, incite, fight, resolve)
- Panels within a page flow like movie scenes \u2014 sequential moments, not random snapshots
- Dialogue gets progressively more intense: casual \u2192 concerned \u2192 urgent \u2192 action \u2192 reflective
- Every page ends on a moment that pulls you to the next page
- The LAST line of the comic echoes the hero's journey
=== END OF EXAMPLE ===`;
    const storyPromptText = `Create a ${pagesCount}-page ${style} comic story outline with a compelling narrative arc.

STORY: "${storyPrompt}"
${titleInstruction}
${languageInstruction}

CHARACTERS: ${characterDescriptions || "Create appropriate characters"}
Main characters: ${characterNamesList}

=== NARRATIVE STRUCTURE (follow this precisely) ===
${narrativeArc}

=== STORY FLOW RULES (CRITICAL \u2014 READ CAREFULLY) ===
1. PAGE-TO-PAGE CONTINUITY: Each page MUST pick up exactly where the previous page left off. No unexplained time jumps or scene changes between pages. If page 2 ends with a character opening a door, page 3 must start with what they see on the other side.
2. DIALOGUE PROGRESSION: Dialogue must flow like a real conversation across the comic. Characters react to what was JUST said. No repeating the same idea across pages. Each line moves the conversation and story forward.
3. CAUSE AND EFFECT: Every event should be caused by something that happened before. If a character is angry on page 4, something on page 3 made them angry. The reader should always understand WHY things are happening.
4. EMOTIONAL ARC: The emotional tone must shift naturally: calm/happy \u2192 curious/concerned \u2192 tense/worried \u2192 intense/dramatic \u2192 relieved/satisfied. Never jump from calm to intense without buildup.
5. PANEL-TO-PANEL FLOW: Within each page, panels should flow like a movie scene \u2014 like sequential frames of a film. Panel 1 leads to Panel 2 leads to Panel 3. Each panel shows the NEXT moment in time, not a random unrelated moment. The reader should be able to read left-to-right, top-to-bottom and follow the action smoothly.
6. PAGE-TURN HOOKS: Every body page should end on a moment that makes the reader want to turn the page \u2014 a cliffhanger, a revelation, a dramatic reaction, or an unresolved moment.
7. NO FILLER: Every panel must advance the story. No panels that just show characters standing around with generic dialogue. Each panel should either reveal something new, show a character reacting, or move the plot forward.
8. SINGLE COHERENT STORYLINE: The entire comic must tell ONE continuous story from start to finish. Do NOT introduce disconnected subplots, random scene changes, or unrelated events. Every page should be a direct continuation of the previous page's events.
9. CHARACTER ACTIONS MATTER: Show characters DOING things that move the plot \u2014 running, fighting, discovering, building, helping \u2014 not just talking. Mix action panels with dialogue panels for dynamic pacing.
10. LOGICAL CONSEQUENCES: If a character does something on one page, the NEXT page must show the consequences. If they run toward danger, the next page shows them IN the danger. Never skip over important moments.

=== OUTPUT FORMAT ===
For each page, write:
- A CINEMATICALLY DETAILED layout description \u2014 each panel must specify: camera angle (wide/medium/close-up/bird's-eye/over-the-shoulder), character positions (left/right/center, facing which direction), specific body language and actions, and the EXACT same environment details when panels share a location
- All dialogue/speech bubbles with character names
- Narration box text for context
- The emotional tone

=== PANEL DESCRIPTION REQUIREMENTS (CRITICAL FOR VISUAL COHERENCE) ===
Each panel description MUST include ALL of these elements:
1. CAMERA ANGLE: "Wide shot", "Medium shot", "Close-up of face", "Over-the-shoulder", "Bird's-eye view", "Low angle looking up", "Dutch angle"
2. CHARACTER POSITION: "Character-A on the LEFT facing right", "Character-B on the RIGHT facing left", "Character-A in CENTER facing camera"
3. CHARACTER ACTION: What the character is physically DOING \u2014 "reaching for the door handle", "pointing at the sky", "crouching behind a rock", "running toward the explosion" \u2014 NOT "standing" or "looking"
4. ENVIRONMENT: Specific, consistent details \u2014 "inside the dark cave with glowing blue crystals on the walls and a narrow stone path", NOT just "in a cave". When the SAME location appears in multiple panels, use the SAME environment description so the AI draws it consistently.
5. VISUAL CONTINUITY: If this panel continues from the previous panel, state what stayed the same \u2014 "Same cave interior as Panel 1, but now the camera is closer to the crystal wall"
6. LIGHTING & MOOD: "Warm golden sunset light from the left", "Harsh overhead fluorescent lights", "Dramatic shadows with red emergency lighting"

Format as JSON:
{
  "title": "${title || "Comic Title"}",
  "pages": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "layoutDescription": "Full page dramatic cover. Background: [SPECIFIC detailed setting with lighting and atmosphere]. Characters positioned in lower 60%: [Character-A] on the LEFT in [specific pose with body language], [Character-B] on the RIGHT in [specific pose]. Camera: low angle looking up at characters, making them look heroic. Lighting: [specific lighting]. All faces clearly visible and matching their portraits.",
      "dialogues": [],
      "narration": "",
      "characters_in_page": [${mainCharacterNames.map((n) => `"${n}"`).join(", ") || '"Hero"'}],
      "emotionalTone": "dramatic, inviting"
    },
    {
      "pageNumber": 2,
      "pageType": "body",
      "layoutDescription": "4-panel page: Panel 1 (top, full width) \u2014 WIDE SHOT establishing [specific location with details: time of day, weather, notable objects]. [Character-A] on the LEFT walking toward [specific landmark], [Character-B] on the RIGHT pointing at [something specific]. Lighting: [specific]. Panel 2 (middle-left) \u2014 MEDIUM SHOT, same location as Panel 1 but camera moved closer. [Character-A] in CENTER, now stopped, turning to look at [what Character-B pointed at], expression of [specific emotion]. Panel 3 (middle-right) \u2014 CLOSE-UP of [Character-B]'s face, eyes wide, mouth slightly open, looking directly at [the thing]. Same background visible but blurred behind them. Panel 4 (bottom, full width) \u2014 WIDE SHOT, same location, both characters now standing together on the LEFT, both looking RIGHT at [the thing], which is now [changed/closer/revealed]. This creates tension leading to next page.",
      "dialogues": [
        {"character": "${mainCharacterNames[0] || "Hero"}", "text": "short dialogue line", "panel": 1},
        {"character": "${mainCharacterNames[1] || mainCharacterNames[0] || "Hero"}", "text": "natural response", "panel": 2},
        {"character": "${mainCharacterNames[0] || "Hero"}", "text": "reaction advancing plot", "panel": 3}
      ],
      "narration": "Brief narration providing context",
      "characters_in_page": ["${mainCharacterNames[0] || "Hero"}", "${mainCharacterNames[1] || mainCharacterNames[0] || "Hero"}"],
      "emotionalTone": "calm, establishing"
    }
  ]
}

=== RULES ===
- Cover page: MUST include ALL main characters (${characterNamesList}) in characters_in_page and show them all prominently
- Body pages: 3-6 panels per page with cinematically detailed compositions
- Each panel description MUST specify camera angle, character positions (left/right/center), specific actions, and environment details \u2014 NEVER write vague descriptions like "characters in a park" or "characters talking"
- When the same location appears in multiple panels, REPEAT the same environment details word-for-word so the AI draws the same place consistently
- Dialogue must be character-attributed and feel like natural speech for that character
- IMPORTANT: Keep ALL dialogue lines SHORT \u2014 maximum 5-10 words per speech bubble. Break longer dialogue into multiple short bubbles
- Each page's narration should provide context or transitions, not repeat what the dialogue says
- The LAST page's final dialogue line should feel like a satisfying story ending
- NO CHARACTER DUPLICATION: Each character appears AT MOST ONCE per panel. Never describe the same character in two positions within one panel.
- SEQUENTIAL PANELS: Panels must read like consecutive movie frames. Panel 1 \u2192 2 \u2192 3 \u2192 4 shows the NEXT moment each time. Describe what CHANGED between panels.
- CONTINUITY BETWEEN PAGES: The first panel of each body page must continue from the last panel of the previous page. If the location is the same, describe it identically. If the location changed, the narration must explain the transition.

=== TITLE AND DIALOGUE SEPARATION (CRITICAL) ===
- The comic title "${title || "Comic Title"}" is ONLY for the cover page visual \u2014 it appears as stylized lettering on the cover art
- Characters must NEVER say, repeat, reference, or mention the comic title in their dialogue on ANY page
- Dialogue should be natural conversation \u2014 people do not say the name of the story they are in
- If the title describes the plot (e.g. "The Great Adventure"), characters should NOT say "this is a great adventure" or similar phrases that echo the title
- Narration boxes should also NOT repeat or reference the title \u2014 use original narration text`;
    let story = checkpoint.story;
    if (!story) {
      job.progress = Math.max(job.progress, 10);
      await saveJobToDb(job);
      const storyContent = await generateTextWithProvider(storySystemPrompt, storyPromptText, { type: "json_object" });
      if (!storyContent)
        throw new Error("No story content generated");
      const parsed = JSON.parse(storyContent);
      story = parsed;
      checkpoint.story = parsed;
      job.title = parsed.title || title;
      job.progress = 20;
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    } else {
      job.title = story.title || job.title || title;
    }
    if (!story)
      throw new Error("No story content generated");
    const geminiApiKey = aiSettings2.geminiImage.apiKey || aiSettings2.storyTextProvider.geminiApiKey;
    if (!geminiApiKey) {
      throw new Error("Gemini API key not configured. Required for full-page generation mode.");
    }
    const selectedModelKey = aiSettings2.geminiImage.defaultModel || "gemini25Flash";
    const modelConfig = aiSettings2.geminiImage.models[selectedModelKey];
    const modelId = modelConfig?.modelId || aiSettings2.geminiImage.model || "gemini-2.5-flash-image";
    const styleDesc = styleDescriptions[style] || styleDescriptions.Comic;
    const stylizedCharacters = /* @__PURE__ */ new Map();
    for (const saved of checkpoint.stylized || []) {
      if (saved.url) {
        const imageResponse = await fetch(saved.url);
        if (!imageResponse.ok)
          continue;
        const mime = (imageResponse.headers.get("content-type") || saved.mimeType || "image/png").split(";")[0];
        stylizedCharacters.set(saved.name, {
          base64: Buffer.from(await imageResponse.arrayBuffer()).toString("base64"),
          mimeType: mime
        });
      } else if (saved.base64) {
        stylizedCharacters.set(saved.name, { base64: saved.base64, mimeType: saved.mimeType });
      }
    }
    if (charactersWithImages.length > 0) {
      console.log(`=== GEMINI FULL-PAGE: Transforming ${charactersWithImages.length} character(s) into ${style} style ===`);
      job.progress = 15;
      await saveJobToDb(job);
      for (const charData of charactersWithImages) {
        if (stylizedCharacters.has(charData.name))
          continue;
        try {
          let rawBase64;
          let rawMime = "image/png";
          if (charData.imageUri.startsWith("data:")) {
            const match = charData.imageUri.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              rawMime = match[1];
              rawBase64 = match[2];
            } else
              continue;
          } else {
            const imgResponse = await fetch(charData.imageUri);
            if (!imgResponse.ok)
              continue;
            const buffer = await imgResponse.arrayBuffer();
            rawBase64 = Buffer.from(buffer).toString("base64");
            const contentType = imgResponse.headers.get("content-type");
            if (contentType)
              rawMime = contentType.split(";")[0];
          }
          const transformPrompt = `Transform this person's photo into a ${styleDesc} character portrait.

CRITICAL INSTRUCTIONS:
- KEEP the EXACT same face: same face shape, same eye shape, same eye color, same nose, same mouth, same skin tone, same hair color, same hairstyle
- The person must be IMMEDIATELY RECOGNIZABLE \u2014 someone who knows this person should instantly say "that's them!"
- ONLY change the rendering style to ${style} \u2014 apply the art style's linework, coloring technique, and shading method
- Do NOT change, idealize, or beautify any facial features. Preserve every detail: freckles, dimples, moles, facial hair, glasses, scars, wrinkles, etc.
- Draw a portrait from shoulders up, face clearly visible and facing slightly toward camera
- Clean simple background (solid or simple gradient)
- The result should look like a professional ${style} character sheet portrait of THIS specific person
- DO NOT add any text, labels, or watermarks`;
          const transformUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const transformBody = {
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType: rawMime, data: rawBase64 } },
                { text: transformPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ["Image"],
              temperature: 0.4
            }
          };
          let stylizedBase64 = "";
          let stylizedMime = "image/png";
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              console.log(`Transforming "${charData.name}" to ${style} style (attempt ${attempt}/2)...`);
              const response = await fetch(transformUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transformBody)
              });
              if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini transform error (${response.status}): ${errText.substring(0, 200)}`);
              }
              const data = await response.json();
              const candidateParts = data.candidates?.[0]?.content?.parts;
              if (!candidateParts)
                throw new Error("No content parts in transform response");
              for (const part of candidateParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  stylizedMime = inlineData.mimeType || inlineData.mime_type || "image/png";
                  stylizedBase64 = inlineData.data;
                  break;
                }
              }
              if (stylizedBase64) {
                console.log(`Successfully transformed "${charData.name}" into ${style} style`);
                break;
              }
              throw new Error("No image data in transform response");
            } catch (err) {
              console.error(`Transform attempt ${attempt} for "${charData.name}" failed: ${err.message}`);
              if (attempt === 2) {
                console.warn(`Using raw photo for "${charData.name}" as fallback`);
                stylizedBase64 = rawBase64;
                stylizedMime = rawMime;
              } else {
                await new Promise((r) => setTimeout(r, 2e3));
              }
            }
          }
          stylizedCharacters.set(charData.name, { base64: stylizedBase64, mimeType: stylizedMime });
          checkpoint.stylized = Array.from(stylizedCharacters, ([name, image]) => {
            const previous = checkpoint.stylized?.find((row) => row.name === name);
            if (previous?.url) {
              return { name, mimeType: image.mimeType, base64: "", url: previous.url };
            }
            return { name, mimeType: image.mimeType, base64: image.base64 };
          });
          job.requestPayload = budget.payload();
          await saveJobToDb(job);
          if (await budget.shouldStop(job))
            return;
        } catch (err) {
          console.error(`Failed to process character "${charData.name}": ${err.message}`);
        }
      }
      console.log(`=== Character transformation complete: ${stylizedCharacters.size}/${charactersWithImages.length} stylized ===`);
    }
    const totalPages = Math.min(story.pages?.length || pagesCount, pagesCount);
    for (let i = 0; i < totalPages; i++) {
      const page = story.pages?.[i];
      if (!page)
        continue;
      if (job.pages.some((existing) => existing.pageNumber === i + 1))
        continue;
      const pageType = page.pageType || (i === 0 ? "cover" : i === totalPages - 1 ? "conclusion" : "body");
      const isCover = pageType === "cover";
      console.log(`=== GEMINI FULL-PAGE: Generating page ${i + 1}/${totalPages} (${pageType}) ===`);
      const dialogueText = (page.dialogues || []).map((d) => `${d.character}: "${d.text}"`).join("\n");
      const charactersInPage = page.characters_in_page || mainCharacterNames;
      let characterRefParts = [];
      const refCharsInPage = [];
      for (const charName of charactersInPage) {
        const stylized = stylizedCharacters.get(charName);
        const charInfo = allCharacters.find((c) => c.name === charName);
        const charDesc = charInfo?.description || "";
        if (stylized) {
          refCharsInPage.push({ name: charName, description: charDesc });
          const descLabel = charDesc ? ` Physical appearance: ${charDesc}.` : "";
          characterRefParts.push({
            text: `CHARACTER PORTRAIT #${refCharsInPage.length}: "${charName}".${descLabel} This is the ONLY correct face for "${charName}". Every time "${charName}" appears in a panel, they MUST have THIS exact face, hair, and skin tone. Do NOT use any other character's face for "${charName}":`
          });
          characterRefParts.push({
            inlineData: { mimeType: stylized.mimeType, data: stylized.base64 }
          });
        }
      }
      let characterDiffSection = "";
      if (refCharsInPage.length >= 2) {
        const diffLines = refCharsInPage.map((c, idx) => {
          const desc2 = c.description ? ` \u2014 ${c.description}` : "";
          return `  - "${c.name}" = Portrait #${idx + 1}${desc2}`;
        }).join("\n");
        characterDiffSection = `

CHARACTER DIFFERENTIATION (CRITICAL \u2014 DO NOT MIX UP CHARACTERS):
Each character is a DIFFERENT person with a UNIQUE face. NEVER swap their faces.
${diffLines}
- When multiple characters appear in the same panel, carefully check WHICH portrait matches WHICH character name before drawing
- "${refCharsInPage[0].name}" and "${refCharsInPage[1].name}" are DIFFERENT people \u2014 they must NOT look alike
- If a panel shows characters side by side, draw "${refCharsInPage[0].name}" using Portrait #1 and "${refCharsInPage[1].name}" using Portrait #2 \u2014 NEVER reverse them`;
      }
      const hasRefPhotos = characterRefParts.length > 0;
      const faceMatchReminder = hasRefPhotos ? `

CHARACTER CONSISTENCY (HIGHEST PRIORITY):
- Stylized character portraits have been provided above. Each character MUST look exactly like their portrait.
- These portraits are already in ${style} art style \u2014 match the face, hair, skin tone, and features precisely.
- The characters must be IMMEDIATELY RECOGNIZABLE as the same people from the portraits across every panel.
- Maintain consistent: face shape, eye shape & color, nose, mouth, skin tone, hair color & style, body type, and any unique features.
- Do NOT deviate from the character portraits. They are the GROUND TRUTH for character appearance.
- NEVER use one character's face on another character's body. Each character has their OWN unique face.${characterDiffSection}` : "";
      let pagePrompt;
      if (isCover) {
        pagePrompt = `Generate a comic book COVER PAGE as a single image. Do NOT include any title text, lettering, words, or written text of any kind. Only draw the artwork.

ART STYLE: ${styleDesc}

LAYOUT: Full page cover art. Main characters in dramatic heroic poses in the lower 60%. Rich atmospheric background. Leave the TOP 20% of the image relatively clean/simple (sky, gradient, atmospheric effect) as space where a title will be added later.

CHARACTERS: ${characterDescriptions || charactersInPage.join(", ")}
${faceMatchReminder}

REQUIREMENTS:
- Draw the comic book cover artwork ONLY \u2014 NO text, NO title, NO lettering anywhere
- Characters in dramatic poses, full body visible \u2014 faces must be clearly visible and MATCH the stylized portraits exactly
- Rich detailed background setting
- Professional comic book cover quality
- Use 9:16 portrait aspect ratio composition
- Keep the TOP 20% of the image as a clean area (sky, atmosphere, gradient) for title placement later
- CHARACTER FACES must match the provided stylized portraits faithfully \u2014 same person, same features, same art style`;
      } else {
        pagePrompt = `Generate a comic book PAGE as a single image with multiple panels and white gutters. Do NOT include any speech bubbles, dialogue text, narration boxes, or any written text at all. Only draw the artwork.

ART STYLE: ${styleDesc}

PAGE LAYOUT: ${page.layoutDescription || "Standard 4-panel comic page layout"}

CHARACTERS: ${characterDescriptions || charactersInPage.join(", ")}
Emotional tone: ${page.emotionalTone || "dramatic"}
${faceMatchReminder}

CRITICAL REQUIREMENTS:
- Draw the comic page as ONE image with panel borders and THICK WHITE GUTTERS (at least 3-4% of image width) between panels
- Also leave a WHITE BORDER/MARGIN around the entire page \u2014 at least 3% on all four sides
- Do NOT draw any speech bubbles, text, dialogue, narration boxes, or any words \u2014 leave the panels clean with artwork only
- Each panel shows a DIFFERENT SEQUENTIAL MOMENT in the scene \u2014 like consecutive frames of a movie, flowing left-to-right, top-to-bottom
- Characters must look CONSISTENT across all panels AND match the stylized character portraits provided
- CHARACTER FACES must faithfully reproduce the features from the stylized portraits \u2014 this is the highest priority
- Professional comic book page quality with clear, thick panel borders
- Use 9:16 portrait aspect ratio composition
- Leave EMPTY SPACE in the upper area of each panel (sky, ceiling, open area) where speech bubbles will be added later \u2014 do not fill the top 20-25% of panels with important character details
- Make it look like a real published comic book page minus the text

CHARACTER DUPLICATION RULES (CRITICAL \u2014 NO CLONING):
- Each named character may appear AT MOST ONCE per panel \u2014 NEVER draw the same character twice in a single panel
- If there are 2 characters, each panel should show at most 2 distinct people \u2014 one matching each portrait
- Do NOT duplicate, clone, or mirror any character within a panel
- If the layout says a character speaks in a panel, draw them ONCE in that panel, not multiple times
- Check each panel before finalizing: count the characters \u2014 if you see the same face twice, remove the duplicate`;
      }
      const parts = [...characterRefParts, { text: pagePrompt }];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
      const body = {
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["Image"],
          temperature: 1
        }
      };
      let pageImageUrl = "";
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Page ${i + 1} attempt ${attempt}/${maxRetries} with Gemini ${modelId}...`);
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini error (${response.status}): ${errText.substring(0, 200)}`);
          }
          const data = await response.json();
          const candidates = data.candidates;
          if (!candidates || candidates.length === 0)
            throw new Error("No image candidates");
          const candidateParts = candidates[0]?.content?.parts;
          if (!candidateParts)
            throw new Error("No content parts");
          for (const part of candidateParts) {
            const inlineData = part.inlineData || part.inline_data;
            if (inlineData) {
              const mime = inlineData.mimeType || inlineData.mime_type || "image/png";
              pageImageUrl = `data:${mime};base64,${inlineData.data}`;
              break;
            }
          }
          if (pageImageUrl) {
            console.log(`Page ${i + 1} generated successfully`);
            break;
          }
          throw new Error("Response did not contain image data");
        } catch (err) {
          console.error(`Page ${i + 1} attempt ${attempt} failed: ${err.message}`);
          if (attempt === maxRetries) {
            console.error(`All retries exhausted for page ${i + 1}`);
          } else {
            await new Promise((r) => setTimeout(r, 3e3));
          }
        }
      }
      if (isCover && pageImageUrl && job.title) {
        console.log(`Page ${i + 1} PASS 2: Adding title "${job.title}" to cover...`);
        try {
          const coverBase64 = pageImageUrl.replace(/^data:image\/\w+;base64,/, "");
          const coverMime = pageImageUrl.match(/^data:(image\/\w+);/)?.[1] || "image/png";
          const titleOverlayPrompt = `You are given a comic book cover image with character artwork but NO title text. Your job is to ADD the title text on top of this existing artwork.

TITLE TO ADD: "${job.title}"

CRITICAL RULES:
- Add the title "${job.title}" as LARGE, BOLD, stylized comic book lettering
- Place the title in the UPPER portion of the image where there is clean/open space
- The title must be CENTERED horizontally
- Use dramatic comic book title typography \u2014 bold, with outline or drop shadow for contrast
- DO NOT change, redraw, or alter the existing artwork \u2014 ONLY add the title text on top
- DO NOT add any other text, speech bubbles, or captions \u2014 ONLY the title

TITLE PLACEMENT (ABSOLUTELY CRITICAL):
- The title MUST be 100% within the image boundaries \u2014 every single letter fully visible
- Keep at least 10% margin from the left edge and 10% margin from the right edge
- Keep at least 5% margin from the top edge
- If the title is long (more than 15 characters), SHRINK the font size or WRAP onto two lines to fit within the safe area
- NEVER let any letter get cut off or extend beyond any edge of the image
- The entire title must be readable in one glance \u2014 no missing or clipped characters
- Test mentally: if you drew a rectangle around all the title text, that rectangle must be fully inside the image with margins on all sides`;
          const titleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const titleBody = {
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType: coverMime, data: coverBase64 } },
                { text: titleOverlayPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ["Image"],
              temperature: 0.4
            }
          };
          for (let titleAttempt = 1; titleAttempt <= 2; titleAttempt++) {
            try {
              const titleResponse = await fetch(titleUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(titleBody)
              });
              if (!titleResponse.ok) {
                const errText = await titleResponse.text();
                throw new Error(`Gemini title overlay error (${titleResponse.status}): ${errText.substring(0, 200)}`);
              }
              const titleData = await titleResponse.json();
              const titleParts = titleData.candidates?.[0]?.content?.parts;
              if (!titleParts)
                throw new Error("No content in title overlay response");
              for (const part of titleParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  const mime = inlineData.mimeType || inlineData.mime_type || "image/png";
                  pageImageUrl = `data:${mime};base64,${inlineData.data}`;
                  console.log(`Page ${i + 1} PASS 2: Title added successfully`);
                  break;
                }
              }
              break;
            } catch (err) {
              console.error(`Cover title attempt ${titleAttempt} failed: ${err.message}`);
              if (titleAttempt < 2)
                await new Promise((r) => setTimeout(r, 2e3));
              else
                console.warn(`Cover: Using artwork without title as fallback`);
            }
          }
        } catch (err) {
          console.error(`Cover title overlay error: ${err.message}. Using artwork as-is.`);
        }
      }
      if (!isCover && pageImageUrl && (dialogueText || page.narration)) {
        console.log(`Page ${i + 1} PASS 2: Adding speech bubbles with large readable text...`);
        try {
          const artBase64 = pageImageUrl.replace(/^data:image\/\w+;base64,/, "");
          const artMime = pageImageUrl.match(/^data:(image\/\w+);/)?.[1] || "image/png";
          const textOverlayPrompt = `You are given a comic book page with panels and artwork but NO speech bubbles or text. Your job is to ADD speech bubbles and narration boxes with dialogue text ON TOP of this existing artwork.

DIALOGUE TO ADD (as speech bubbles with tails pointing to the speaking character):
${dialogueText || "No dialogue"}

${page.narration ? `NARRATION TO ADD (as rectangular caption boxes at top or bottom of panels): "${page.narration}"` : ""}

CRITICAL RULES FOR TEXT:
- Add WHITE speech bubbles with BLACK text on top of the existing panel artwork
- Text MUST be VERY LARGE and BOLD \u2014 at least 3-4% of the total image height per letter
- Use thick, clean, uppercase comic book hand-lettering
- Each speech bubble must have a clear pointed TAIL pointing toward the speaking character
- Speech bubbles should be WHITE with a thin BLACK outline
- Text must FILL the speech bubble generously \u2014 no tiny text with excessive white space
- Narration boxes should be rectangular with a colored/shaded background and large bold text
- DO NOT change, redraw, or alter the existing artwork in any way \u2014 ONLY add speech bubbles and text on top
- DO NOT move, resize, or modify any panels or characters
- Place speech bubbles in the upper portion of panels where possible, not covering character faces
- Every piece of dialogue listed above MUST appear as a speech bubble \u2014 do not skip any
- The text must be easily readable on a small mobile phone screen

BUBBLE PLACEMENT (HIGHEST PRIORITY \u2014 ABSOLUTELY NO CLIPPING):
- Imagine the ENTIRE IMAGE has an invisible safe zone that starts 8% from the left edge, 8% from the right edge, 5% from the top, and 5% from the bottom
- EVERY speech bubble and narration box must be ENTIRELY within this safe zone \u2014 no exceptions
- If a character is near the edge of a panel, place the speech bubble IN THE CENTER of the panel and use a LONG CURVED TAIL to connect it
- NEVER place a bubble touching or near any edge of the image \u2014 always keep generous margins
- If space is tight, use SMALLER bubbles with FEWER words rather than placing anything near an edge
- Before finalizing each bubble: verify all 4 sides of the bubble are well inside the safe zone

PANEL BORDER RESPECT (CRITICAL \u2014 ZERO TOLERANCE):
- The image has white gutters/borders separating panels \u2014 these are NO-GO ZONES for speech bubbles
- Each speech bubble must be ENTIRELY WITHIN the artwork area of a single panel \u2014 NOT touching, overlapping, or crossing any white gutter line
- Imagine each panel has its own internal safe zone: 10% inset from each of its 4 edges \u2014 place bubbles within that inner area only
- Do NOT place a bubble that spans two panels, sits on a gutter, or has any part extending into an adjacent panel
- If a panel is small, use a SMALLER bubble \u2014 never let a bubble spill outside its panel
- Narration boxes must also stay within panel boundaries`;
          const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const textBody = {
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType: artMime, data: artBase64 } },
                { text: textOverlayPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ["Image"],
              temperature: 0.4
            }
          };
          for (let textAttempt = 1; textAttempt <= 2; textAttempt++) {
            try {
              const textResponse = await fetch(textUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(textBody)
              });
              if (!textResponse.ok) {
                const errText = await textResponse.text();
                throw new Error(`Gemini text overlay error (${textResponse.status}): ${errText.substring(0, 200)}`);
              }
              const textData = await textResponse.json();
              const textParts = textData.candidates?.[0]?.content?.parts;
              if (!textParts)
                throw new Error("No content in text overlay response");
              for (const part of textParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  const mime = inlineData.mimeType || inlineData.mime_type || "image/png";
                  pageImageUrl = `data:${mime};base64,${inlineData.data}`;
                  console.log(`Page ${i + 1} PASS 2: Speech bubbles added successfully`);
                  break;
                }
              }
              break;
            } catch (err) {
              console.error(`Page ${i + 1} text overlay attempt ${textAttempt} failed: ${err.message}`);
              if (textAttempt < 2)
                await new Promise((r) => setTimeout(r, 2e3));
              else
                console.warn(`Page ${i + 1}: Using artwork without text overlay as fallback`);
            }
          }
        } catch (err) {
          console.error(`Page ${i + 1} text overlay error: ${err.message}. Using artwork as-is.`);
        }
      }
      job.pages.push({
        pageNumber: i + 1,
        pageType,
        imageUrl: pageImageUrl,
        panelImages: void 0,
        scenes: {
          description: page.layoutDescription || "",
          dialogue: dialogueText || ""
        },
        panels: (page.dialogues || []).map((d, idx) => ({
          description: d.text || "",
          dialogue: `${d.character}: ${d.text}`,
          cameraAngle: ""
        })),
        generationMode: "gemini-fullpage"
      });
      const pageProgress = 20 + (i + 1) / totalPages * 70;
      job.progress = Math.round(pageProgress);
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    }
    console.log(`Job ${jobId} completed with ${job.pages.length} full pages via Gemini`);
    if (job.userId && !job.savedToLibrary) {
      try {
        await syncJobPagesToS3Library(job, { publish: true });
        job.savedToLibrary = true;
      } catch (saveError) {
        console.error("Failed to publish comic draft to library:", saveError);
        await tryIngestJobPagesToS3BeforeDiscard(job);
        await discardLibraryComicDraftIfUnused(job);
        try {
          const comic = await createUserComicS3Only(job.userId, {
            title: job.title || "Untitled Comic",
            style: job.style || "Comic",
            characterNames: job.characterNames || [],
            pages: job.pages
          });
          job.libraryComicId = comic.id;
          job.savedToLibrary = true;
          job.pages = comic.pages;
        } catch (fallbackErr) {
          console.error("Library fallback save also failed:", fallbackErr);
        }
      }
    }
    job.progress = 100;
    job.status = "completed";
    await saveJobToDb(job);
    if (job.userId) {
      try {
        await sendComicCompleteNotification(job.userId, job.title || "Your Comic");
      } catch (notifError) {
        console.error("Failed to send comic completion notification:", notifError);
      }
    }
  } catch (error) {
    console.error("Gemini full-page generation error:", error);
    job.status = "failed";
    job.error = error.message || "Generation failed";
    await tryIngestJobPagesToS3BeforeDiscard(job);
    await discardLibraryComicDraftIfUnused(job);
    await saveJobToDb(job);
    await refundCreditsForFailedJob(job);
  }
}
async function refundCreditsForFailedJob(job) {
  if (!job.userId)
    return;
  const description = `Refund: generation failed (${job.id})`;
  try {
    const [alreadyRefunded] = await db.select({ id: creditTransactions.id }).from(creditTransactions).where(
      and2(
        eq2(creditTransactions.usersId, job.userId),
        eq2(creditTransactions.type, "comic_refund"),
        eq2(creditTransactions.description, description)
      )
    ).limit(1);
    if (alreadyRefunded)
      return;
    const settings = await storage.getCreditSettings();
    const numPages = job.pagesCount ?? 6;
    const additionalPages = Math.max(0, numPages - 1);
    const totalCost = settings.baseCost + additionalPages * settings.costPerPage;
    await storage.updateUserCredits(job.userId, totalCost);
    await storage.recordTransaction(job.userId, totalCost, "comic_refund", description);
    console.log(`Refunded ${totalCost} credits to user ${job.userId} after generation failure`);
  } catch (refundError) {
    console.error("Failed to refund credits:", refundError);
  }
}
function buildNarrativeArcForFullPage(totalPages) {
  const parts = [];
  parts.push(`PAGE 1 - COVER:
  Purpose: Title page and first impression. Movie poster composition.
  Content: Title in bold stylized lettering at top. All main characters in dramatic/heroic poses. Background hints at the story setting and mood.
  Panels: 1 full-page image.`);
  if (totalPages <= 3) {
    parts.push(`PAGE 2 - INTRODUCTION + CONFLICT + CLIMAX:
  Purpose: The entire story arc in one page \u2014 set up the world, introduce the problem, and reach the peak moment.
  Story beats: Panel 1-2: Introduce characters in their normal setting with a calm opening. Panel 3: The inciting incident \u2014 something disrupts their world. Panel 4-5: Characters react and confront the challenge. Final panel: The climactic moment \u2014 highest tension.
  Dialogue flow: Start with casual/friendly dialogue, shift to urgent/dramatic as conflict appears, end with intense/action dialogue.
  Page-turn hook: End on the peak moment so the reader MUST turn to see how it resolves.
  Panels: 4-6 panels.`);
    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Resolve the conflict and deliver emotional payoff.
  Story beats: Panel 1: The aftermath of the climax \u2014 how was the challenge overcome? Panel 2-3: Characters react with relief, joy, or reflection. Final panel: A satisfying closing image \u2014 characters together, a new beginning, or a meaningful final moment.
  Dialogue flow: Start with relieved/triumphant dialogue, end with warm/reflective words. The last line should feel like a proper story ending.
  Panels: 3-5 panels.`);
  } else if (totalPages <= 5) {
    parts.push(`PAGE 2 - INTRODUCTION:
  Purpose: Establish the world and characters. Show normal life BEFORE the adventure begins.
  Story beats: Panel 1: Wide establishing shot of the setting \u2014 show where and when. Panel 2-3: Introduce each main character through action or dialogue that reveals their personality. Final panel: A subtle hint or foreshadowing of trouble ahead.
  Dialogue flow: Natural, conversational. Characters talk about their day, their plans, or their relationship. Dialogue should reveal who they are.
  Page-turn hook: End with a tease \u2014 a strange noise, an unexpected visitor, or an ominous sign.
  Panels: 4-5 panels.`);
    for (let p = 3; p < totalPages; p++) {
      const isLast = p === totalPages - 1;
      if (!isLast) {
        parts.push(`PAGE ${p} - RISING ACTION:
  Purpose: The conflict appears and escalates. Tension builds steadily.
  Story beats: Panel 1: Pick up EXACTLY where page ${p - 1} ended \u2014 same scene, same moment. Panel 2-3: The problem becomes clear \u2014 characters face an obstacle, threat, or challenge. Panel 4-5: Characters attempt to deal with it but things get worse or more complicated.
  Dialogue flow: Shift from curious/concerned to worried/determined. Characters discuss the problem, argue about solutions, or express fear.
  Page-turn hook: End on a moment of maximum danger or a dramatic revelation that demands the reader continue.
  Panels: 4-6 panels.`);
      } else {
        parts.push(`PAGE ${p} - CLIMAX:
  Purpose: The peak of the story \u2014 the most intense, dramatic, exciting page.
  Story beats: Panel 1: Continue directly from page ${p - 1}. Panel 2-3: The big confrontation, challenge, or decisive moment. Characters take bold action. Panel 4-5: The turning point \u2014 the moment everything changes. Victory, breakthrough, or sacrifice.
  Dialogue flow: Short, punchy, emotional. Action-driven lines. Battle cries, desperate pleas, or triumphant declarations.
  Page-turn hook: End at the moment of triumph or transformation \u2014 the reader turns to see the aftermath.
  Panels: 4-6 panels.`);
      }
    }
    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Wrap up the story with emotional payoff and a satisfying conclusion.
  Story beats: Panel 1: The immediate aftermath of the climax. Panel 2-3: Characters process what happened \u2014 celebration, relief, gratitude, or reflection. Final panel: A closing image that gives the reader a sense of completion \u2014 characters together, a peaceful scene, or a meaningful visual callback to the beginning.
  Dialogue flow: Warm, reflective. Characters express what the experience meant to them. The final dialogue line should feel like a proper ending \u2014 hopeful, funny, or emotionally resonant.
  Panels: 3-5 panels.`);
  } else {
    parts.push(`PAGE 2 - INTRODUCTION:
  Purpose: Establish the world and characters. The reader should understand WHO these people are and WHAT their normal life looks like.
  Story beats: Panel 1: Wide establishing shot showing the setting \u2014 time, place, atmosphere. Panel 2-3: Introduce each main character through action or dialogue that reveals personality and relationships. Final panel: Foreshadowing \u2014 a subtle hint that something is about to change.
  Dialogue flow: Warm, natural conversation. Characters reveal their personalities through how they speak to each other.
  Page-turn hook: End with an intriguing moment \u2014 something catches a character's attention, an unexpected arrival, or a mysterious discovery.
  Panels: 4-5 panels.`);
    const bodyEnd = totalPages - 1;
    const midpoint = Math.floor((3 + bodyEnd) / 2);
    for (let p = 3; p <= bodyEnd; p++) {
      if (p < midpoint) {
        const risingPart = p - 2;
        parts.push(`PAGE ${p} - RISING ACTION (Part ${risingPart}):
  Purpose: The conflict deepens and stakes get higher. Each page should be MORE tense than the last.
  Story beats: Panel 1: Continue DIRECTLY from page ${p - 1} \u2014 same scene, same moment, no time jumps. Panel 2-3: New obstacles, revelations, or complications make the situation worse. Characters struggle, argue, discover clues, or face setbacks. Final panel: A mini-cliffhanger or escalation that raises the stakes even further.
  Dialogue flow: Increasingly urgent. Characters shift from concerned to determined to desperate. Arguments, plans, and emotional reactions drive the dialogue.
  Page-turn hook: End on a moment where things just got significantly worse \u2014 a betrayal, a new threat, or a ticking clock.
  Panels: 4-6 panels.`);
      } else {
        const climaxPart = p - midpoint + 1;
        const totalClimaxPages = bodyEnd - midpoint + 1;
        const isFirstClimax = climaxPart === 1;
        const isLastClimax = p === bodyEnd;
        parts.push(`PAGE ${p} - CLIMAX (Part ${climaxPart} of ${totalClimaxPages}):
  Purpose: ${isFirstClimax ? "The big confrontation BEGINS. Maximum action and drama." : isLastClimax ? "The TURNING POINT. The decisive moment where the outcome is determined." : "The confrontation CONTINUES at peak intensity."}
  Story beats: Panel 1: ${isFirstClimax ? "The confrontation erupts \u2014 characters face the main challenge head-on." : `Continue directly from page ${p - 1} at full intensity.`} Panel 2-4: ${isFirstClimax ? "Back-and-forth action. Characters use their skills, make sacrifices, or discover inner strength." : isLastClimax ? "The final push. Characters give everything they have. The decisive blow, choice, or breakthrough happens." : "The battle/challenge continues with twists and reversals. Things seem hopeless before a glimmer of hope appears."} Final panel: ${isLastClimax ? "The moment of victory, resolution, or transformation. The main conflict is DECIDED." : "A dramatic moment that pushes the conflict even higher."}
  Dialogue flow: Short, punchy, emotional. Action lines, battle cries, desperate pleas, or triumphant declarations. Every word matters.
  ${isLastClimax ? "" : `Page-turn hook: End on a moment of maximum danger or a dramatic reversal.`}
  Panels: 4-6 panels.`);
      }
    }
    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Deliver the emotional payoff. Wrap up every story thread. Leave the reader satisfied.
  Story beats: Panel 1: The immediate aftermath of the climax \u2014 show the result. Panel 2-3: Characters react emotionally \u2014 celebration, relief, tears of joy, gratitude, or quiet reflection. Panel 4: A moment that echoes or contrasts with the beginning \u2014 showing how characters have grown or changed. Final panel: The closing image \u2014 characters together, a peaceful scene, or a meaningful visual that gives the story a sense of completion.
  Dialogue flow: Warm, reflective, and hopeful. Characters express gratitude, share what they learned, or look forward to the future. The LAST line of dialogue should feel like a real ending \u2014 memorable, emotional, or gently funny.
  Panels: 3-5 panels.`);
  }
  return parts.join("\n\n");
}
async function processComicJob(jobId, params, options) {
  await ensureAiSettingsLoaded();
  if (aiSettings2.comicGenerationMode === "gemini-fullpage") {
    console.log(`=== Using GEMINI FULL-PAGE generation mode ===`);
    return processComicJobGeminiFullPage(jobId, params, options);
  }
  console.log(`=== Using MULTI-MODEL generation mode ===`);
  const job = await getJobFromDb(jobId);
  if (!job || job.status === "completed")
    return;
  const budget = new JobStepBudget(params, options?.maxSteps);
  const checkpoint = budget.checkpoint;
  const { storyPrompt, style, characters: characters2, pagesCount, title, language } = params;
  const characterNames = (characters2 || []).map((c) => c.name).filter(Boolean);
  job.characterNames = characterNames;
  job.requestPayload = budget.payload();
  try {
    job.status = "processing";
    if (!checkpoint.story && job.pages.length === 0) {
      job.progress = 10;
    }
    await ensureLibraryComicDraftForJob(job, {
      title: job.title || title,
      style: job.style || style,
      characterNames
    });
    await saveJobToDb(job);
    const allCharacters = characters2 || [];
    const charactersWithImages = allCharacters.filter((c) => c.imageUri && (c.imageUri.startsWith("http") || c.imageUri.startsWith("data:"))).map((c) => ({ name: c.name, imageUri: c.imageUri, description: c.description || "" }));
    const characterReferenceImages = charactersWithImages.map((c) => c.imageUri);
    if (characterReferenceImages.length > 0) {
      console.log(`Found ${characterReferenceImages.length} character reference image(s) for visual consistency`);
      console.log(`Characters with images: ${charactersWithImages.map((c) => c.name).join(", ")}`);
    }
    const charsWithAnyImage = allCharacters.filter((c) => c.imageUri);
    if (charsWithAnyImage.length > 0 && charactersWithImages.length === 0) {
      console.warn(`\u26A0\uFE0F WARNING: ${charsWithAnyImage.length} character(s) had imageUri but ALL were filtered out!`);
      charsWithAnyImage.forEach((c) => {
        const prefix = c.imageUri ? c.imageUri.substring(0, 50) : "null";
        console.warn(`  - "${c.name}": imageUri starts with "${prefix}..." (length: ${c.imageUri?.length || 0})`);
      });
    } else if (allCharacters.length > 0 && charsWithAnyImage.length === 0) {
      console.warn(`\u26A0\uFE0F WARNING: ${allCharacters.length} character(s) sent but NONE had imageUri property`);
      allCharacters.forEach((c) => {
        console.warn(`  - "${c.name}": imageUri = ${c.imageUri === void 0 ? "undefined" : c.imageUri === null ? "null" : `"${String(c.imageUri).substring(0, 30)}"`}`);
      });
    }
    const characterOutfits = /* @__PURE__ */ new Map();
    if (checkpoint.outfits) {
      for (const [name, outfit] of Object.entries(checkpoint.outfits)) {
        characterOutfits.set(name, outfit);
      }
    } else if (charactersWithImages.length > 0) {
      console.log(`=== PHASE 0: Detecting outfits from uploaded character photos ===`);
      const outfitPromises = charactersWithImages.map(async (charData) => {
        const outfit = await detectOutfitFromPhoto(charData.imageUri, charData.name);
        return { name: charData.name, outfit };
      });
      const outfitResults = await Promise.all(outfitPromises);
      for (const result of outfitResults) {
        if (result.outfit) {
          characterOutfits.set(result.name, result.outfit);
        }
      }
      console.log(`=== PHASE 0 COMPLETE: Detected outfits for ${characterOutfits.size} character(s) ===`);
      checkpoint.outfits = Object.fromEntries(characterOutfits);
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    } else {
      checkpoint.outfits = {};
    }
    const characterDescriptions = (characters2 || []).map((c) => {
      if (c.description) {
        return `${c.name}: ${c.description}`;
      }
      return `${c.name} (${c.type})`;
    }).join("; ");
    const languageInstruction = language ? `IMPORTANT: Write ALL dialogue, narration, and text in ${language}.` : "";
    const titleInstruction = title ? `The comic title MUST be "${title}".` : "";
    const mainCharacterNames = (characters2 || []).map((c) => c.name).filter(Boolean);
    const characterNamesList = mainCharacterNames.length > 0 ? mainCharacterNames.join(", ") : "the main characters";
    const buildNarrativeArc = (totalPages2) => {
      const arc = [];
      arc.push({
        page: 1,
        role: "Cover",
        type: "cover",
        guidance: "Title + dramatic character poses. Show the main characters in heroic/dramatic poses with visual hints about the story theme. This is the reader's first impression.",
        cameraGuidance: "Wide dramatic shot, movie poster composition"
      });
      if (totalPages2 <= 3) {
        arc.push({
          page: 2,
          role: "Introduction + Rising Action + Climax",
          type: "body",
          guidance: "Quickly establish the world and characters, introduce the conflict, and build to the climactic moment. Pack the story arc tightly - every panel must drive the narrative forward rapidly.",
          cameraGuidance: "Mix of wide establishing shots transitioning to dynamic action shots and dramatic close-ups"
        });
        arc.push({
          page: 3,
          role: "Resolution / Conclusion",
          type: "conclusion",
          guidance: "The aftermath. Victory, problem solved, characters celebrate or reflect. Show the emotional payoff and a satisfying ending. Life returns to normal or a new normal is established.",
          cameraGuidance: "Medium shots for emotional moments, wide shot for final panel showing resolution"
        });
      } else if (totalPages2 === 4) {
        arc.push({
          page: 2,
          role: "Introduction + Rising Action",
          type: "body",
          guidance: "Set the scene, introduce characters, establish the world. Then the problem/threat appears - tension builds, characters react, stakes are revealed. Transition from calm to tension.",
          cameraGuidance: "Start with wide establishing shots to set the scene, then medium shots as tension builds, close-ups for character reactions"
        });
        arc.push({
          page: 3,
          role: "Climax / Confrontation",
          type: "body",
          guidance: "The BIG MOMENT. The fight scene, face-off, or critical challenge. Maximum action and drama. This is the most intense, visually dynamic page. Characters face their greatest obstacle.",
          cameraGuidance: "Dynamic action shots, dramatic low angles, intense close-ups, speed lines, impact frames"
        });
        arc.push({
          page: 4,
          role: "Resolution / Conclusion",
          type: "conclusion",
          guidance: "The aftermath. Victory, problem solved, characters celebrate or reflect. Show the emotional payoff and a satisfying ending.",
          cameraGuidance: "Medium shots for emotional moments, wide shot for final panel showing resolution"
        });
      } else {
        arc.push({
          page: 2,
          role: "Introduction",
          type: "body",
          guidance: "Set the scene. Introduce all main characters and establish the world. Show normal life BEFORE the adventure begins. Establish relationships between characters. The reader should understand who these characters are and what their world is like.",
          cameraGuidance: "Wide establishing shots to set the scene, medium shots for character introductions, warm lighting"
        });
        const bodyPages = totalPages2 - 3;
        const risingActionPages = Math.ceil(bodyPages / 2);
        const climaxPages = bodyPages - risingActionPages;
        for (let r = 0; r < risingActionPages; r++) {
          const pageNum = 3 + r;
          const isFirst = r === 0;
          const isLast = r === risingActionPages - 1;
          arc.push({
            page: pageNum,
            role: `Rising Action${risingActionPages > 1 ? ` (Part ${r + 1})` : ""}`,
            type: "body",
            guidance: isFirst ? "The problem or threat APPEARS. Something disrupts the characters' normal life. Tension begins to build, characters react with surprise or concern, and the stakes are revealed for the first time." : isLast ? "Tension reaches its peak BEFORE the climax. Characters prepare, gather allies, or make a crucial discovery. The situation feels increasingly dangerous or urgent. Build maximum anticipation." : "The conflict ESCALATES. New obstacles appear, characters face setbacks or make discoveries. Each panel should raise the stakes higher than the last. The threat grows more serious.",
            cameraGuidance: isFirst ? "Medium shots transitioning to dramatic angles as tension builds, close-ups on character reactions of surprise/worry" : "Increasingly dynamic angles, tilted frames for unease, close-ups showing determination or fear"
          });
        }
        for (let c = 0; c < climaxPages; c++) {
          const pageNum = 3 + risingActionPages + c;
          const isFirst = c === 0;
          arc.push({
            page: pageNum,
            role: `Climax / Confrontation${climaxPages > 1 ? ` (Part ${c + 1})` : ""}`,
            type: "body",
            guidance: isFirst ? "The BIG MOMENT begins. The fight scene, face-off, or critical challenge starts. Maximum action and drama. Characters confront the main obstacle head-on. This should be the most visually intense and exciting page." : "The climax CONTINUES. The battle/challenge reaches its peak. Show the turning point where the hero gains the upper hand or makes a breakthrough. Maximum visual impact and emotional intensity.",
            cameraGuidance: "Dynamic action shots, dramatic low angles, intense close-ups, speed lines, impact frames, bird's-eye views of the action"
          });
        }
        arc.push({
          page: totalPages2,
          role: "Resolution / Conclusion",
          type: "conclusion",
          guidance: "The aftermath. Victory achieved, problem solved, or lesson learned. Characters celebrate, reflect, or return to their normal lives changed by the experience. Show the emotional payoff - relief, joy, gratitude. End on a satisfying note that wraps up all story threads.",
          cameraGuidance: "Medium shots for emotional moments, character reactions of relief/joy, wide shot for the final panel showing characters together in their resolved world"
        });
      }
      return arc;
    };
    const narrativeArc = buildNarrativeArc(pagesCount);
    const narrativeInstructions = narrativeArc.map(
      (act) => `PAGE ${act.page} - ${act.role} (type: "${act.type}"):
  Story purpose: ${act.guidance}
  Camera/Visual style: ${act.cameraGuidance}`
    ).join("\n\n");
    const storyPromptText = `You are creating a ${pagesCount}-page ${style} style comic book with a compelling narrative arc.

CRITICAL: You MUST follow this story EXACTLY. Do not create a different story:
"${storyPrompt}"

${titleInstruction}
${languageInstruction}

=== MAIN CHARACTERS (User-Defined) ===
${characterDescriptions || "Create appropriate characters for this specific story"}

=== CHARACTER NAME RULES (CRITICAL) ===
1. The main characters are: ${characterNamesList}
2. ALWAYS use these EXACT names - never substitute, rename, or mix up character names
3. Each character's name is PERMANENT - ${mainCharacterNames.length > 0 ? mainCharacterNames.map((n) => `"${n}" is always "${n}"`).join(", ") : "keep names consistent"}
4. In dialogue, characters must refer to each other by their correct names

=== SUPPORTING CHARACTER RULES ===
When the story requires additional characters (shopkeepers, villagers, guards, strangers, etc.):
1. Create VISUALLY DISTINCT supporting characters - different clothing, body type, hair
2. Give them unique names like "Old Shopkeeper", "Village Elder", "Mysterious Stranger"
3. NEVER use a main character (${characterNamesList}) to represent a supporting role
4. Supporting characters must look completely different from main characters

=== VILLAIN/ANTAGONIST RULES ===
If the story includes a villain, antagonist, or recurring threat:
1. On FIRST appearance, provide a DETAILED visual description in "villainDescription" field
2. Include: clothing, distinctive features, colors, accessories, expression
3. In ALL subsequent panels with this villain, reference the same visual description
4. The villain must look IDENTICAL in every panel they appear
5. Example: "Dark hooded figure with glowing red eyes, black cloak with silver skull clasp, pale scarred face"

=== 5-ACT NARRATIVE ARC ===
Each page has a specific STORY PURPOSE. Follow this structure precisely:

${narrativeInstructions}

=== PANEL REQUIREMENTS PER PAGE ===
- Cover page (page 1): EXACTLY 1 panel
- All body pages: MINIMUM 3 panels, MAXIMUM 6 panels (NEVER 1 or 2)
- Conclusion page: MINIMUM 3 panels, MAXIMUM 5 panels
- If you create a body page with fewer than 3 panels, the comic will look empty and unprofessional

=== STORY FLOW RULES (CRITICAL \u2014 READ CAREFULLY) ===
1. PAGE-TO-PAGE CONTINUITY: Each page MUST pick up exactly where the previous page left off. No unexplained time jumps or scene changes between pages. If page 2 ends with a character opening a door, page 3 must start with what they see on the other side.
2. DIALOGUE PROGRESSION: Dialogue must flow like a real conversation across the comic. Characters react to what was JUST said. No repeating the same idea across pages. Each line moves the conversation and story forward.
3. CAUSE AND EFFECT: Every event should be caused by something that happened before. If a character is angry on page 4, something on page 3 made them angry. The reader should always understand WHY things are happening.
4. EMOTIONAL ARC: The emotional tone must shift naturally: calm/happy \u2192 curious/concerned \u2192 tense/worried \u2192 intense/dramatic \u2192 relieved/satisfied. Never jump from calm to intense without buildup.
5. PANEL-TO-PANEL FLOW: Within each page, panels should flow like a movie scene \u2014 like sequential frames of a film. Panel 1 leads to Panel 2 leads to Panel 3. Each panel shows the NEXT moment in time, not a random unrelated moment.
6. PAGE-TURN HOOKS: Every body page should end on a moment that makes the reader want to turn the page \u2014 a cliffhanger, a revelation, a dramatic reaction, or an unresolved moment.
7. NO FILLER: Every panel must advance the story. No panels that just show characters standing around with generic dialogue.
8. SINGLE COHERENT STORYLINE: The entire comic must tell ONE continuous story from start to finish. Do NOT introduce disconnected subplots or random scene changes.
9. CHARACTER ACTIONS MATTER: Show characters DOING things that move the plot \u2014 running, fighting, discovering, building, helping \u2014 not just talking. Mix action panels with dialogue panels.
10. LOGICAL CONSEQUENCES: If a character does something on one page, the NEXT page must show the consequences. Never skip over important moments.

=== PANEL RULES ===
- Each panel shows EXACTLY ONE instance of each character (no clones/duplicates)
- Use the camera guidance for each page's narrative role (see above)
- Each panel should have distinct dialogue or narration that fits the page's story purpose
- When a main character appears, ALWAYS include their name in the description
- When a villain appears, ALWAYS include their full visual description
- Panels on the SAME page should flow naturally - each panel leads to the next
- Each panel description MUST include: camera angle, character positions (left/right/center with facing direction), specific actions, detailed environment, and lighting/mood

=== EMOTIONAL PACING ===
- Introduction pages: Warm, calm, inviting tone. Characters are at ease.
- Rising Action pages: Growing tension, urgency, worry. Dialogue reflects increasing stakes.
- Climax pages: Peak intensity. Short, punchy dialogue. Maximum drama and action.
- Conclusion pages: Relief, warmth, satisfaction. Reflective dialogue.

Format your response as JSON:
{
  "title": "${title || "Comic Title"}",
  "villainDescription": "If story has a villain, provide FULL visual description here: clothing, colors, features, accessories. This MUST be referenced in every panel the villain appears.",
  "pages": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "narrativeRole": "Cover",
      "panels": [
        {
          "panelNumber": 1,
          "sceneDescription": "Cover art showing title '${title || "Comic Title"}' with main characters in dramatic poses, theme elements visible",
          "characterName": "Which main character is featured (use exact name from list)",
          "dialogue": "",
          "cameraAngle": "wide dramatic shot"
        }
      ]
    },
    {
      "pageNumber": 2,
      "pageType": "body",
      "narrativeRole": "Introduction",
      "panels": [
        {
          "panelNumber": 1,
          "sceneDescription": "Wide establishing shot of the setting...",
          "characterName": "First character name",
          "isVillain": false,
          "isSupportingCharacter": false,
          "dialogue": "Opening line establishing the world",
          "cameraAngle": "wide establishing shot"
        },
        {
          "panelNumber": 2,
          "sceneDescription": "Character introduction moment...",
          "characterName": "Second character name",
          "isVillain": false,
          "isSupportingCharacter": false,
          "dialogue": "Character-establishing dialogue",
          "cameraAngle": "medium shot"
        },
        {
          "panelNumber": 3,
          "sceneDescription": "Characters interacting in their normal world...",
          "characterName": "Character name",
          "isVillain": false,
          "isSupportingCharacter": false,
          "dialogue": "Dialogue showing relationships",
          "cameraAngle": "medium shot"
        },
        {
          "panelNumber": 4,
          "sceneDescription": "Hint of what's to come...",
          "characterName": "Character name",
          "isVillain": false,
          "isSupportingCharacter": false,
          "dialogue": "Foreshadowing line",
          "cameraAngle": "close-up"
        }
      ]
    }
  ]
}

REMEMBER: 
- Each page MUST serve its narrative purpose from the 5-Act structure above.
- Body pages MUST have 3-6 panels each.
- The story should feel like a JOURNEY with clear beginning, middle, and end.
- Emotional tone should shift naturally through the arc: calm -> tense -> intense -> relieved.`;
    job.progress = Math.max(job.progress, 20);
    job.requestPayload = budget.payload();
    await saveJobToDb(job);
    const storySystemPrompt = `You are a professional comic book story writer who creates compelling, well-paced narratives with natural dialogue flow. Your stories read like real published comics \u2014 each page connects smoothly to the next, dialogue feels natural and advances the plot, and the emotional arc builds from beginning to end.
CRITICAL: You must FOLLOW the user's story EXACTLY. Do not make up a different story.
If the user says "A knight saves a princess", you create panels about a knight saving a princess.
Always respond with valid JSON.

=== GOLD STANDARD EXAMPLE \u2014 Study this story's flow pattern ===
Here is a perfect 5-page comic story ("Immune") that demonstrates ideal narrative flow. Use this as your quality benchmark:

PAGE 1 (Cover): Hero stands defiantly, ally behind him, setting established visually.
PAGE 2 (World-building + Character): Establishes the world (everyone has powers), shows the hero's problem (he has none), introduces the mysterious ally watching from shadows, ends on the hero's frustration.
  - Panel flow: Wide city \u2192 hero alone at school \u2192 ally watching \u2192 close-up of hero's emotion
  - Dialogue builds: "Everyone is special except me" \u2192 "I'm suffocating" \u2192 "He's the key" \u2192 "I wish I could do something"
  - Each panel shows a DIFFERENT scene but they ALL serve ONE purpose: establishing who the hero is and why he matters

PAGE 3 (Inciting incident + Ally revealed): Villain appears stealing powers (NEWS on screen), villain shown in action (defeating a hero), ally arrives urgently to the hero, hero learns HE is the solution.
  - Panel flow: News report \u2192 villain in action \u2192 ally lands before hero \u2192 hero's shocked reaction
  - Dialogue escalates: "What's going on?" \u2192 "Power is mine!" \u2192 "You're the only one immune!" \u2192 "Me? But I'm..."
  - CAUSE-EFFECT: Villain steals powers (cause) \u2192 ally needs hero's help (effect) \u2192 hero is shocked (reaction)

PAGE 4 (Action + Confrontation): Ally transfers powers to hero, hero punches villain, hero charges again, villain fires back.
  - Panel flow: Power transfer \u2192 first punch \u2192 hero flying in \u2192 villain's counterattack
  - Dialogue is SHORT and ACTION-DRIVEN: "Take my strength!" \u2192 "Argh!" \u2192 "This ends now!" \u2192 "You cannot defeat me!"
  - Every panel is a CONSECUTIVE MOMENT in the fight \u2014 like frames of an action movie

PAGE 5 (Resolution + Emotional payoff): Villain defeated, heroes celebrating, ally acknowledges hero, hero finds new confidence.
  - Panel flow: Villain down \u2192 heroes celebrating \u2192 ally smiles \u2192 hero looks at city with confidence
  - Dialogue wraps up emotionally: "Impossible!" \u2192 "We did it" \u2192 "No, YOU did it" \u2192 "Maybe I'm not so ordinary after all"
  - SATISFYING ENDING: The hero's arc is complete \u2014 from feeling powerless to realizing his uniqueness IS his power

KEY PATTERNS TO REPLICATE:
- Each page has ONE clear purpose (world-build, incite, fight, resolve)
- Panels within a page flow like movie scenes \u2014 sequential moments, not random snapshots
- Dialogue gets progressively more intense: casual \u2192 concerned \u2192 urgent \u2192 action \u2192 reflective
- Every page ends on a moment that pulls you to the next page
- The LAST line of the comic echoes the hero's journey
=== END OF EXAMPLE ===`;
    let story = checkpoint.story;
    if (!story) {
      const storyContent = await generateTextWithProvider(storySystemPrompt, storyPromptText, { type: "json_object" });
      if (!storyContent) {
        throw new Error("No story content generated");
      }
      const parsed = JSON.parse(storyContent);
      story = parsed;
      checkpoint.story = parsed;
      job.title = parsed.title || title;
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    } else {
      job.title = story.title || job.title || title;
    }
    if (!story)
      throw new Error("No story content generated");
    const adaptedOutfits = /* @__PURE__ */ new Map();
    if (checkpoint.adaptedOutfits) {
      for (const [name, outfit] of Object.entries(checkpoint.adaptedOutfits)) {
        adaptedOutfits.set(name, outfit);
      }
    } else if (characterOutfits.size > 0) {
      console.log(`=== PHASE 0.5: Adapting outfits to story context ===`);
      const adaptPromises = Array.from(characterOutfits.entries()).map(async ([charName, originalOutfit]) => {
        const adaptedOutfit = await adaptOutfitToStory(originalOutfit, charName, storyPrompt, style);
        return { name: charName, outfit: adaptedOutfit };
      });
      const adaptResults = await Promise.all(adaptPromises);
      for (const result of adaptResults) {
        adaptedOutfits.set(result.name, result.outfit);
        console.log(`Outfit for "${result.name}": ${result.outfit}`);
      }
      console.log(`=== PHASE 0.5 COMPLETE: Adapted ${adaptedOutfits.size} outfit(s) to story ===`);
      checkpoint.adaptedOutfits = Object.fromEntries(adaptedOutfits);
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    } else {
      checkpoint.adaptedOutfits = {};
    }
    const storyPagesCount = story.pages?.length || pagesCount;
    for (let i = 0; i < storyPagesCount; i++) {
      const page = story.pages?.[i];
      if (!page)
        continue;
      const pageType = page.pageType || (i === 0 ? "cover" : i === storyPagesCount - 1 ? "conclusion" : "body");
      const panels = page.panels || [];
      const minPanels = pageType === "cover" ? 1 : 3;
      if (panels.length < minPanels && pageType !== "cover") {
        console.log(`Page ${i + 1} (${pageType}) has only ${panels.length} panels, expanding to ${minPanels}...`);
        const originalPanel = panels[0] || {
          sceneDescription: "A scene from the story",
          characterName: mainCharacterNames[0] || "the character",
          dialogue: "",
          cameraAngle: "wide shot"
        };
        const cameraAngles = ["wide shot", "close-up", "medium shot", "low angle", "high angle", "action shot"];
        while (panels.length < minPanels) {
          const panelNum = panels.length + 1;
          const newPanel = {
            panelNumber: panelNum,
            sceneDescription: `${originalPanel.sceneDescription} - ${cameraAngles[panelNum % cameraAngles.length]} perspective`,
            characterName: mainCharacterNames[panelNum % mainCharacterNames.length] || originalPanel.characterName,
            isVillain: false,
            isSupportingCharacter: false,
            dialogue: panelNum === 1 ? originalPanel.dialogue : "",
            cameraAngle: cameraAngles[panelNum % cameraAngles.length]
          };
          panels.push(newPanel);
        }
        page.panels = panels;
        console.log(`Page ${i + 1} now has ${panels.length} panels`);
      }
    }
    if (mainCharacterNames.length > 0) {
      const totalPages2 = story.pages?.length || 0;
      let panelsFixed = 0;
      for (let i = 0; i < totalPages2; i++) {
        const page = story.pages?.[i];
        if (!page || !page.panels)
          continue;
        const pageType = page.pageType || (i === 0 ? "cover" : i === totalPages2 - 1 ? "conclusion" : "body");
        for (let p = 0; p < page.panels.length; p++) {
          const panel = page.panels[p];
          if (panel.characterName) {
            const hasMatch = mainCharacterNames.some(
              (name) => panel.characterName.toLowerCase().includes(name.toLowerCase())
            );
            if (hasMatch)
              continue;
          }
          if (panel.isVillain)
            continue;
          if (panel.isSupportingCharacter)
            continue;
          const desc2 = (panel.sceneDescription || "").toLowerCase();
          const matchedNames = mainCharacterNames.filter(
            (name) => desc2.includes(name.toLowerCase())
          );
          if (matchedNames.length > 0) {
            panel.characterName = matchedNames.join(" and ");
            panelsFixed++;
          } else if (pageType === "cover") {
            panel.characterName = mainCharacterNames.join(" and ");
            panelsFixed++;
          } else {
            const charIndex = p % mainCharacterNames.length;
            panel.characterName = mainCharacterNames[charIndex];
            panelsFixed++;
          }
        }
      }
      if (panelsFixed > 0) {
        console.log(`=== POST-PROCESSING: Assigned characterName to ${panelsFixed} panel(s) across ${totalPages2} pages ===`);
      }
    }
    job.progress = 30;
    await saveJobToDb(job);
    const comicStyleCharacterMap = /* @__PURE__ */ new Map();
    for (const saved of checkpoint.comicCharacters || []) {
      comicStyleCharacterMap.set(saved.name, saved.imageUrl);
    }
    if (characterReferenceImages.length > 0 && aiSettings2.replicate.models.fluxKontextDev.enabled) {
      const useConsistentCharacter = aiSettings2.replicate.models.consistentCharacter.enabled;
      if (useConsistentCharacter) {
        console.log(`=== PHASE 1: Generating comic-style character versions using Consistent Character model ===`);
      } else {
        console.log(`=== PHASE 1: Generating comic-style character versions using FLUX Kontext ===`);
      }
      for (let charIdx = 0; charIdx < charactersWithImages.length; charIdx++) {
        const charData = charactersWithImages[charIdx];
        const refImage = charData.imageUri;
        const charName = charData.name || `Character ${charIdx + 1}`;
        if (comicStyleCharacterMap.has(charName))
          continue;
        const charDescription = charData.description || "";
        try {
          if (useConsistentCharacter) {
            console.log(`Generating comic-style version of "${charName}" using Consistent Character...`);
            const characterPrompt = `CRITICAL: Keep this person's face EXACTLY as it appears in the photo.

Preserve with 100% accuracy:
- Their exact face shape, jawline, chin
- Their exact nose, eyes, eyebrows, lips
- Their exact skin tone, hairstyle, hair color

Add subtle ${style} artistic styling only:
${style === "Comic" ? "Subtle comic shading, slightly enhanced colors. Keep face photo-realistic." : ""}
${style === "Manga" ? "Soft manga shading. Keep face photo-realistic, NO large anime eyes." : ""}
${style === "Manhwa" ? "Soft manhwa gradients. Keep face photo-realistic." : ""}
${charDescription ? `Character: ${charName} - ${charDescription}. ` : `Character: ${charName}. `}
Portrait, one person, centered, clean background. Face must be RECOGNIZABLE as the same person.`;
            const comicCharacterUrl = await generateImageWithConsistentCharacter(characterPrompt, refImage);
            if (comicCharacterUrl) {
              comicStyleCharacterMap.set(charName, comicCharacterUrl);
              console.log(`Successfully created comic-style version of "${charName}" with Consistent Character`);
            }
          } else {
            console.log(`Generating comic-style version of "${charName}" using FLUX Kontext...`);
            const characterTransformPrompt = `CRITICAL: Keep this person's face EXACTLY as it appears in the photo. Do NOT change their facial features.

Preserve with 100% accuracy:
- Their exact face shape, jawline, and chin
- Their exact nose shape and size
- Their exact eye shape, size, and spacing
- Their exact eyebrows
- Their exact lips and mouth shape
- Their exact skin tone
- Their exact hairstyle and hair color

Only add subtle ${style} artistic styling:
${style === "Comic" ? "Add subtle comic book shading and slightly enhanced colors. Keep face photo-realistic." : ""}
${style === "Manga" ? "Add soft manga-style shading. Keep face photo-realistic, do NOT add large anime eyes." : ""}
${style === "Manhwa" ? "Add soft manhwa gradients. Keep face photo-realistic with elegant lighting." : ""}
${style === "Graphic" ? "Add cinematic dramatic shading with muted colors. Keep face 100% photo-realistic - do NOT alter any facial features." : ""}
${style === "Kawaii" ? "Add soft pastel colors and cute aesthetic to background and clothing only. Keep face 100% photo-realistic with EXACT same proportions - do NOT make eyes bigger, do NOT change head size, do NOT alter any facial features." : ""}
${style === "Noir" ? "Convert to black and white with high contrast shadows. Keep face 100% photo-realistic - do NOT alter any facial features, only change lighting." : ""}
${style === "Anime" ? "Add vibrant colors and clean line art styling to background and clothing. Keep face 100% photo-realistic - do NOT make eyes bigger, do NOT alter any facial features." : ""}
${style === "Afro" ? "Add Afrofuturism styling with vibrant African-inspired colors to background and clothing. Keep face 100% photo-realistic - do NOT alter any facial features." : ""}

${charDescription ? `Character: ${charName} - ${charDescription}.` : `Character: ${charName}.`}

IMPORTANT: The face must be RECOGNIZABLE as the same person from the photo. 
Portrait style, one person, centered, clean background, upper body visible.
This person's identity must be preserved - someone who knows them should recognize them.`;
            const comicCharacterUrl = await generateImageWithKontext(characterTransformPrompt, refImage);
            if (comicCharacterUrl) {
              comicStyleCharacterMap.set(charName, comicCharacterUrl);
              console.log(`Successfully created comic-style version of "${charName}"`);
            }
          }
        } catch (charError) {
          console.error(`Failed to generate comic version of "${charName}":`, charError.message);
        }
        const charProgress = 30 + (charIdx + 1) / characterReferenceImages.length * 10;
        job.progress = Math.round(charProgress);
        checkpoint.comicCharacters = Array.from(comicStyleCharacterMap, ([name, imageUrl]) => ({
          name,
          imageUrl
        }));
        job.requestPayload = budget.payload();
        await saveJobToDb(job);
        if (await budget.shouldStop(job))
          return;
      }
      console.log(`=== PHASE 1 COMPLETE: Created ${comicStyleCharacterMap.size} comic-style character(s) ===`);
    }
    const stylePrompts = {
      Comic: "American comic book style, bold vibrant colors, dynamic action poses, halftone dots, thick black outlines, superhero aesthetic, professional comic art",
      Manga: "Japanese manga style, black and white with screen tones, expressive anime eyes, dramatic shading, clean linework, professional manga illustration",
      Manhwa: "Korean manhwa style, soft pastel colors, detailed character designs, modern webtoon aesthetic, romantic atmosphere, professional digital art",
      Graphic: "Mature graphic novel style, cinematic composition, realistic proportions, detailed dramatic shading, muted color palette, dark atmospheric lighting, gritty textures, professional illustration like Watchmen or Sin City",
      Kawaii: "Kawaii chibi style, oversized heads with tiny bodies, huge sparkly eyes, exaggerated cute expressions, soft pastel colors, rounded bubbly shapes, adorable proportions, Japanese cute aesthetic",
      Noir: "Film noir style, strictly black and white only, high contrast dramatic shadows, silhouetted figures, moody atmospheric lighting, vintage detective aesthetic, film grain texture, 1940s crime drama feel",
      Anime: "Japanese anime style, full vibrant colors, large expressive eyes, dynamic poses, clean cel-shaded coloring, crisp line art, professional animation quality like Studio Ghibli or modern anime",
      Afro: "Afrofuturism art style, bold geometric African patterns, vibrant rich colors inspired by African heritage, futuristic sci-fi elements, tribal motifs fused with technology, cultural symbolism, dynamic composition"
    };
    const characterAnchors = /* @__PURE__ */ new Map();
    for (let i = 0; i < charactersWithImages.length; i++) {
      const charName = charactersWithImages[i].name;
      const comicStyleImage = comicStyleCharacterMap.get(charName);
      if (comicStyleImage) {
        characterAnchors.set(charName, comicStyleImage);
        console.log(`Anchor set for "${charName}" (comic-style) \u2192 matched by name`);
      } else if (charactersWithImages[i].imageUri) {
        characterAnchors.set(charName, charactersWithImages[i].imageUri);
        console.log(`Anchor set for "${charName}" (original photo fallback) \u2192 comic-style conversion was unavailable`);
      }
    }
    const villainDescription = story.villainDescription;
    if (checkpoint.villainDone) {
      if (checkpoint.villainAnchor) {
        characterAnchors.set("__VILLAIN__", checkpoint.villainAnchor);
      }
    } else if (villainDescription && villainDescription.length > 10) {
      console.log(`=== PHASE 1.5: Generating villain anchor image ===`);
      console.log(`Villain description: ${villainDescription}`);
      try {
        const villainPrompt = `${stylePrompts[style] || stylePrompts.Comic}.
Create a character portrait of this villain: ${villainDescription}.
Single character, centered, clear view of face and upper body.
Menacing expression, dramatic lighting.
This is a CHARACTER REFERENCE SHEET - make features clear and recognizable.
Professional illustration, high quality, NO text, NO speech bubbles.`;
        const villainAnchorUrl = await generateImage(villainPrompt);
        if (villainAnchorUrl) {
          characterAnchors.set("__VILLAIN__", villainAnchorUrl);
          checkpoint.villainAnchor = villainAnchorUrl;
          console.log(`Villain anchor image generated successfully`);
        }
      } catch (villainError) {
        console.error(`Failed to generate villain anchor: ${villainError.message}`);
      }
      checkpoint.villainDone = true;
      job.requestPayload = budget.payload();
      await saveJobToDb(job);
      if (await budget.shouldStop(job))
        return;
    } else {
      checkpoint.villainDone = true;
    }
    console.log(`=== ANCHOR MAP: ${characterAnchors.size} character(s) with anchors ===`);
    const totalPages = Math.min(story.pages?.length || pagesCount, pagesCount);
    const pageProgressStart = characterReferenceImages.length > 0 ? 40 : 30;
    const sanitizeForImage = (text2) => {
      if (!text2)
        return "A peaceful scene with characters in a beautiful setting";
      const safeText = text2.replace(/\b(fight|fights|fighting|battle|battles|attack|attacks|kill|kills|killed|death|die|dies|sword|weapon|gun|knife|blood|violent|violence|save|saves|rescue|rescues|saving|rescuing|capture|captures|kidnap|kidnaps|kidnapped|evil|villain|enemy|defeat|defeats|destroy|destroys)\b/gi, "").replace(/\s+/g, " ").trim();
      return safeText || "A peaceful scene with characters in a beautiful setting";
    };
    const generatePanelImage = async (panelDesc, panelIndex, panelMeta) => {
      const safeDesc = sanitizeForImage(panelDesc);
      const { characterName, isVillain, isSupportingCharacter, villainDescription: villainDescription2 } = panelMeta || {};
      const hasKontextEnabled = aiSettings2.replicate.models.fluxKontextDev.enabled;
      const hasSiliconFlowEnabled = aiSettings2.siliconflow.enabled && aiSettings2.siliconflow.apiKey;
      const hasAnyRefCapability = hasKontextEnabled || hasSiliconFlowEnabled;
      let namesInPanel = [];
      if (characterName) {
        if (characterName.toLowerCase().includes(" and ")) {
          namesInPanel = characterName.split(/\s+and\s+/i).map((n) => n.trim()).filter((n) => n);
        } else {
          namesInPanel = characterName.split(",").map((n) => n.trim()).filter((n) => n);
        }
      }
      const anchorRefs = [];
      const anchorNames = [];
      if (isVillain && characterAnchors.has("__VILLAIN__")) {
        anchorRefs.push(characterAnchors.get("__VILLAIN__"));
        anchorNames.push("The Villain");
        console.log(`Panel ${panelIndex}: Using VILLAIN anchor`);
      }
      for (const name of namesInPanel) {
        if (characterAnchors.has(name)) {
          anchorRefs.push(characterAnchors.get(name));
          anchorNames.push(name);
          console.log(`Panel ${panelIndex}: Using anchor for "${name}"`);
        }
      }
      if (anchorRefs.length === 0 && characterAnchors.size > 0 && !isSupportingCharacter) {
        const nonVillainAnchors = Array.from(characterAnchors.entries()).filter(([key]) => key !== "__VILLAIN__");
        if (nonVillainAnchors.length > 0) {
          const anchorIdx = panelIndex % nonVillainAnchors.length;
          const [anchorName, anchorUrl] = nonVillainAnchors[anchorIdx];
          anchorRefs.push(anchorUrl);
          anchorNames.push(anchorName);
          console.log(`Panel ${panelIndex}: Using rotated fallback anchor for "${anchorName}" (index ${anchorIdx}/${nonVillainAnchors.length})`);
        }
      }
      const charName = anchorNames[0] || characterName || "the character";
      const isVillainPanel = isVillain || charName === "The Villain";
      const char1Outfit = anchorNames[0] ? adaptedOutfits.get(anchorNames[0]) : void 0;
      const char2Outfit = anchorNames[1] ? adaptedOutfits.get(anchorNames[1]) : void 0;
      const primaryOutfit = char1Outfit || (charName !== "the character" ? adaptedOutfits.get(charName) : void 0);
      let panelPrompt;
      if (anchorRefs.length >= 2) {
        const char1Name = anchorNames[0] || "Character 1";
        const char2Name = anchorNames[1] || "Character 2";
        const outfitInstructions = [
          char1Outfit ? `"${char1Name}" is ${char1Outfit}` : null,
          char2Outfit ? `"${char2Name}" is ${char2Outfit}` : null
        ].filter(Boolean).join(". ");
        panelPrompt = `Wide shot, full body visible, camera pulled back to show complete figures head to toe with ample space above heads. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.

CAMERA: Wide-angle medium-long shot. Characters occupy only 60-70% of the frame height, leaving 15-20% empty space above their heads and 10-15% below their feet. Pull the virtual camera FAR BACK so full bodies are visible.

FACIAL ACCURACY - TWO DISTINCT CHARACTERS:
1. "${char1Name}" - EXACT LIKENESS of reference image 1. Same facial structure, eye shape, eye color, nose, lips, jawline, skin tone, hairstyle, hair color.
2. "${char2Name}" - EXACT LIKENESS of reference image 2. Same facial structure, eye shape, eye color, nose, lips, jawline, skin tone, hairstyle, hair color.

${outfitInstructions ? `OUTFIT CONSISTENCY: ${outfitInstructions}.` : ""}

RULES:
- FACE FIDELITY is more important than artistic style
- Show exactly 2 distinct people - NO duplicates, NO clones
- Both faces clearly visible, well-lit

Professional comic panel, detailed background, dynamic composition.
NO text, NO speech bubbles, NO words.`;
      } else if (isSupportingCharacter) {
        panelPrompt = `Wide shot, full body visible, camera pulled back with ample space above head. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
CAMERA: Wide-angle medium-long shot. Character occupies only 60-70% of frame height with 15-20% empty space above head.
This panel features a SUPPORTING CHARACTER.
They must look COMPLETELY DIFFERENT from main characters.
Different clothing, hair, body type.
SHOW EXACTLY ONE PERSON.
Professional comic panel, detailed background, dynamic pose.
NO text, NO speech bubbles, NO words, NO title text.`;
      } else {
        const outfitInstruction = primaryOutfit ? `OUTFIT: The character is ${primaryOutfit}. Maintain this outfit consistently.` : "";
        panelPrompt = `Wide shot, full body visible, camera pulled back to show complete figure head to toe with ample space above head. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
CAMERA: Wide-angle medium-long shot. Character occupies only 60-70% of frame height with 15-20% empty space above head and 10-15% below feet. Pull the virtual camera FAR BACK so the full body is visible.
${isVillainPanel ? "This is the VILLAIN of the story." : `This panel features "${charName}".`}
${outfitInstruction}
STRICT RULES:
1. Show EXACTLY ONE PERSON who looks like the reference image
2. The character MUST have the EXACT same face, hair, and features as the reference
3. Do NOT show the same person twice - no clones, no reflections, no duplicates
4. ONE instance of the character only
${isVillainPanel ? "Menacing villain presence, dramatic lighting." : ""}
Professional comic panel, detailed background, dynamic pose.
NO text, NO speech bubbles, NO words, NO title text.`;
      }
      const maxRetries = 3;
      const refsToUse = anchorRefs.length >= 2 ? anchorRefs.slice(0, 2) : anchorRefs.length === 1 ? [anchorRefs[0]] : void 0;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt === 1) {
            if (refsToUse && hasAnyRefCapability) {
              return await generateImage(panelPrompt, refsToUse);
            } else if (!isSupportingCharacter && !refsToUse) {
              const noAnchorPrompt = `Wide shot, full body visible, camera pulled back. ${stylePrompts[style] || stylePrompts.Comic}. 
Scene: ${safeDesc}. 
CAMERA: Wide-angle medium-long shot showing complete figures with ample empty space above heads.
${characterName ? `This panel features "${characterName}".` : ""}
${characterDescriptions ? `Main characters: ${characterDescriptions}.` : ""} 
${isVillain && villainDescription2 ? `Villain appearance: ${villainDescription2}.` : ""}
Beautiful illustration, detailed background, family-friendly, NO text, NO speech bubbles, NO words.`;
              return await generateImage(noAnchorPrompt);
            } else {
              return await generateImage(panelPrompt);
            }
          } else if (attempt === 2) {
            console.log(`Panel ${panelIndex}: Retry attempt ${attempt} with same anchor...`);
            await new Promise((resolve2) => setTimeout(resolve2, 2e3));
            if (refsToUse && hasAnyRefCapability) {
              return await generateImage(panelPrompt, refsToUse);
            } else {
              return await generateImage(panelPrompt);
            }
          } else if (attempt === 3) {
            console.log(`Panel ${panelIndex}: Retry attempt ${attempt} - trying alternate provider...`);
            if (refsToUse && refsToUse.length > 0) {
              if (hasSiliconFlowEnabled) {
                console.log(`Panel ${panelIndex}: Trying SiliconFlow as alternate provider`);
                return await generateImageWithSiliconFlow(panelPrompt, refsToUse);
              } else if (hasKontextEnabled) {
                console.log(`Panel ${panelIndex}: Trying Replicate Kontext as alternate provider`);
                return await generateImageWithKontext(panelPrompt, refsToUse[0]);
              }
            }
            console.log(`Panel ${panelIndex}: Final fallback - generating without anchor but with scene description`);
            const finalFallbackPrompt = `Wide shot, full body visible, camera pulled back. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
CAMERA: Wide-angle medium-long shot showing complete figures with ample empty space above heads.
${characterName ? `This panel features "${characterName}".` : ""}
${isVillainPanel && villainDescription2 ? `Villain appearance: ${villainDescription2}.` : ""}
${characterDescriptions ? `Character details: ${characterDescriptions}.` : ""}
Professional comic panel, detailed background, dynamic pose.
NO text, NO speech bubbles, NO words, NO title text.`;
            return await generateImage(finalFallbackPrompt);
          }
        } catch (error) {
          console.error(`Panel ${panelIndex} attempt ${attempt} failed: ${error.message}`);
          if (attempt === maxRetries) {
            console.log(`Panel ${panelIndex}: All retries exhausted, using scene-based fallback`);
            const emergencyPrompt = `${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
${characterName ? `Featuring ${characterName}.` : ""}
Professional comic illustration, detailed background.
NO text, NO speech bubbles, NO words.`;
            return await generateImage(emergencyPrompt);
          }
        }
      }
      return await generateImage(`${stylePrompts[style] || stylePrompts.Comic}. ${safeDesc}. Professional comic panel.`);
    };
    const generateCoverImage = async (coverDesc) => {
      const safeDesc = sanitizeForImage(coverDesc);
      try {
        const allCharNames = mainCharacterNames.length > 0 ? mainCharacterNames.join(" and ") : "the main characters";
        const hasKontextEnabled = aiSettings2.replicate.models.fluxKontextDev.enabled;
        const hasSiliconFlowEnabled = aiSettings2.siliconflow.enabled && aiSettings2.siliconflow.apiKey;
        const hasAnyRefCapability = hasKontextEnabled || hasSiliconFlowEnabled;
        const coverCharsWithImages = [];
        for (const charData of charactersWithImages) {
          const comicStyleImage = comicStyleCharacterMap.get(charData.name);
          const imageUrl = comicStyleImage || charData.imageUri;
          if (imageUrl) {
            coverCharsWithImages.push({ name: charData.name, imageUrl });
          }
        }
        const coverReferenceImages = coverCharsWithImages.map((c) => c.imageUrl);
        if (coverReferenceImages.length > 0 && hasAnyRefCapability) {
          let charsDescription = "";
          if (coverCharsWithImages.length >= 2) {
            charsDescription = `FACIAL ACCURACY IS THE #1 PRIORITY. This cover features ${coverCharsWithImages.length} main characters:`;
            coverCharsWithImages.forEach((char, idx) => {
              charsDescription += `
- "${char.name}" must be an EXACT LIKENESS of reference image ${idx + 1}. Replicate their PRECISE facial structure: eye shape, eye color, nose shape, lip shape, jawline, skin tone, hairstyle, hair color, eyebrow shape, and all distinguishing facial features.`;
            });
          } else {
            const name = coverCharsWithImages[0]?.name || "the hero";
            charsDescription = `FACIAL ACCURACY IS THE #1 PRIORITY. Show "${name}" as the main focus. Replicate their PRECISE facial structure from the reference image.`;
          }
          const coverOutfitDescriptions = coverCharsWithImages.map((char) => {
            const outfit = adaptedOutfits.get(char.name);
            return outfit ? `"${char.name}" is wearing: ${outfit}` : null;
          }).filter(Boolean).join(". ");
          const coverPrompt = `EXTREME WIDE SHOT, MOVIE POSTER COMPOSITION. Camera pulled far back. Full body visible from head to toe with large empty space above and around characters. ${stylePrompts[style] || stylePrompts.Comic}.
COMIC BOOK COVER ART: ${safeDesc}.

COMPOSITION RULES (CRITICAL):
- Characters occupy ONLY the LOWER 50-60% of the frame
- The UPPER 30-40% of the image MUST be open sky, background scenery, or atmospheric effects with NO characters \u2014 this space is reserved for the title
- Frame characters from a DISTANCE \u2014 show full bodies, feet touching ground, with at least 20% empty space on each side
- NEVER use close-up, medium close-up, or chest-up framing \u2014 always full-body or wider
- Think MOVIE POSTER layout: title area on top, characters posed below

${charsDescription}

${coverOutfitDescriptions ? `OUTFIT CONSISTENCY: ${coverOutfitDescriptions}.` : ""}

TITLE (MUST INCLUDE):
- Write the title "${job.title}" in LARGE BOLD STYLIZED COMIC BOOK LETTERING in the UPPER portion of the image
- Use a compact font size so the title fits within the top area with generous margin from all edges
- Comic book title typography: bold, dynamic, with outline or shadow for contrast against the background

RULES:
- Characters in heroic dramatic poses in the LOWER portion of the image
${coverCharsWithImages.length >= 2 ? `- ${coverCharsWithImages.length} DISTINCT individuals with DIFFERENT faces matching their reference images` : ""}
- Each character appears EXACTLY ONCE - no duplicates
- Faces clearly visible, well-lit
- Rich atmospheric background filling the upper portion behind the title
- NO speech bubbles`;
          console.log(`Generating cover with ${coverReferenceImages.length} reference image(s): ${coverCharsWithImages.map((c) => c.name).join(", ")}`);
          return await generateImage(coverPrompt, coverReferenceImages, "9:16");
        } else {
          const fallbackPrompt = `${stylePrompts[style] || stylePrompts.Comic}. 
EXTREME WIDE SHOT, MOVIE POSTER COMPOSITION. Comic book cover art.
${safeDesc}.
Featuring ${allCharNames} in heroic dramatic poses in the LOWER 50-60% of the image.
The title "${job.title}" MUST appear in LARGE BOLD STYLIZED COMIC BOOK LETTERING in the UPPER portion of the image with generous margin from all edges.
Full body shots from a distance, feet visible, generous space around characters.
${characterDescriptions ? `Characters: ${characterDescriptions}.` : ""} 
Each character is DISTINCT and appears only ONCE.
NO speech bubbles.
Dramatic professional cover art, eye-catching cinematic composition.`;
          return await generateImage(fallbackPrompt, void 0, "9:16");
        }
      } catch (error) {
        console.error(`Cover generation failed: ${error.message}`);
        const safePrompt = `${stylePrompts[style] || stylePrompts.Comic}. Comic book cover with dramatic scenery and bold title. Professional illustration.`;
        return await generateImage(safePrompt, void 0, "9:16");
      }
    };
    const storyVillainDescription = story.villainDescription || "";
    if (storyVillainDescription) {
      console.log(`Villain description captured: ${storyVillainDescription.substring(0, 100)}...`);
    }
    let totalPanels = 0;
    for (const page of story.pages || []) {
      totalPanels += page.panels?.length || 1;
    }
    let completedPanels = 0;
    for (let i = 0; i < totalPages; i++) {
      const page = story.pages?.[i];
      if (!page) {
        console.log(`Page ${i + 1} not found in story response, skipping`);
        continue;
      }
      if (job.pages.some((existing) => existing.pageNumber === i + 1)) {
        completedPanels += page.panels?.length || 1;
        continue;
      }
      const pageType = page.pageType || (i === 0 ? "cover" : i === totalPages - 1 ? "conclusion" : "body");
      const panels = page.panels || [{ sceneDescription: page.sceneDescription, dialogue: page.dialogue }];
      console.log(`=== Generating Page ${i + 1} (${pageType}) with ${panels.length} panel(s) ===`);
      if (budget.bounded()) {
        const stored = checkpoint.partialPanels?.pageNumber === i + 1 ? checkpoint.partialPanels.panels : [];
        const partials = stored.slice();
        if (partials.length < panels.length) {
          const panel = panels[partials.length];
          const panelIndex = partials.length;
          const desc2 = panel.sceneDescription || panel.description || "A scene from the story";
          const dialogue = panel.dialogue || "";
          const cameraAngle = panel.cameraAngle || "";
          let imageUrl = "";
          try {
            imageUrl = pageType === "cover" && panelIndex === 0 ? await generateCoverImage(desc2) : await generatePanelImage(desc2, i * 10 + panelIndex, {
              characterName: panel.characterName || void 0,
              isVillain: panel.isVillain || false,
              isSupportingCharacter: panel.isSupportingCharacter || false,
              villainDescription: storyVillainDescription || void 0
            });
          } catch (err) {
            console.error(`Panel ${panelIndex + 1} of page ${i + 1} failed:`, err.message);
          }
          partials.push({ imageUrl, desc: desc2, dialogue, cameraAngle });
          checkpoint.partialPanels = { pageNumber: i + 1, panels: partials };
          completedPanels += partials.length;
          const panelProgress = pageProgressStart + completedPanels / Math.max(totalPanels, 1) * (90 - pageProgressStart);
          job.progress = Math.max(job.progress, Math.round(panelProgress));
          job.requestPayload = budget.payload();
          await saveJobToDb(job);
          if (partials.length < panels.length) {
            if (await budget.shouldStop(job))
              return;
            continue;
          }
        }
        const finished = checkpoint.partialPanels?.panels || partials;
        job.pages.push({
          pageNumber: i + 1,
          pageType,
          imageUrl: finished[0]?.imageUrl || "",
          panelImages: finished.map((panel) => panel.imageUrl),
          scenes: {
            description: finished.map((panel) => panel.desc).join(" | "),
            dialogue: finished.map((panel) => panel.dialogue).filter((line) => line).join(" | ")
          },
          panels: finished.map((panel) => ({
            description: panel.desc,
            dialogue: panel.dialogue,
            cameraAngle: panel.cameraAngle
          })),
          generationMode: "multi-model"
        });
        checkpoint.partialPanels = void 0;
        job.requestPayload = budget.payload();
        await saveJobToDb(job);
        console.log(`Page ${i + 1} completed with ${finished.length} panel(s)`);
        if (await budget.shouldStop(job))
          return;
        continue;
      }
      const panelImages = [];
      const panelData = [];
      const panelTasks = panels.map((panel, p) => ({
        index: p,
        desc: panel.sceneDescription || panel.description || "A scene from the story",
        dialogue: panel.dialogue || "",
        cameraAngle: panel.cameraAngle || "",
        meta: {
          characterName: panel.characterName || void 0,
          isVillain: panel.isVillain || false,
          isSupportingCharacter: panel.isSupportingCharacter || false,
          villainDescription: storyVillainDescription || void 0
        },
        isCover: pageType === "cover" && p === 0
      }));
      const results = new Array(panels.length);
      const coverTask = panelTasks.find((t) => t.isCover);
      const regularTasks = panelTasks.filter((t) => !t.isCover);
      if (coverTask) {
        console.log(`Generating cover image...`);
        try {
          const coverImageUrl = await generateCoverImage(coverTask.desc);
          results[coverTask.index] = {
            imageUrl: coverImageUrl,
            desc: coverTask.desc,
            dialogue: coverTask.dialogue,
            cameraAngle: coverTask.cameraAngle
          };
          console.log(`Cover panel generated successfully`);
        } catch (err) {
          console.error(`Error generating cover:`, err.message);
          results[coverTask.index] = {
            imageUrl: "",
            desc: coverTask.desc,
            dialogue: coverTask.dialogue,
            cameraAngle: coverTask.cameraAngle
          };
        }
        completedPanels++;
        const coverProgress = pageProgressStart + completedPanels / totalPanels * (90 - pageProgressStart);
        job.progress = Math.round(coverProgress);
        await saveJobToDb(job);
      }
      if (regularTasks.length > 0) {
        const batches = chunkArray(regularTasks, PARALLEL_BATCH_SIZE);
        console.log(`Generating ${regularTasks.length} panels in ${batches.length} batch(es) of up to ${PARALLEL_BATCH_SIZE} panels`);
        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];
          console.log(`=== Batch ${batchIdx + 1}/${batches.length}: Generating ${batch.length} panels in parallel ===`);
          const batchPromises = batch.map(async (task) => {
            const panelLabel = `Panel ${task.index + 1}/${panels.length} for page ${i + 1}`;
            console.log(`Starting ${panelLabel}... (Character: ${task.meta.characterName || "unspecified"})`);
            try {
              const imageUrl = await generatePanelImage(task.desc, i * 10 + task.index, task.meta);
              console.log(`${panelLabel} generated successfully`);
              return {
                index: task.index,
                imageUrl,
                desc: task.desc,
                dialogue: task.dialogue,
                cameraAngle: task.cameraAngle,
                success: true
              };
            } catch (err) {
              console.error(`Error generating ${panelLabel}:`, err.message);
              return {
                index: task.index,
                imageUrl: "",
                desc: task.desc,
                dialogue: task.dialogue,
                cameraAngle: task.cameraAngle,
                success: false
              };
            }
          });
          const batchResults = await Promise.all(batchPromises);
          for (const result of batchResults) {
            results[result.index] = {
              imageUrl: result.imageUrl,
              desc: result.desc,
              dialogue: result.dialogue,
              cameraAngle: result.cameraAngle
            };
          }
          completedPanels += batch.length;
          const batchProgress = pageProgressStart + completedPanels / totalPanels * (90 - pageProgressStart);
          job.progress = Math.round(batchProgress);
          await saveJobToDb(job);
          console.log(`Batch ${batchIdx + 1} completed. Progress: ${job.progress}%`);
          if (batchIdx < batches.length - 1) {
            await new Promise((resolve2) => setTimeout(resolve2, BATCH_DELAY_MS));
          }
        }
      }
      for (const result of results) {
        if (result) {
          panelImages.push(result.imageUrl);
          panelData.push({
            description: result.desc,
            dialogue: result.dialogue,
            cameraAngle: result.cameraAngle
          });
        }
      }
      job.pages.push({
        pageNumber: i + 1,
        pageType,
        imageUrl: panelImages[0] || "",
        panelImages,
        scenes: {
          description: panelData.map((p) => p.description).join(" | "),
          dialogue: panelData.map((p) => p.dialogue).filter((d) => d).join(" | ")
        },
        panels: panelData,
        generationMode: "multi-model"
      });
      await saveJobToDb(job);
      console.log(`Page ${i + 1} completed with ${panelImages.length} panel(s)`);
      if (await budget.shouldStop(job))
        return;
    }
    console.log(`Job ${jobId} completed with ${job.pages.length} pages, total panels generated`);
    if (job.userId && !job.savedToLibrary) {
      try {
        await syncJobPagesToS3Library(job, { publish: true });
        job.savedToLibrary = true;
        console.log(`Comic auto-saved to library for user ${job.userId}`);
      } catch (saveError) {
        console.error("Failed to publish comic draft to library:", saveError);
        await tryIngestJobPagesToS3BeforeDiscard(job);
        await discardLibraryComicDraftIfUnused(job);
        try {
          const comic = await createUserComicS3Only(job.userId, {
            title: job.title || "Untitled Comic",
            style: job.style || "Comic",
            characterNames: job.characterNames || [],
            pages: job.pages
          });
          job.libraryComicId = comic.id;
          job.savedToLibrary = true;
          job.pages = comic.pages;
          console.log(`Comic auto-saved via fallback for user ${job.userId}`);
        } catch (fallbackErr) {
          console.error("Library fallback save also failed:", fallbackErr);
        }
      }
    }
    job.progress = 100;
    job.status = "completed";
    await saveJobToDb(job);
    if (job.userId) {
      try {
        await sendComicCompleteNotification(job.userId, job.title || "Your Comic");
        console.log(`Push notification sent to user ${job.userId} for comic completion`);
      } catch (notifError) {
        console.error("Failed to send comic completion notification:", notifError);
      }
    }
  } catch (error) {
    console.error("Comic generation error:", error);
    job.status = "failed";
    job.error = error.message || "Generation failed";
    await tryIngestJobPagesToS3BeforeDiscard(job);
    await discardLibraryComicDraftIfUnused(job);
    await saveJobToDb(job);
    await refundCreditsForFailedJob(job);
  }
}
async function runStartupDatabaseTasks() {
  const ready = await waitForDatabase();
  if (!ready) {
    return;
  }
  try {
    await storage.seedDefaultArtStyles();
  } catch (error) {
    console.error("[db] seedDefaultArtStyles failed:", error);
  }
}
async function registerRoutes(app2) {
  assertComicS3Configured();
  void runStartupDatabaseTasks();
  try {
    await ensureAiSettingsLoaded();
  } catch (error) {
    console.error("[ai-settings] Failed to load from database:", error);
  }
  if (process.env.NODE_ENV === "production") {
    app2.use((req, res, next) => {
      const proto = req.get("x-forwarded-proto");
      if (proto !== "https") {
        return res.status(426).json({ error: "HTTPS required" });
      }
      next();
    });
  }
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 20,
    message: { error: "Too many attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.get("/admin", (req, res) => {
    const adminHtml = fs.readFileSync(
      path.join(process.cwd(), "server/templates/admin.html"),
      "utf-8"
    );
    res.type("html").send(adminHtml);
  });
  app2.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = generateAdminToken();
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });
  app2.get("/api/admin/verify", (req, res) => {
    if (verifyAdminToken(req)) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  });
  app2.get("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      await ensureAiSettingsLoaded();
    } catch (error) {
      console.error("Error loading settings:", error);
      res.status(500).json({ error: "Failed to load settings" });
      return;
    }
    const settings = aiSettings2;
    const maskedSettings = {
      openai: {
        enabled: settings.openai.enabled,
        apiKey: settings.openai.apiKey ? "****" + settings.openai.apiKey.slice(-4) : "",
        isDefault: settings.openai.isDefault
      },
      replicate: {
        enabled: settings.replicate.enabled,
        apiKey: settings.replicate.apiKey ? "****" + settings.replicate.apiKey.slice(-4) : "",
        isDefault: settings.replicate.isDefault,
        models: settings.replicate.models,
        defaultModel: settings.replicate.defaultModel
      },
      siliconflow: {
        enabled: settings.siliconflow.enabled,
        apiKey: settings.siliconflow.apiKey ? "****" + settings.siliconflow.apiKey.slice(-4) : "",
        isDefault: settings.siliconflow.isDefault,
        models: settings.siliconflow.models
      },
      flux2pro: {
        enabled: settings.flux2pro.enabled,
        apiKey: settings.flux2pro.apiKey ? "****" + settings.flux2pro.apiKey.slice(-4) : "",
        isDefault: settings.flux2pro.isDefault,
        models: settings.flux2pro.models
      },
      stability: {
        enabled: settings.stability.enabled,
        apiKey: settings.stability.apiKey ? "****" + settings.stability.apiKey.slice(-4) : "",
        isDefault: settings.stability.isDefault
      },
      geminiImage: {
        enabled: settings.geminiImage.enabled,
        apiKey: settings.geminiImage.apiKey ? "****" + settings.geminiImage.apiKey.slice(-4) : "",
        model: settings.geminiImage.model,
        models: settings.geminiImage.models
      },
      defaultProvider: settings.defaultProvider,
      fallbackProvider: settings.fallbackProvider || null,
      panelGenerationProvider: settings.panelGenerationProvider || "siliconflow",
      comicGenerationMode: settings.comicGenerationMode || "multi-model",
      storyTextProvider: {
        ...settings.storyTextProvider,
        geminiApiKey: settings.storyTextProvider?.geminiApiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + settings.storyTextProvider.geminiApiKey.slice(-4) : ""
      }
    };
    res.json(maskedSettings);
  });
  app2.post("/api/admin/settings", requireAuth, async (req, res) => {
    try {
      const newSettings = req.body;
      await ensureAiSettingsLoaded();
      const currentSettings = structuredClone(aiSettings2);
      if (newSettings.openai.apiKey && !newSettings.openai.apiKey.startsWith("****")) {
        currentSettings.openai.apiKey = newSettings.openai.apiKey;
      }
      currentSettings.openai.enabled = newSettings.openai.enabled;
      if (newSettings.replicate.apiKey && !newSettings.replicate.apiKey.startsWith("****")) {
        currentSettings.replicate.apiKey = newSettings.replicate.apiKey;
      }
      currentSettings.replicate.enabled = newSettings.replicate.enabled;
      if (newSettings.replicate.models) {
        currentSettings.replicate.models = {
          ...currentSettings.replicate.models,
          ...newSettings.replicate.models
        };
      }
      if (newSettings.replicate.defaultModel) {
        currentSettings.replicate.defaultModel = newSettings.replicate.defaultModel;
      }
      if (newSettings.siliconflow) {
        if (newSettings.siliconflow.apiKey && !newSettings.siliconflow.apiKey.startsWith("****")) {
          currentSettings.siliconflow.apiKey = newSettings.siliconflow.apiKey;
        }
        currentSettings.siliconflow.enabled = newSettings.siliconflow.enabled;
        if (newSettings.siliconflow.models) {
          currentSettings.siliconflow.models = {
            ...currentSettings.siliconflow.models,
            ...newSettings.siliconflow.models
          };
        }
      }
      if (newSettings.flux2pro) {
        if (newSettings.flux2pro.apiKey && !newSettings.flux2pro.apiKey.startsWith("****")) {
          currentSettings.flux2pro.apiKey = newSettings.flux2pro.apiKey;
        }
        currentSettings.flux2pro.enabled = newSettings.flux2pro.enabled;
        if (newSettings.flux2pro.models) {
          currentSettings.flux2pro.models = {
            ...currentSettings.flux2pro.models,
            ...newSettings.flux2pro.models
          };
        }
      }
      if (newSettings.stability.apiKey && !newSettings.stability.apiKey.startsWith("****")) {
        currentSettings.stability.apiKey = newSettings.stability.apiKey;
      }
      currentSettings.stability.enabled = newSettings.stability.enabled;
      if (newSettings.geminiImage) {
        if (newSettings.geminiImage.apiKey && !newSettings.geminiImage.apiKey.startsWith("****")) {
          currentSettings.geminiImage.apiKey = newSettings.geminiImage.apiKey;
        }
        currentSettings.geminiImage.enabled = newSettings.geminiImage.enabled;
        if (newSettings.geminiImage.model) {
          currentSettings.geminiImage.model = newSettings.geminiImage.model;
        }
        if (newSettings.geminiImage.models) {
          currentSettings.geminiImage.models = {
            ...currentSettings.geminiImage.models,
            ...newSettings.geminiImage.models
          };
        }
      }
      currentSettings.defaultProvider = newSettings.defaultProvider;
      currentSettings.openai.isDefault = newSettings.defaultProvider === "openai";
      currentSettings.replicate.isDefault = newSettings.defaultProvider === "replicate";
      currentSettings.siliconflow.isDefault = newSettings.defaultProvider === "siliconflow";
      currentSettings.flux2pro.isDefault = newSettings.defaultProvider === "flux2pro";
      currentSettings.stability.isDefault = newSettings.defaultProvider === "stability";
      if (newSettings.panelGenerationProvider) {
        currentSettings.panelGenerationProvider = newSettings.panelGenerationProvider;
      }
      if (newSettings.comicGenerationMode) {
        currentSettings.comicGenerationMode = newSettings.comicGenerationMode;
      }
      if (newSettings.fallbackProvider !== void 0) {
        currentSettings.fallbackProvider = newSettings.fallbackProvider;
      }
      if (newSettings.storyTextProvider) {
        if (!currentSettings.storyTextProvider) {
          currentSettings.storyTextProvider = { provider: "openai", openaiModel: "gpt-4o", geminiModel: "gemini-2.0-flash", geminiApiKey: "", replicateModel: "meta/meta-llama-3-70b-instruct" };
        }
        if (newSettings.storyTextProvider.provider) {
          currentSettings.storyTextProvider.provider = newSettings.storyTextProvider.provider;
        }
        if (newSettings.storyTextProvider.openaiModel) {
          currentSettings.storyTextProvider.openaiModel = newSettings.storyTextProvider.openaiModel;
        }
        if (newSettings.storyTextProvider.geminiModel) {
          currentSettings.storyTextProvider.geminiModel = newSettings.storyTextProvider.geminiModel;
        }
        if (newSettings.storyTextProvider.geminiApiKey && !newSettings.storyTextProvider.geminiApiKey.startsWith("\u2022\u2022")) {
          currentSettings.storyTextProvider.geminiApiKey = newSettings.storyTextProvider.geminiApiKey;
        }
        if (newSettings.storyTextProvider.replicateModel) {
          currentSettings.storyTextProvider.replicateModel = newSettings.storyTextProvider.replicateModel;
        }
      }
      await saveSettings(currentSettings);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });
  app2.post("/api/auth/register", authRateLimiter, async (req, res) => {
    try {
      const { email, password, referralCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      let referrerId = null;
      if (referralCode && referralCode.trim()) {
        const referrer = await storage.getUserByReferralCode(referralCode.trim().toUpperCase());
        if (referrer && referrer.emailVerified) {
          referrerId = referrer.id;
        }
      }
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      const user = await storage.createUser(email, password, verificationCode, verificationCodeExpiresAt);
      if (referrerId) {
        await storage.setUserReferredBy(user.id, referrerId);
      }
      const token = generateUserToken(user.id);
      const emailResult = await sendVerificationEmail(email, verificationCode, "");
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
      }
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          userId: user.userId,
          credits: user.credits,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          emailVerified: user.emailVerified,
          referralCode: user.referralCode,
          adsWatchedToday: user.adsWatchedToday
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const validPassword = await bcrypt2.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateUserToken(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          userId: user.userId,
          emailVerified: user.emailVerified,
          credits: user.credits,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          referralCode: user.referralCode,
          adsWatchedToday: user.adsWatchedToday
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken, accessToken, referralCode } = req.body;
      if (!idToken && !accessToken) {
        return res.status(400).json({ error: "Google token is required" });
      }
      let googleEmail = null;
      let googleId = null;
      let name = null;
      if (idToken) {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!response.ok) {
          return res.status(401).json({ error: "Invalid Google token" });
        }
        const payload = await response.json();
        googleEmail = payload.email;
        googleId = payload.sub;
        name = payload.name;
      } else if (accessToken) {
        const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          return res.status(401).json({ error: "Invalid Google access token" });
        }
        const userInfo = await response.json();
        googleEmail = userInfo.email;
        googleId = userInfo.id;
        name = userInfo.name;
      }
      if (!googleEmail) {
        return res.status(400).json({ error: "Could not retrieve email from Google" });
      }
      let user = await storage.getUserByEmail(googleEmail);
      if (!user) {
        const tempPassword = crypto.randomBytes(32).toString("hex");
        user = await storage.createUser(googleEmail, tempPassword, void 0, void 0);
        await storage.setEmailVerified(user.id);
        if (referralCode && referralCode.trim()) {
          const referrer = await storage.getUserByReferralCode(referralCode.trim().toUpperCase());
          if (referrer && referrer.emailVerified) {
            await storage.setUserReferredBy(user.id, referrer.id);
          }
        }
        user = await storage.getUser(user.id);
      }
      if (!user) {
        return res.status(500).json({ error: "Failed to create or retrieve user" });
      }
      const token = generateUserToken(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          userId: user.userId,
          emailVerified: user.emailVerified,
          credits: user.credits,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          referralCode: user.referralCode,
          adsWatchedToday: user.adsWatchedToday
        }
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Google authentication failed" });
    }
  });
  app2.get("/api/auth/me", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        userId: user.userId,
        emailVerified: user.emailVerified,
        credits: user.credits,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        adsWatchedToday: user.adsWatchedToday,
        referralCode: user.referralCode
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.json({ success: true });
  });
  app2.post("/api/auth/verify-email", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }
      const result = await storage.verifyEmail(userId, code);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const user = await storage.getUser(userId);
      if (user) {
        const uniqueReferralCode = await storage.generateUniqueReferralCode();
        await storage.setUserReferralCode(user.id, uniqueReferralCode);
        if (user.referredBy) {
          const referrer = await storage.getUser(user.referredBy);
          if (referrer && referrer.emailVerified) {
            const referralSettings2 = await storage.getReferralSettings();
            if (referralSettings2.enabled) {
              let inviterCredits = referralSettings2.inviterCredits;
              let inviteeCredits = referralSettings2.inviteeCredits;
              let bountyId;
              const activeBounty = await storage.getActiveBountyForUser(referrer.id);
              if (activeBounty) {
                inviterCredits += activeBounty.bonusInviterCredits;
                inviteeCredits += activeBounty.bonusInviteeCredits;
                bountyId = activeBounty.id;
              }
              await storage.updateUserCredits(referrer.id, inviterCredits);
              await storage.recordTransaction(referrer.id, inviterCredits, "referral_bonus", `Referral bonus for inviting ${user.email}`);
              await storage.updateUserCredits(user.id, inviteeCredits);
              await storage.recordTransaction(user.id, inviteeCredits, "referral_bonus", `Welcome bonus from referral`);
              await storage.createReferralHistory({
                inviterId: referrer.id,
                inviterEmail: referrer.email,
                inviteeId: user.id,
                inviteeEmail: user.email,
                referralCode: referrer.referralCode || "",
                inviterCreditsAwarded: inviterCredits,
                inviteeCreditsAwarded: inviteeCredits,
                bountyId,
                status: "completed"
              });
            }
          }
        }
        sendWelcomeEmail(user.email).catch((err) => {
          console.error("Failed to send welcome email:", err);
        });
      }
      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });
  app2.post("/api/auth/resend-verification", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      const newCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await storage.resendVerificationCode(userId, newCode, expiresAt);
      const emailResult = await sendVerificationEmail(user.email, newCode, "");
      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
      }
      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  });
  app2.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ success: true, message: "If an account exists, a reset code will be sent" });
      }
      const resetCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await storage.setPasswordResetCode(email, resetCode, expiresAt);
      sendPasswordResetEmail(email, resetCode, "").catch((err) => {
        console.error("Failed to send password reset email:", err);
      });
      res.json({ success: true, message: "If an account exists, a reset code will be sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  app2.post("/api/auth/reset-password", authRateLimiter, async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code, and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const result = await storage.resetPassword(email, code, newPassword);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.get("/api/credits/settings", async (req, res) => {
    try {
      const settings = await storage.getCreditSettings();
      res.json({
        baseCost: settings.baseCost,
        costPerPage: settings.costPerPage,
        adsCreditsReward: settings.adsCreditsReward,
        maxAdsPerDay: settings.maxAdsPerDay,
        weeklyPlanCredits: settings.weeklyPlanCredits,
        weeklyPlanPrice: settings.weeklyPlanPrice,
        yearlyPlanCredits: settings.yearlyPlanCredits,
        yearlyPlanPrice: settings.yearlyPlanPrice,
        topUp1Credits: settings.topUp1Credits,
        topUp1Price: settings.topUp1Price,
        topUp2Credits: settings.topUp2Credits,
        topUp2Price: settings.topUp2Price,
        topUp3Credits: settings.topUp3Credits,
        topUp3Price: settings.topUp3Price
      });
    } catch (error) {
      const code = typeof error?.code === "string" ? error.code : "";
      const message = String(error?.message ?? error ?? "unknown error").replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-url]").replace(/(password|user|username)=([^\s&]+)/gi, "$1=[redacted]");
      console.error(
        "Get credit settings error:",
        code ? `${code} ${message}` : message
      );
      res.status(500).json({ error: "Failed to get credit settings" });
    }
  });
  app2.post("/api/credits/settings", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateCreditSettings(updates);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update credit settings error:", error);
      res.status(500).json({ error: "Failed to update credit settings" });
    }
  });
  app2.post("/api/credits/watch-ad", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const settings = await storage.getCreditSettings();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const lastAdDate = user.lastAdWatchDate ? String(user.lastAdWatchDate).split("T")[0] : null;
      const adsWatched = lastAdDate === today ? user.adsWatchedToday : 0;
      if (adsWatched >= settings.maxAdsPerDay) {
        return res.status(400).json({
          error: "Daily ad limit reached",
          adsWatchedToday: adsWatched,
          maxAdsPerDay: settings.maxAdsPerDay
        });
      }
      await storage.incrementAdsWatched(userId);
      const updatedUser = await storage.updateUserCredits(userId, settings.adsCreditsReward);
      await storage.recordTransaction(userId, settings.adsCreditsReward, "ad_reward", "Watched video ad");
      res.json({
        success: true,
        creditsEarned: settings.adsCreditsReward,
        newBalance: updatedUser?.credits || 0,
        adsWatchedToday: adsWatched + 1,
        adsRemaining: settings.maxAdsPerDay - (adsWatched + 1)
      });
    } catch (error) {
      console.error("Watch ad error:", error);
      res.status(500).json({ error: "Failed to process ad reward" });
    }
  });
  app2.post("/api/webhooks/revenuecat", async (req, res) => {
    try {
      const event = req.body;
      console.log("RevenueCat webhook:", JSON.stringify(event, null, 2));
      const userId = event.app_user_id;
      const user = await storage.getUserByEmail(userId);
      if (!user) {
        console.error("User not found for webhook:", userId);
        return res.status(200).json({ received: true });
      }
      const settings = await storage.getCreditSettings();
      switch (event.type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL": {
          const productId = event.product_id || "";
          let credits = 0;
          let plan = "";
          if (productId.includes("weekly")) {
            credits = settings.weeklyPlanCredits;
            plan = "weekly";
          } else if (productId.includes("yearly")) {
            credits = settings.yearlyPlanCredits;
            plan = "yearly";
          }
          if (credits > 0) {
            await storage.updateUserCredits(user.id, credits);
            await storage.recordTransaction(user.id, credits, "subscription", `${plan} subscription ${event.type === "RENEWAL" ? "renewal" : "purchase"}`);
          }
          break;
        }
        case "CANCELLATION":
        case "EXPIRATION":
          break;
      }
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(200).json({ received: true });
    }
  });
  app2.get("/api/credits/calculate", async (req, res) => {
    try {
      const pagesCount = parseInt(req.query.pages) || 2;
      const settings = await storage.getCreditSettings();
      const baseCost = settings.baseCost;
      const additionalPages = Math.max(0, pagesCount - 1);
      const additionalCost = additionalPages * settings.costPerPage;
      const totalCost = baseCost + additionalCost;
      res.json({
        pagesCount,
        baseCost,
        additionalCost,
        totalCost
      });
    } catch (error) {
      console.error("Calculate credits error:", error);
      res.status(500).json({ error: "Failed to calculate credits" });
    }
  });
  app2.post("/api/credits/deduct", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { pagesCount } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const settings = await storage.getCreditSettings();
      const baseCost = settings.baseCost;
      const additionalPages = Math.max(0, pagesCount - 1);
      const additionalCost = additionalPages * settings.costPerPage;
      const totalCost = baseCost + additionalCost;
      if (user.credits < totalCost) {
        return res.status(400).json({
          error: "Insufficient credits",
          required: totalCost,
          available: user.credits
        });
      }
      const updatedUser = await storage.updateUserCredits(userId, -totalCost);
      await storage.recordTransaction(userId, -totalCost, "comic_generation", `Generated ${pagesCount}-page comic`);
      res.json({
        success: true,
        creditsDeducted: totalCost,
        newBalance: updatedUser?.credits || 0
      });
    } catch (error) {
      console.error("Deduct credits error:", error);
      res.status(500).json({ error: "Failed to deduct credits" });
    }
  });
  app2.get("/api/credits/transactions", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const transactions = await storage.getUserTransactions(userId);
      res.json({ transactions });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });
  app2.get("/api/admin/users", requireAdminAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const sanitizedUsers = allUsers.map((u) => ({
        id: u.id,
        email: u.email,
        userId: u.userId,
        credits: u.credits,
        subscriptionStatus: u.subscriptionStatus,
        emailVerified: u.emailVerified,
        adsWatchedToday: u.adsWatchedToday,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
      res.json({ users: sanitizedUsers });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });
  app2.get("/api/admin/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });
  app2.post("/api/admin/users/:userId/update", requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { credits, subscriptionStatus } = req.body;
      const updatedUser = await storage.updateUserByAdmin(userId, { credits, subscriptionStatus });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user: {
        id: updatedUser.id,
        email: updatedUser.email,
        userId: updatedUser.userId,
        credits: updatedUser.credits,
        subscriptionStatus: updatedUser.subscriptionStatus
      } });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.get("/api/admin/credit-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getCreditSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get credit settings error:", error);
      res.status(500).json({ error: "Failed to get credit settings" });
    }
  });
  app2.post("/api/admin/credit-settings", requireAdminAuth, async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateCreditSettings(updates);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update credit settings error:", error);
      res.status(500).json({ error: "Failed to update credit settings" });
    }
  });
  app2.get("/api/admin/rate-limits", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getRateLimitSettings();
      res.json({ settings });
    } catch (error) {
      console.error("Get rate limit settings error:", error);
      res.status(500).json({ error: "Failed to get rate limit settings" });
    }
  });
  app2.post("/api/admin/rate-limits", requireAdminAuth, async (req, res) => {
    try {
      const { maxGenerationsPerHour, maxGenerationsPerDay, enabled } = req.body;
      const updates = {};
      if (maxGenerationsPerHour !== void 0)
        updates.maxGenerationsPerHour = maxGenerationsPerHour;
      if (maxGenerationsPerDay !== void 0)
        updates.maxGenerationsPerDay = maxGenerationsPerDay;
      if (enabled !== void 0)
        updates.enabled = enabled;
      const settings = await storage.updateRateLimitSettings(updates);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update rate limit settings error:", error);
      res.status(500).json({ error: "Failed to update rate limit settings" });
    }
  });
  app2.get("/api/admin/oauth-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getOAuthSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get OAuth settings error:", error);
      res.status(500).json({ error: "Failed to get OAuth settings" });
    }
  });
  app2.post("/api/admin/oauth-settings", requireAdminAuth, async (req, res) => {
    try {
      const { googleWebClientId, googleIosClientId, googleAndroidClientId, enabled } = req.body;
      const updates = {};
      if (googleWebClientId !== void 0)
        updates.googleWebClientId = googleWebClientId || null;
      if (googleIosClientId !== void 0)
        updates.googleIosClientId = googleIosClientId || null;
      if (googleAndroidClientId !== void 0)
        updates.googleAndroidClientId = googleAndroidClientId || null;
      if (enabled !== void 0)
        updates.enabled = enabled;
      const settings = await storage.updateOAuthSettings(updates);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update OAuth settings error:", error);
      res.status(500).json({ error: "Failed to update OAuth settings" });
    }
  });
  app2.get("/api/oauth-config", async (req, res) => {
    try {
      const settings = await storage.getOAuthSettings();
      if (!settings.enabled) {
        return res.json({ enabled: false });
      }
      res.json({
        enabled: true,
        googleWebClientId: settings.googleWebClientId,
        googleIosClientId: settings.googleIosClientId,
        googleAndroidClientId: settings.googleAndroidClientId
      });
    } catch (error) {
      console.error("Get OAuth config error:", error);
      res.status(500).json({ error: "Failed to get OAuth config" });
    }
  });
  app2.get("/api/admin/audit-logs", requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const userId = req.query.userId;
      const action = req.query.action;
      const result = await storage.getAuditLogs({ limit, offset, userId, action });
      res.json(result);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });
  app2.get("/api/admin/audit-stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getAuditStats();
      res.json({ stats });
    } catch (error) {
      console.error("Get audit stats error:", error);
      res.status(500).json({ error: "Failed to get audit stats" });
    }
  });
  app2.get("/api/referral/stats", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const stats = await storage.getUserReferralStats(userId);
      const settings = await storage.getReferralSettings();
      res.json({
        referralCode: stats.referralCode,
        totalReferrals: stats.totalReferrals,
        creditsEarned: stats.creditsEarned,
        inviterCredits: settings.inviterCredits,
        inviteeCredits: settings.inviteeCredits,
        enabled: settings.enabled
      });
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });
  app2.get("/api/referral/check/:code", async (req, res) => {
    try {
      const code = req.params.code?.toUpperCase();
      if (!code) {
        return res.json({ valid: false });
      }
      const user = await storage.getUserByReferralCode(code);
      if (user && user.emailVerified) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      console.error("Check referral code error:", error);
      res.status(500).json({ error: "Failed to check referral code" });
    }
  });
  app2.get("/api/admin/referral-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getReferralSettings();
      res.json({ settings });
    } catch (error) {
      console.error("Get referral settings error:", error);
      res.status(500).json({ error: "Failed to get referral settings" });
    }
  });
  app2.post("/api/admin/referral-settings", requireAdminAuth, async (req, res) => {
    try {
      const { inviterCredits, inviteeCredits, enabled } = req.body;
      const settings = await storage.updateReferralSettings({
        inviterCredits,
        inviteeCredits,
        enabled
      });
      res.json({ settings });
    } catch (error) {
      console.error("Update referral settings error:", error);
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });
  app2.get("/api/admin/referral-bounties", requireAdminAuth, async (req, res) => {
    try {
      const bounties = await storage.getAllReferralBounties();
      const enrichedBounties = await Promise.all(bounties.map(async (bounty) => {
        const userIds = bounty.userIds;
        const userEmails = [];
        for (const userId of userIds) {
          const user = await storage.getUser(String(userId));
          if (user) {
            userEmails.push(user.email);
          }
        }
        return {
          ...bounty,
          userEmail: userEmails.join(", ") || "Unknown",
          bonusCredits: bounty.bonusInviterCredits,
          expiresAt: bounty.endsAt
        };
      }));
      res.json({ bounties: enrichedBounties });
    } catch (error) {
      console.error("Get referral bounties error:", error);
      res.status(500).json({ error: "Failed to get referral bounties" });
    }
  });
  app2.post("/api/admin/referral-bounties", requireAdminAuth, async (req, res) => {
    try {
      const { name, description, userIds, userEmail, bonusInviterCredits, bonusInviteeCredits, startsAt, endsAt } = req.body;
      let resolvedUserIds = userIds;
      if (userEmail && !userIds) {
        const user = await storage.getUserByEmail(userEmail);
        if (!user) {
          return res.status(400).json({ message: "User not found with that email" });
        }
        resolvedUserIds = [user.id];
      }
      if (!name || !resolvedUserIds || !startsAt || !endsAt) {
        return res.status(400).json({ error: "Name, userIds (or userEmail), startsAt, and endsAt are required" });
      }
      const bounty = await storage.createReferralBounty({
        name,
        description,
        userIds: resolvedUserIds,
        bonusInviterCredits: bonusInviterCredits || 0,
        bonusInviteeCredits: bonusInviteeCredits || 0,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt)
      });
      res.json({ bounty });
    } catch (error) {
      console.error("Create referral bounty error:", error);
      res.status(500).json({ error: "Failed to create referral bounty" });
    }
  });
  app2.put("/api/admin/referral-bounties/:id", requireAdminAuth, async (req, res) => {
    try {
      const bountyId = parseInt(req.params.id);
      const { name, description, userIds, bonusInviterCredits, bonusInviteeCredits, startsAt, endsAt, enabled } = req.body;
      const updates = {};
      if (name !== void 0)
        updates.name = name;
      if (description !== void 0)
        updates.description = description;
      if (userIds !== void 0)
        updates.userIds = userIds;
      if (bonusInviterCredits !== void 0)
        updates.bonusInviterCredits = bonusInviterCredits;
      if (bonusInviteeCredits !== void 0)
        updates.bonusInviteeCredits = bonusInviteeCredits;
      if (startsAt !== void 0)
        updates.startsAt = new Date(startsAt);
      if (endsAt !== void 0)
        updates.endsAt = new Date(endsAt);
      if (enabled !== void 0)
        updates.enabled = enabled;
      const bounty = await storage.updateReferralBounty(bountyId, updates);
      if (!bounty) {
        return res.status(404).json({ error: "Bounty not found" });
      }
      res.json({ bounty });
    } catch (error) {
      console.error("Update referral bounty error:", error);
      res.status(500).json({ error: "Failed to update referral bounty" });
    }
  });
  app2.delete("/api/admin/referral-bounties/:id", requireAdminAuth, async (req, res) => {
    try {
      const bountyId = parseInt(req.params.id);
      const deleted = await storage.deleteReferralBounty(bountyId);
      if (!deleted) {
        return res.status(404).json({ error: "Bounty not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete referral bounty error:", error);
      res.status(500).json({ error: "Failed to delete referral bounty" });
    }
  });
  app2.get("/api/admin/referral-history", requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const { history, total } = await storage.getReferralHistory({ limit, offset });
      res.json({ history, total });
    } catch (error) {
      console.error("Get referral history error:", error);
      res.status(500).json({ error: "Failed to get referral history" });
    }
  });
  app2.get("/api/admin/referral-stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getReferralStats();
      res.json({ stats });
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });
  app2.get("/api/characters", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const characters2 = await storage.getUserCharacters(userId);
      const sanitized = characters2.map((c) => ({
        ...c,
        photoUri: typeof c.photoUri === "string" && c.photoUri.trim() && !isComicAssetUrl(c.photoUri.trim()) ? null : c.photoUri
      }));
      res.json({ characters: sanitized });
    } catch (error) {
      console.error("Get characters error:", error);
      res.status(500).json({ error: "Failed to get characters" });
    }
  });
  app2.post("/api/characters", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { name, photoUri } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const imgSize = getBase64ImageSize(photoUri);
      if (imgSize !== null && imgSize > MAX_CHARACTER_IMAGE_BYTES) {
        return res.status(400).json({ error: "Character image too large. Maximum size is 5MB." });
      }
      let storedPhotoUri;
      if (typeof photoUri === "string" && photoUri.trim()) {
        try {
          storedPhotoUri = await uploadCharacterPhotoToS3OrThrow(userId, photoUri.trim());
        } catch (e) {
          if (e instanceof ComicS3Error) {
            return res.status(e.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(e));
          }
          throw e;
        }
      }
      const character = await storage.createUserCharacter(userId, name, storedPhotoUri);
      res.json({ character });
    } catch (error) {
      console.error("Create character error:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });
  app2.post("/api/character-photos", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { photoUri } = req.body;
      if (typeof photoUri !== "string" || !photoUri.trim()) {
        return res.status(400).json({ error: "photoUri is required" });
      }
      const imgSize = getBase64ImageSize(photoUri);
      if (imgSize !== null && imgSize > MAX_CHARACTER_IMAGE_BYTES) {
        return res.status(400).json({ error: "Character image too large. Maximum size is 5MB." });
      }
      const url = await uploadCharacterPhotoToS3OrThrow(userId, photoUri.trim());
      res.json({ url });
    } catch (e) {
      if (e instanceof ComicS3Error) {
        return res.status(e.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(e));
      }
      console.error("Upload character photo error:", e);
      res.status(500).json({ error: "Failed to upload character photo" });
    }
  });
  app2.put("/api/characters/:id", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const characterId = parseInt(req.params.id);
      const { name, photoUri } = req.body;
      const updates = {};
      if (name !== void 0) {
        updates.name = name;
      }
      if (photoUri !== void 0) {
        if (photoUri === null || photoUri === "" || typeof photoUri === "string" && !photoUri.trim()) {
          updates.photoUri = null;
        } else if (typeof photoUri === "string") {
          const imgSize = getBase64ImageSize(photoUri);
          if (imgSize !== null && imgSize > MAX_CHARACTER_IMAGE_BYTES) {
            return res.status(400).json({ error: "Character image too large. Maximum size is 5MB." });
          }
          try {
            updates.photoUri = await uploadCharacterPhotoToS3OrThrow(userId, photoUri.trim());
          } catch (e) {
            if (e instanceof ComicS3Error) {
              return res.status(e.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(e));
            }
            throw e;
          }
        } else {
          return res.status(400).json({ error: "Invalid photoUri" });
        }
      }
      const character = await storage.updateUserCharacter(characterId, userId, updates);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ character });
    } catch (error) {
      console.error("Update character error:", error);
      res.status(500).json({ error: "Failed to update character" });
    }
  });
  app2.delete("/api/characters/:id", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const characterId = parseInt(req.params.id);
      const deleted = await storage.deleteUserCharacter(characterId, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete character error:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });
  app2.post("/api/test-s3", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const result = await uploadTestPngToS3(userId);
      res.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof ComicS3Error) {
        return res.status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(error));
      }
      console.error("Test S3 error:", error);
      res.status(500).json({ error: "S3 test failed" });
    }
  });
  app2.get("/api/comics", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const comics = await storage.getUserComicsLightweight(userId);
      res.json({ comics });
    } catch (error) {
      console.error("Get comics error:", error);
      res.status(500).json({ error: "Failed to get comics" });
    }
  });
  app2.get("/api/comics/:id/first-image", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid comic ID" });
      }
      const imageData = await storage.getComicFirstImageUrl(id, userId);
      if (imageData == null) {
        return res.status(404).json({ error: "Image not found" });
      }
      const trimmed = String(imageData).trim();
      if (!trimmed) {
        return res.status(404).json({ error: "Image not found" });
      }
      if (isComicAssetUrl(trimmed)) {
        console.log(`[PROXY] Fetching first-image from S3: ${trimmed}`);
        const imageResponse = await fetch(trimmed);
        if (!imageResponse.ok) {
          console.error(`[PROXY] Failed to fetch from S3: ${imageResponse.status}`);
          return res.status(404).json({ error: "Image not found on S3" });
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        let contentType = imageResponse.headers.get("content-type");
        if (!contentType || contentType === "application/octet-stream" || contentType === "binary/octet-stream") {
          const detected = detectImageMimeType(imageBuffer);
          contentType = detected || "image/png";
          console.log(`[PROXY] S3 Content-Type was "${imageResponse.headers.get("content-type")}", detected from bytes: ${contentType}`);
        }
        console.log(`[PROXY] Successfully proxying image, size: ${imageBuffer.byteLength} bytes, type: ${contentType}`);
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        const origin = req.headers.origin || "http://localhost:8081";
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.send(Buffer.from(imageBuffer));
      }
      return res.status(400).json({ error: "Invalid comic image URL" });
    } catch (error) {
      console.error("Get first comic image error:", error);
      res.status(500).json({ error: "Failed to get image" });
    }
  });
  app2.get("/api/comics/:id/page/:pageNum/panel/:panelNum/image", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const comicId = parseInt(req.params.id);
      const pageNum = parseInt(req.params.pageNum);
      const panelNum = parseInt(req.params.panelNum);
      if (isNaN(comicId) || isNaN(pageNum) || isNaN(panelNum)) {
        return res.status(400).json({ error: "Invalid parameters" });
      }
      const imageData = await storage.getComicPanelImage(comicId, userId, pageNum, panelNum);
      if (imageData == null) {
        return res.status(404).json({ error: "Image not found" });
      }
      const trimmed = String(imageData).trim();
      if (!trimmed) {
        return res.status(404).json({ error: "Image not found" });
      }
      if (isComicAssetUrl(trimmed)) {
        console.log(`[PROXY] Fetching panel image from S3: ${trimmed}`);
        const imageResponse = await fetch(trimmed);
        if (!imageResponse.ok) {
          console.error(`[PROXY] Failed to fetch from S3: ${imageResponse.status}`);
          return res.status(404).json({ error: "Image not found on S3" });
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get("content-type") || "image/png";
        console.log(`[PROXY] Successfully proxying image, size: ${imageBuffer.byteLength} bytes, type: ${contentType}`);
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        const origin = req.headers.origin || "http://localhost:8081";
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.send(Buffer.from(imageBuffer));
      }
      return res.status(400).json({ error: "Invalid comic image URL" });
    } catch (error) {
      console.error("Get panel image error:", error);
      res.status(500).json({ error: "Failed to get image" });
    }
  });
  app2.get("/api/comics/:id", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const idParam = req.params.id;
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid comic ID" });
      }
      const comic = await storage.getUserComicMetadata(id, userId);
      if (!comic) {
        return res.status(404).json({ error: "Comic not found" });
      }
      const lightweightPages = (comic.pagesMetadata || []).map((page, pageIndex) => ({
        pageNumber: page.pageNumber,
        pageType: page.pageType,
        panelCount: page.panelCount || 0,
        hasImageUrl: page.hasImageUrl,
        imageUrl: page.imageUrl ?? null,
        imageUri: page.imageUri ?? null,
        panelImages: page.panelImages ?? [],
        panels: page.panels,
        scenes: page.scenes,
        generationMode: page.generationMode,
        _pageIndex: pageIndex
      }));
      const lightweightComic = {
        id: comic.id,
        userId: comic.userId,
        title: comic.title,
        style: comic.style,
        characterNames: comic.characterNames,
        pages: lightweightPages,
        createdAt: comic.createdAt
      };
      res.json({ comic: lightweightComic });
    } catch (error) {
      console.error("Get comic error:", error);
      res.status(500).json({ error: "Failed to get comic" });
    }
  });
  app2.post("/api/comics", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { title, style, characterNames, pages } = req.body;
      if (!title || !style || !pages) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const comic = await createUserComicS3Only(userId, {
        title,
        style,
        characterNames: characterNames || [],
        pages
      });
      res.json({ comic });
    } catch (error) {
      if (error instanceof ComicS3Error) {
        return res.status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(error));
      }
      console.error("Save comic error:", error);
      res.status(500).json({ error: "Failed to save comic" });
    }
  });
  app2.put("/api/comics/:id", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const comicId = parseInt(req.params.id);
      const { title, pages } = req.body;
      if (isNaN(comicId)) {
        return res.status(400).json({ error: "Invalid comic ID" });
      }
      const existing = await storage.getUserComicById(comicId, userId);
      if (!existing) {
        return res.status(404).json({ error: "Comic not found" });
      }
      if (pages !== void 0) {
        const ingested = await ingestComicPagesToS3(userId, comicId, pages);
        const { pages: normalizedPages } = normalizeComicPagesOrder(ingested);
        const comic2 = await storage.updateUserComic(comicId, userId, { title, pages: normalizedPages });
        if (!comic2) {
          return res.status(404).json({ error: "Comic not found" });
        }
        return res.json({ comic: comic2 });
      }
      const comic = await storage.updateUserComic(comicId, userId, { title });
      if (!comic) {
        return res.status(404).json({ error: "Comic not found" });
      }
      return res.json({ comic });
    } catch (error) {
      if (error instanceof ComicS3Error) {
        return res.status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422).json(comicS3ErrorPayload(error));
      }
      console.error("Update comic error:", error);
      res.status(500).json({ error: "Failed to update comic" });
    }
  });
  app2.delete("/api/comics/:id", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const comicId = parseInt(req.params.id);
      const deleted = await storage.deleteUserComic(comicId, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Comic not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete comic error:", error);
      res.status(500).json({ error: "Failed to delete comic" });
    }
  });
  app2.post("/api/generate-comic", requireUserAuth, requireEmailVerified, async (req, res) => {
    console.log("=== generate-comic endpoint called ===");
    const userId = req.userId;
    const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    const body = req.body;
    const storyPrompt = sanitizeStoryPrompt(body.storyPrompt);
    const { style, characters: characters2, pagesCount, scenesPerPage, title, language } = body;
    if (!storyPrompt || !style) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const rateLimit2 = await storage.checkUserRateLimit(userId);
    if (!rateLimit2.allowed) {
      console.log(`User ${userId} rate limited: ${rateLimit2.reason}`);
      await storage.createAuditLog({
        userId,
        userEmail: user.email,
        action: "rate_limited",
        status: "blocked",
        pagesCount: pagesCount || 6,
        style,
        ipAddress,
        userAgent,
        errorMessage: rateLimit2.reason,
        metadata: {
          hourlyCount: rateLimit2.hourlyCount,
          dailyCount: rateLimit2.dailyCount,
          title
        }
      });
      return res.status(429).json({
        error: "Rate limit exceeded",
        code: "RATE_LIMITED",
        reason: rateLimit2.reason,
        hourlyCount: rateLimit2.hourlyCount,
        dailyCount: rateLimit2.dailyCount
      });
    }
    const settings = await storage.getCreditSettings();
    const numPages = pagesCount || 6;
    const additionalPages = Math.max(0, numPages - 1);
    const totalCost = settings.baseCost + additionalPages * settings.costPerPage;
    if (user.credits < totalCost) {
      console.log(`User ${userId} has insufficient credits: ${user.credits} < ${totalCost}`);
      await storage.createAuditLog({
        userId,
        userEmail: user.email,
        action: "insufficient_credits",
        status: "blocked",
        creditsUsed: 0,
        pagesCount: numPages,
        style,
        ipAddress,
        userAgent,
        errorMessage: `Needed ${totalCost} credits, had ${user.credits}`,
        metadata: { required: totalCost, available: user.credits, title }
      });
      return res.status(402).json({
        error: "Insufficient credits",
        code: "INSUFFICIENT_CREDITS",
        required: totalCost,
        available: user.credits,
        shortfall: totalCost - user.credits
      });
    }
    const updatedUser = await storage.updateUserCredits(userId, -totalCost);
    await storage.recordTransaction(userId, -totalCost, "comic_generation", `Generated ${numPages}-page ${style} comic: ${title || "Untitled"}`);
    console.log(`Deducted ${totalCost} credits from user ${userId}. New balance: ${updatedUser?.credits}`);
    const jobId = crypto.randomUUID();
    const characterNames = (characters2 || []).map((c) => c.name).filter(Boolean);
    const requestPayload = {
      storyPrompt,
      style,
      characters: characters2 || [],
      pagesCount: numPages,
      scenesPerPage,
      title,
      language
    };
    const job = {
      id: jobId,
      userId,
      status: "pending",
      progress: 0,
      title,
      style,
      pagesCount: numPages,
      pages: [],
      characterNames,
      requestPayload,
      createdAt: Date.now()
    };
    try {
      await ensureLibraryComicDraftForJob(job, { title, style, characterNames });
      await saveJobToDb(job);
    } catch (jobPersistErr) {
      console.error("Failed to persist comic job / S3 draft:", jobPersistErr);
      await storage.updateUserCredits(userId, totalCost);
      await storage.recordTransaction(
        userId,
        totalCost,
        "comic_generation_refund",
        "Refund: failed to initialize job (library draft / DB)"
      );
      return res.status(500).json({ error: "Could not start comic generation. Your credits were refunded." });
    }
    console.log(`Job ${jobId} queued for user ${userId}`);
    await storage.createAuditLog({
      userId,
      userEmail: user.email,
      action: "generation_started",
      status: "success",
      creditsUsed: totalCost,
      pagesCount: numPages,
      style,
      ipAddress,
      userAgent,
      metadata: { jobId, title, language, charactersCount: characters2?.length || 0 }
    });
    scheduleComicWorker();
    res.json({ jobId, creditsDeducted: totalCost, newBalance: updatedUser?.credits || 0 });
  });
  const handleJobStatus = async (req, res) => {
    const jobId = req.params.jobId;
    const verboseJobLog = process.env.JOB_STATUS_DEBUG === "1" || process.env.NODE_ENV !== "production";
    if (verboseJobLog) {
      const userAgent = req.headers["user-agent"] || "unknown";
      const clientIP = req.ip || req.headers["x-forwarded-for"] || "unknown";
      console.log(`[job] ${jobId} status poll from ${String(clientIP).slice(0, 40)} (${String(userAgent).slice(0, 50)})`);
    }
    const job = await getJobFromDb(jobId);
    if (!job) {
      if (verboseJobLog) {
        console.log(`[job] ${jobId} not found`);
      }
      return res.status(404).json({ error: "Job not found" });
    }
    if (job.status === "pending" || job.status === "processing") {
      scheduleComicWorker();
    }
    if (job.status === "completed" || job.status === "failed") {
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        title: job.title,
        pages: stripNonAssetImagesFromComicPagesJson(job.pages),
        error: job.error,
        savedToLibrary: job.savedToLibrary || false,
        libraryComicId: job.libraryComicId
      });
    } else {
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        title: job.title,
        pagesCompleted: job.pages?.length || 0,
        pagesTotal: job.pagesCount ?? null,
        error: job.error
      });
    }
  };
  app2.get("/api/job/:jobId", handleJobStatus);
  app2.post("/api/job/:jobId", handleJobStatus);
  app2.post("/api/generate-comic-sse", async (req, res) => {
    res.status(410).json({ error: "This endpoint is deprecated. Use /api/generate-comic instead." });
  });
  app2.post("/api/inspire-me", async (req, res) => {
    try {
      await ensureAiSettingsLoaded();
      const { genre, characters: characters2 } = req.body;
      const inspireSystemPrompt = 'You are a creative story idea generator. Generate 3 short, engaging story prompts suitable for comic creation. Each prompt should be 2-3 sentences. Respond with JSON: { "ideas": ["idea1", "idea2", "idea3"] }';
      const inspireUserPrompt = `Generate 3 unique comic story ideas${genre ? ` in the ${genre} genre` : ""}${characters2 ? ` featuring ${characters2}` : ""}. Make them fun, creative, and suitable for all ages.`;
      const content = await generateTextWithProvider(inspireSystemPrompt, inspireUserPrompt, { type: "json_object" });
      if (content) {
        res.json(JSON.parse(content));
      } else {
        res.json({ ideas: [] });
      }
    } catch (error) {
      console.error("Inspire me error:", error);
      res.status(500).json({ error: "Failed to generate ideas" });
    }
  });
  app2.get("/api/admin/ad-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getAdSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get ad settings error:", error);
      res.status(500).json({ error: "Failed to get ad settings" });
    }
  });
  app2.post("/api/admin/ad-settings", requireAdminAuth, async (req, res) => {
    try {
      const { maxImpressionsPerHour, maxImpressionsPerDay, enabled, exemptSubscribers } = req.body;
      const updates = {};
      if (maxImpressionsPerHour !== void 0)
        updates.maxImpressionsPerHour = maxImpressionsPerHour;
      if (maxImpressionsPerDay !== void 0)
        updates.maxImpressionsPerDay = maxImpressionsPerDay;
      if (enabled !== void 0)
        updates.enabled = enabled;
      if (exemptSubscribers !== void 0)
        updates.exemptSubscribers = exemptSubscribers;
      const settings = await storage.updateAdSettings(updates);
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Update ad settings error:", error);
      res.status(500).json({ error: "Failed to update ad settings" });
    }
  });
  app2.get("/api/admin/ads", requireAdminAuth, async (req, res) => {
    try {
      const ads = await storage.getAllAds();
      res.json({ ads });
    } catch (error) {
      console.error("Get ads error:", error);
      res.status(500).json({ error: "Failed to get ads" });
    }
  });
  app2.post("/api/admin/ads", requireAdminAuth, async (req, res) => {
    try {
      const { type, title, content, imageUrl, linkUrl, isActive } = req.body;
      if (!type || !title) {
        return res.status(400).json({ error: "Type and title are required" });
      }
      if (type === "text" && !content) {
        return res.status(400).json({ error: "Content is required for text ads" });
      }
      if (type === "banner" && !imageUrl) {
        return res.status(400).json({ error: "Image URL is required for banner ads" });
      }
      const ad = await storage.createAd({
        type,
        title,
        content,
        imageUrl,
        linkUrl,
        isActive
      });
      res.json({ ad });
    } catch (error) {
      console.error("Create ad error:", error);
      res.status(500).json({ error: "Failed to create ad" });
    }
  });
  app2.put("/api/admin/ads/:id", requireAdminAuth, async (req, res) => {
    try {
      const adId = parseInt(req.params.id);
      const { type, title, content, imageUrl, linkUrl, isActive } = req.body;
      const updates = {};
      if (type !== void 0)
        updates.type = type;
      if (title !== void 0)
        updates.title = title;
      if (content !== void 0)
        updates.content = content;
      if (imageUrl !== void 0)
        updates.imageUrl = imageUrl;
      if (linkUrl !== void 0)
        updates.linkUrl = linkUrl;
      if (isActive !== void 0)
        updates.isActive = isActive;
      const ad = await storage.updateAd(adId, updates);
      if (!ad) {
        return res.status(404).json({ error: "Ad not found" });
      }
      res.json({ ad });
    } catch (error) {
      console.error("Update ad error:", error);
      res.status(500).json({ error: "Failed to update ad" });
    }
  });
  app2.delete("/api/admin/ads/:id", requireAdminAuth, async (req, res) => {
    try {
      const adId = parseInt(req.params.id);
      const deleted = await storage.deleteAd(adId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete ad error:", error);
      res.status(500).json({ error: "Failed to delete ad" });
    }
  });
  app2.get("/api/ads", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const type = req.query.type;
      const user = await storage.getUser(userId);
      const isSubscriber = user?.subscriptionStatus === "active";
      const canShow = await storage.canShowAd(userId, isSubscriber);
      if (!canShow.allowed) {
        return res.json({ ad: null, reason: canShow.reason });
      }
      const adType = type || "text";
      const ad = await storage.getRandomAd(adType);
      if (!ad) {
        return res.json({ ad: null, reason: "No active ads available" });
      }
      res.json({ ad });
    } catch (error) {
      console.error("Get ad error:", error);
      res.status(500).json({ error: "Failed to get ad" });
    }
  });
  app2.post("/api/ads/impression", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { adId } = req.body;
      if (!adId) {
        return res.status(400).json({ error: "Ad ID is required" });
      }
      await storage.recordAdImpression(userId, adId);
      res.json({ success: true });
    } catch (error) {
      console.error("Record impression error:", error);
      res.status(500).json({ error: "Failed to record impression" });
    }
  });
  app2.post("/api/notifications/register", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { token, platform, deviceName } = req.body;
      if (!token || !platform) {
        return res.status(400).json({ error: "Token and platform are required" });
      }
      const result = await storage.registerPushToken(userId, token, platform, deviceName);
      res.json({ success: true, token: result });
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });
  app2.delete("/api/notifications/register", requireUserAuth, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      await storage.unregisterPushToken(token);
      res.json({ success: true });
    } catch (error) {
      console.error("Unregister push token error:", error);
      res.status(500).json({ error: "Failed to unregister push token" });
    }
  });
  app2.get("/api/notifications/preferences", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      let prefs = await storage.getNotificationPreferences(userId);
      if (!prefs) {
        prefs = await storage.updateNotificationPreferences(userId, {});
      }
      res.json(prefs);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });
  app2.post("/api/notifications/preferences", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const { comicComplete, lowCredits, referralSuccess, promotions } = req.body;
      const updates = {};
      if (typeof comicComplete === "boolean")
        updates.comicComplete = comicComplete;
      if (typeof lowCredits === "boolean")
        updates.lowCredits = lowCredits;
      if (typeof referralSuccess === "boolean")
        updates.referralSuccess = referralSuccess;
      if (typeof promotions === "boolean")
        updates.promotions = promotions;
      const prefs = await storage.updateNotificationPreferences(userId, updates);
      res.json(prefs);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });
  app2.get("/api/admin/notification-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      const tokenCount = await storage.getActiveTokenCount();
      res.json({ ...settings, activeDevices: tokenCount });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });
  app2.post("/api/admin/notification-settings", requireAdminAuth, async (req, res) => {
    try {
      const { enabled, lowCreditsThreshold } = req.body;
      const updates = {};
      if (typeof enabled === "boolean")
        updates.enabled = enabled;
      if (typeof lowCreditsThreshold === "number")
        updates.lowCreditsThreshold = lowCreditsThreshold;
      const settings = await storage.updateNotificationSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });
  app2.post("/api/admin/notifications/broadcast", requireAdminAuth, async (req, res) => {
    try {
      const { title, body, data } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }
      const result = await sendBroadcastNotification({ title, body, data });
      res.json(result);
    } catch (error) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ error: "Failed to send broadcast notification" });
    }
  });
  app2.get("/api/admin/notification-history", requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const history = await storage.getNotificationHistory(limit, offset);
      res.json({ history });
    } catch (error) {
      console.error("Get notification history error:", error);
      res.status(500).json({ error: "Failed to get notification history" });
    }
  });
  app2.get("/api/art-styles", requireUserAuth, async (req, res) => {
    try {
      const userId = req.userId;
      const styles = await storage.getArtStyles();
      const settings = await storage.getArtStyleSettings();
      const userUnlocks = await storage.getUserUnlockedStyles(userId);
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      const stylesWithStatus = styles.filter((s) => s.isActive).map((s) => ({
        ...s,
        isUnlocked: !s.isPremium || hasAll || userUnlocks.some((u) => u.styleId === s.id)
      }));
      res.json({ styles: stylesWithStatus, unlockAllCost: settings.unlockAllCost, allUnlocked: hasAll });
    } catch (error) {
      console.error("Get art styles error:", error);
      res.status(500).json({ error: "Failed to get art styles" });
    }
  });
  app2.post("/api/art-styles/:id/unlock", requireUserAuth, requireEmailVerified, async (req, res) => {
    try {
      const userId = req.userId;
      const styleId = parseInt(req.params.id);
      const styles = await storage.getArtStyles();
      const style = styles.find((s) => s.id === styleId);
      if (!style)
        return res.status(404).json({ error: "Style not found" });
      if (!style.isPremium)
        return res.status(400).json({ error: "Style is already free" });
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      if (hasAll)
        return res.status(400).json({ error: "All styles already unlocked" });
      const userUnlocks = await storage.getUserUnlockedStyles(userId);
      if (userUnlocks.some((u) => u.styleId === styleId)) {
        return res.status(400).json({ error: "Style already unlocked" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.credits < style.unlockCost) {
        return res.status(400).json({ error: "Insufficient credits", required: style.unlockCost, current: user?.credits || 0 });
      }
      await storage.updateUserCredits(userId, -style.unlockCost);
      await storage.recordTransaction(userId, -style.unlockCost, "style_unlock", `Unlocked ${style.name} art style`);
      await storage.unlockStyleForUser(userId, styleId);
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, credits: updatedUser?.credits || 0 });
    } catch (error) {
      console.error("Unlock style error:", error);
      res.status(500).json({ error: "Failed to unlock style" });
    }
  });
  app2.post("/api/art-styles/unlock-all", requireUserAuth, requireEmailVerified, async (req, res) => {
    try {
      const userId = req.userId;
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      if (hasAll)
        return res.status(400).json({ error: "All styles already unlocked" });
      const settings = await storage.getArtStyleSettings();
      const user = await storage.getUser(userId);
      if (!user || user.credits < settings.unlockAllCost) {
        return res.status(400).json({ error: "Insufficient credits", required: settings.unlockAllCost, current: user?.credits || 0 });
      }
      await storage.updateUserCredits(userId, -settings.unlockAllCost);
      await storage.recordTransaction(userId, -settings.unlockAllCost, "style_unlock_all", "Unlocked all art styles (current & future)");
      await storage.unlockAllStylesForUser(userId);
      const updatedUser = await storage.getUser(userId);
      res.json({ success: true, credits: updatedUser?.credits || 0 });
    } catch (error) {
      console.error("Unlock all styles error:", error);
      res.status(500).json({ error: "Failed to unlock all styles" });
    }
  });
  app2.get("/api/admin/art-styles", requireAdminAuth, async (req, res) => {
    try {
      const styles = await storage.getArtStyles();
      const settings = await storage.getArtStyleSettings();
      res.json({ styles, settings });
    } catch (error) {
      console.error("Admin get art styles error:", error);
      res.status(500).json({ error: "Failed to get art styles" });
    }
  });
  app2.post("/api/admin/art-styles", requireAdminAuth, async (req, res) => {
    try {
      const { name, isPremium, unlockCost, displayOrder } = req.body;
      const style = await storage.createArtStyle({ name, isPremium: isPremium ?? true, unlockCost: unlockCost ?? 100, displayOrder: displayOrder ?? 99 });
      res.json({ success: true, style });
    } catch (error) {
      console.error("Admin create art style error:", error);
      res.status(500).json({ error: "Failed to create art style" });
    }
  });
  app2.put("/api/admin/art-styles/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const style = await storage.updateArtStyle(id, updates);
      res.json({ success: true, style });
    } catch (error) {
      console.error("Admin update art style error:", error);
      res.status(500).json({ error: "Failed to update art style" });
    }
  });
  app2.delete("/api/admin/art-styles/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteArtStyle(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin delete art style error:", error);
      res.status(500).json({ error: "Failed to delete art style" });
    }
  });
  app2.post("/api/admin/art-style-settings", requireAdminAuth, async (req, res) => {
    try {
      const { unlockAllCost } = req.body;
      const settings = await storage.updateArtStyleSettings({ unlockAllCost });
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Admin update art style settings error:", error);
      res.status(500).json({ error: "Failed to update art style settings" });
    }
  });
  app2.get("/api/admin/users/:userId/unlocked-styles", requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const unlocked = await storage.getUserUnlockedStyles(userId);
      const allUnlocked = await storage.hasUserUnlockedAllStyles(userId);
      const allStyles = await storage.getArtStyles();
      res.json({ unlocked, allUnlocked, allStyles });
    } catch (error) {
      console.error("Admin get user styles error:", error);
      res.status(500).json({ error: "Failed to get user unlocked styles" });
    }
  });
  app2.post("/api/admin/users/:userId/revoke-style", requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const { styleId } = req.body;
      if (!styleId) {
        res.status(400).json({ error: "styleId is required" });
        return;
      }
      await storage.revokeUserStyle(userId, styleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin revoke user style error:", error);
      res.status(500).json({ error: "Failed to revoke style" });
    }
  });
  app2.post("/api/admin/users/:userId/revoke-all-styles", requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      await storage.revokeAllUserStyles(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Admin revoke all user styles error:", error);
      res.status(500).json({ error: "Failed to revoke all styles" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
var MAX_STORY_PROMPT_LENGTH, MAX_CHARACTER_IMAGE_BYTES, JWT_SECRET, PARALLEL_BATCH_SIZE, BATCH_DELAY_MS, ADMIN_PASSWORD, adminTokens, requireAuth, SETTINGS_FILE, aiSettings2, MAX_COMIC_JOB_STALLS, JobStepBudget, REMOTE_IMAGE_FETCH_MS;
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_storage();
    init_comicS3();
    init_db();
    init_worker();
    init_schema();
    init_email();
    init_notifications();
    MAX_STORY_PROMPT_LENGTH = 4e3;
    MAX_CHARACTER_IMAGE_BYTES = 5 * 1024 * 1024;
    JWT_SECRET = requiredProductionSecret("SESSION_SECRET", "fallback-jwt-secret-key");
    PARALLEL_BATCH_SIZE = 8;
    BATCH_DELAY_MS = 250;
    ADMIN_PASSWORD = requiredProductionSecret("ADMIN_PASSWORD", "admin123");
    adminTokens = /* @__PURE__ */ new Set();
    requireAuth = requireAdminAuth;
    SETTINGS_FILE = path.join(process.cwd(), ".ai-settings.json");
    aiSettings2 = buildDefaultSettings();
    MAX_COMIC_JOB_STALLS = 12;
    JobStepBudget = class {
      left;
      checkpoint;
      base;
      constructor(params, maxSteps) {
        this.base = params;
        this.checkpoint = readCheckpoint(params);
        this.left = maxSteps ?? Number.POSITIVE_INFINITY;
      }
      payload() {
        return { ...this.base, _checkpoint: this.checkpoint };
      }
      /** True when this process must not run the whole page in one call. */
      bounded() {
        return Number.isFinite(this.left);
      }
      /**
       * Call after one finished unit has been copied onto `checkpoint`.
       * Returns true when this invocation must stop. The job is left `pending`
       * with its payload saved, so the next poll can claim it.
       */
      async shouldStop(job) {
        this.checkpoint.stalls = 0;
        job.requestPayload = this.payload();
        if (!Number.isFinite(this.left))
          return false;
        this.left -= 1;
        if (this.left > 0)
          return false;
        job.status = "pending";
        console.log(`[job] ${job.id} paused after one step (progress ${job.progress})`);
        await saveJobToDb(job);
        return true;
      }
    };
    REMOTE_IMAGE_FETCH_MS = 12e4;
  }
});

// server/index.ts
init_routes();
import "dotenv/config";
import express from "express";

// shared/legal.ts
var LEGAL_APP_NAME = "AI Storiz";
var LEGAL_DEVELOPER_NAME = "Fio Creatives";
var LEGAL_LAST_UPDATED = "June 2026";
var LEGAL_CONTACT_EMAIL = "fiocreativesolutions@gmail.com";
var LEGAL_PRIVACY_CONTACT_EMAIL = LEGAL_CONTACT_EMAIL;
var LEGAL_ACCOUNT_DELETION_EMAIL = LEGAL_CONTACT_EMAIL;
var LEGAL_ACCOUNT_DELETION_URL = "https://aistorizapi.fiocreatives.com/account-deletion";
var PRIVACY_POLICY_SECTIONS = [
  {
    title: "Introduction",
    paragraphs: [
      `This Privacy Policy describes how ${LEGAL_DEVELOPER_NAME} ("we", "us", or "our") collects, uses, shares, and protects information when you use the ${LEGAL_APP_NAME} mobile application and related services (the "Service").`,
      `By using ${LEGAL_APP_NAME}, you agree to the practices described in this policy. If you do not agree, please do not use the Service.`
    ]
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
      "Payment-related data: subscription and purchase status processed through Google Play or Apple App Store (we do not receive your full payment card number)."
    ]
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
      "Display advertisements and measure ad performance where applicable."
    ]
  },
  {
    title: "How We Share Your Information",
    paragraphs: [
      "We do not sell your personal information. We share information only as described below:"
    ],
    bullets: [
      "Service providers: cloud hosting, email delivery, and AI image generation partners (including OpenAI and Replicate) that process prompts and content needed to provide the Service, subject to their policies and our instructions.",
      "Payment platforms: Google Play and Apple App Store for in-app purchases and subscriptions.",
      "Advertising partners: Google AdMob (or similar) for ad delivery and measurement on supported devices.",
      "Legal and safety: when required by law, to protect rights and safety, or to respond to lawful requests from authorities."
    ]
  },
  {
    title: "Permissions",
    paragraphs: [
      `${LEGAL_APP_NAME} may request device permissions to provide features you choose to use:`,
      "You can change many permissions in your device settings. Some features may not work if required permissions are denied."
    ],
    bullets: [
      "Photos / camera: to add character images for comic creation.",
      "Notifications: to send comic-ready alerts and optional promotional messages if enabled.",
      "Network access: to sync your account and generate content."
    ]
  },
  {
    title: "Data Storage and Security",
    paragraphs: [
      "Account and comic data are stored on secure servers. We use reasonable technical and organizational measures to protect personal information, including encryption in transit (HTTPS) and access controls.",
      "Some content may also be stored on your device for offline viewing. No method of transmission or storage is 100% secure; we cannot guarantee absolute security."
    ]
  },
  {
    title: "Data Retention and Deletion",
    paragraphs: [
      "We retain personal information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements.",
      `You may request deletion of your account and associated data at any time. See our Account & Data Deletion page (${LEGAL_ACCOUNT_DELETION_URL}) or use Delete Account in the app Profile settings. Deletion requests are typically processed within 30 days.`,
      "We may retain limited information where required for legal, security, fraud prevention, or payment record purposes, as described on our account deletion page."
    ]
  },
  {
    title: "Your Rights and Choices",
    paragraphs: [
      "Depending on your location, you may have the right to access, correct, or delete personal information, export your comic history where available, opt out of promotional communications, and withdraw consent where applicable.",
      `To exercise these rights, contact us at ${LEGAL_PRIVACY_CONTACT_EMAIL} or use the account deletion process above.`
    ],
    bullets: [
      "Access, correct, or delete personal information we hold about you.",
      "Export your comic history where the app provides export features.",
      "Opt out of promotional communications.",
      "Withdraw consent where processing is based on consent, subject to legal limitations."
    ]
  },
  {
    title: "Children's Privacy",
    paragraphs: [
      `${LEGAL_APP_NAME} is not directed to children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will delete it.`
    ]
  },
  {
    title: "International Users",
    paragraphs: [
      "Your information may be processed in countries other than your own, including the United States, where our service providers operate. We take steps designed to protect your information consistent with this policy."
    ]
  },
  {
    title: "Changes to This Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will post the updated policy at the same URL and update the "Last updated" date. Continued use of the Service after changes means you accept the revised policy.'
    ]
  },
  {
    title: "Contact Us",
    paragraphs: [
      `Questions about this Privacy Policy or our data practices may be sent to ${LEGAL_DEVELOPER_NAME} at ${LEGAL_PRIVACY_CONTACT_EMAIL}.`
    ]
  }
];
var ACCOUNT_DELETION_SECTIONS = [
  {
    title: "Request account deletion",
    paragraphs: [
      `You can request deletion of your ${LEGAL_APP_NAME} account and associated personal data using either method below.`
    ],
    bullets: [
      `In the app: open Profile \u2192 Delete Account, then follow the instructions to email us from your registered address.`,
      `On the web: email ${LEGAL_ACCOUNT_DELETION_EMAIL} from the address linked to your account.`
    ]
  },
  {
    title: "What to include",
    paragraphs: [
      "Please include the email address you used to register for AI Storiz. If you signed in with a third-party provider, include that email and note the sign-in method."
    ]
  },
  {
    title: "Active subscriptions",
    paragraphs: [
      "If you have an active subscription through Google Play or the App Store, cancel it in your store subscription settings before or when you request account deletion. Canceling the subscription does not automatically delete your account."
    ]
  },
  {
    title: "What we delete",
    paragraphs: [
      "When we process a verified deletion request, we delete or anonymize:"
    ],
    bullets: [
      "Your user account and login credentials",
      "Saved story prompts and generated comics stored on our servers",
      "Uploaded character photos and related metadata",
      "App usage history, credits history, and referral data tied to your account",
      "Push notification tokens associated with your account"
    ]
  },
  {
    title: "What we may retain",
    paragraphs: [
      "We may retain limited information only where necessary for legal compliance, security, fraud prevention, dispute resolution, or payment and tax records. Any retained data is minimized and protected."
    ]
  },
  {
    title: "Processing time",
    paragraphs: [
      "We aim to complete verified deletion requests within 30 days. You will receive confirmation by email when deletion is finished, when possible."
    ]
  }
];

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
var app = express();
if (process.env.VERCEL) {
  app.set("trust proxy", 1);
}
var log = console.log;
var isDev = process.env.NODE_ENV !== "production";
function isPrivateLanHostname(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true;
  }
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hostname);
  if (!m) {
    return false;
  }
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origin = req.header("origin");
    if (!origin) {
      return next();
    }
    let originHostname;
    try {
      const url = new URL(origin);
      originHostname = url.hostname;
    } catch {
      return next();
    }
    const isReplitDomain = originHostname.endsWith(".replit.dev") || originHostname.endsWith(".repl.co") || originHostname.endsWith(".replit.app");
    const isLocalhost = originHostname === "localhost" || originHostname === "127.0.0.1";
    const isLanDevOrigin = isDev && isPrivateLanHostname(originHostname);
    if (isReplitDomain || isLocalhost || isLanDevOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Pragma, Expires, If-Modified-Since"
      );
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Max-Age", "86400");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "4mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "4mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api"))
        return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function registerLegalPages(app2) {
  const privacyTemplate = fs2.readFileSync(
    path2.join(process.cwd(), "server/templates/privacy.html"),
    "utf-8"
  );
  const accountDeletionTemplate = fs2.readFileSync(
    path2.join(process.cwd(), "server/templates/account-deletion.html"),
    "utf-8"
  );
  const legalStyles = fs2.readFileSync(
    path2.join(process.cwd(), "server/templates/legal-page.css"),
    "utf-8"
  );
  const appName = getAppName();
  const renderLegalPage = (template) => template.replace(/LEGAL_STYLES_PLACEHOLDER/g, legalStyles).replace(/APP_NAME_PLACEHOLDER/g, appName).replace(/DEVELOPER_NAME_PLACEHOLDER/g, LEGAL_DEVELOPER_NAME).replace(/LAST_UPDATED_PLACEHOLDER/g, LEGAL_LAST_UPDATED).replace(/PRIVACY_EMAIL_PLACEHOLDER/g, LEGAL_CONTACT_EMAIL).replace(/SUPPORT_EMAIL_PLACEHOLDER/g, LEGAL_CONTACT_EMAIL);
  const sendLegalHtml = (res, html) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(html);
  };
  app2.get("/privacy", (_req, res) => {
    sendLegalHtml(res, renderLegalPage(privacyTemplate));
  });
  app2.get("/account-deletion", (_req, res) => {
    sendLegalHtml(res, renderLegalPage(accountDeletionTemplate));
  });
  log("Legal pages: GET /privacy, GET /account-deletion");
}
function configureExpoAndLanding(app2) {
  const landingPageTemplate = fs2.readFileSync(
    path2.join(process.cwd(), "server/templates/landing-page.html"),
    "utf-8"
  );
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  if (isDev) {
    log("Development mode: Setting up proxy to Expo dev server on port 8081");
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }
      const userAgent = req.header("user-agent") || "";
      const isExpoClient = userAgent.includes("Expo") || req.header("expo-platform");
      if (req.path === "/" && !isExpoClient && !req.query.platform) {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName
        });
      }
      next();
    });
    const expoProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, _req, res) => {
          log(`Proxy error: ${err.message}`);
          if (res && !res.headersSent && typeof res.status === "function") {
            res.status(502).send("Expo dev server not ready");
          }
        }
      }
    });
    app2.use(expoProxy);
  } else {
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.path !== "/" && req.path !== "/manifest") {
        return next();
      }
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, res);
      }
      if (req.path === "/") {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName
        });
      }
      next();
    });
    app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
    app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  }
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
var bootPromise = null;
function bootApp() {
  if (bootPromise)
    return bootPromise;
  bootPromise = (async () => {
    setupCors(app);
    setupBodyParsing(app);
    setupRequestLogging(app);
    const server = await registerRoutes(app);
    registerLegalPages(app);
    configureExpoAndLanding(app);
    setupErrorHandler(app);
    if (process.env.VERCEL) {
      return;
    }
    const port = parseInt(process.env.PORT || "5001", 10);
    const listenOptions = {
      port,
      host: "0.0.0.0"
    };
    if (process.platform === "linux") {
      listenOptions.reusePort = true;
    }
    await new Promise((resolve2, reject) => {
      server.once("error", reject);
      server.listen(listenOptions, () => {
        log(`express server serving on port ${port}`);
        resolve2();
      });
    });
  })().catch((err) => {
    bootPromise = null;
    throw err;
  });
  return bootPromise;
}
if (!process.env.VERCEL) {
  void bootApp().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

// api/_handler.ts
function waitForExpressResponse(req, res) {
  return new Promise((resolve2, reject) => {
    if (res.writableEnded) {
      resolve2();
      return;
    }
    const finish = () => resolve2();
    res.once("finish", finish);
    res.once("close", finish);
    res.once("error", reject);
    try {
      app(req, res);
    } catch (error) {
      reject(error);
    }
  });
}
async function handler(req, res) {
  await bootApp();
  await waitForExpressResponse(req, res);
}
export {
  handler as default
};
