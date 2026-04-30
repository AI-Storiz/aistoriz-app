import dotenv from "dotenv";
dotenv.config();

import { db } from "../server/db";
import {
  users,
  creditSettings,
  rateLimitSettings,
  referralSettings,
  notificationSettings,
  adSettings,
  artStyleSettings,
  artStyles,
  oauthSettings
} from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Seed Credit Settings
    console.log("📊 Seeding credit settings...");
    await db.insert(creditSettings).values({
      baseCost: 20,
      costPerPage: 15,
      adsCreditsReward: 25,
      maxAdsPerDay: 5,
      weeklyPlanCredits: 270,
      weeklyPlanPrice: "7.02",
      yearlyPlanCredits: 3000,
      yearlyPlanPrice: "69.00",
      topUp1Credits: 100,
      topUp1Price: "2.99",
      topUp2Credits: 500,
      topUp2Price: "9.99",
      topUp3Credits: 1000,
      topUp3Price: "19.99",
    }).onConflictDoNothing();

    // Seed Rate Limit Settings
    console.log("⏱️  Seeding rate limit settings...");
    await db.insert(rateLimitSettings).values({
      maxGenerationsPerHour: 5,
      maxGenerationsPerDay: 20,
      enabled: true,
    }).onConflictDoNothing();

    // Seed Referral Settings
    console.log("🎁 Seeding referral settings...");
    await db.insert(referralSettings).values({
      inviterCredits: 50,
      inviteeCredits: 25,
      enabled: true,
    }).onConflictDoNothing();

    // Seed Notification Settings
    console.log("🔔 Seeding notification settings...");
    await db.insert(notificationSettings).values({
      enabled: true,
      lowCreditsThreshold: 20,
    }).onConflictDoNothing();

    // Seed Ad Settings
    console.log("📢 Seeding ad settings...");
    await db.insert(adSettings).values({
      maxImpressionsPerHour: 3,
      maxImpressionsPerDay: 10,
      enabled: true,
      exemptSubscribers: true,
    }).onConflictDoNothing();

    // Seed Art Style Settings
    console.log("🎨 Seeding art style settings...");
    await db.insert(artStyleSettings).values({
      unlockAllCost: 500,
    }).onConflictDoNothing();

    // Seed OAuth Settings
    console.log("🔐 Seeding OAuth settings...");
    await db.insert(oauthSettings).values({
      enabled: false,
    }).onConflictDoNothing();

    // Seed Art Styles
    console.log("🖼️  Seeding art styles...");
    const styles = [
      { name: "Anime", displayOrder: 1, isPremium: false, unlockCost: 0, isActive: true },
      { name: "Manga", displayOrder: 2, isPremium: false, unlockCost: 0, isActive: true },
      { name: "Comic Book", displayOrder: 3, isPremium: false, unlockCost: 0, isActive: true },
      { name: "Watercolor", displayOrder: 4, isPremium: true, unlockCost: 100, isActive: true },
      { name: "Oil Painting", displayOrder: 5, isPremium: true, unlockCost: 100, isActive: true },
      { name: "Pixel Art", displayOrder: 6, isPremium: true, unlockCost: 100, isActive: true },
      { name: "Sketch", displayOrder: 7, isPremium: false, unlockCost: 0, isActive: true },
      { name: "3D Render", displayOrder: 8, isPremium: true, unlockCost: 150, isActive: true },
      { name: "Cyberpunk", displayOrder: 9, isPremium: true, unlockCost: 150, isActive: true },
      { name: "Fantasy", displayOrder: 10, isPremium: true, unlockCost: 100, isActive: true },
    ];

    for (const style of styles) {
      await db.insert(artStyles).values(style).onConflictDoNothing();
    }

    // Seed Test Users
    console.log("👥 Seeding test users...");

    // Admin user (email verified)
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      email: "admin@example.com",
      password: hashedAdminPassword,
      userId: "admin-user-001",
      credits: 10000,
      subscriptionStatus: "active",
      subscriptionPlan: "yearly",
      emailVerified: true,
      referralCode: "ADMIN2024",
    }).onConflictDoNothing();

    // Regular test user with credits
    const hashedTestPassword = await bcrypt.hash("test123", 10);
    await db.insert(users).values({
      email: "test@example.com",
      password: hashedTestPassword,
      userId: "test-user-001",
      credits: 500,
      subscriptionStatus: "none",
      emailVerified: true,
      referralCode: "TEST2024",
    }).onConflictDoNothing();

    // Free user (no credits)
    const hashedFreePassword = await bcrypt.hash("free123", 10);
    await db.insert(users).values({
      email: "free@example.com",
      password: hashedFreePassword,
      userId: "free-user-001",
      credits: 0,
      subscriptionStatus: "none",
      emailVerified: true,
      referralCode: "FREE2024",
    }).onConflictDoNothing();

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📝 Test Accounts Created:");
    console.log("┌─────────────────────────────────────────┐");
    console.log("│ Admin Account:                          │");
    console.log("│ Email: admin@example.com                │");
    console.log("│ Password: admin123                      │");
    console.log("│ Credits: 10,000                         │");
    console.log("│ Plan: Yearly Subscription               │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ Test Account:                           │");
    console.log("│ Email: test@example.com                 │");
    console.log("│ Password: test123                       │");
    console.log("│ Credits: 500                            │");
    console.log("│ Plan: None                              │");
    console.log("├─────────────────────────────────────────┤");
    console.log("│ Free Account:                           │");
    console.log("│ Email: free@example.com                 │");
    console.log("│ Password: free123                       │");
    console.log("│ Credits: 0                              │");
    console.log("│ Plan: None                              │");
    console.log("└─────────────────────────────────────────┘");
    console.log("\n🔐 Admin Panel Password: @?YesBotEnterx1Box?");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
