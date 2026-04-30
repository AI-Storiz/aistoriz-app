import { users, creditTransactions, creditSettings, userCharacters, userComics, rateLimitSettings, oauthSettings, generationAuditLogs, referralSettings, referralBounties, referralHistory, internalAds, adImpressions, adSettings, artStyles, artStyleSettings, userUnlockedStyles, pushTokens, notificationPreferences, notificationHistory, notificationSettings, type User, type InsertUser, type CreditTransaction, type CreditSettings, type UserCharacter, type UserComic, type RateLimitSettings, type OAuthSettings, type GenerationAuditLog, type ReferralSettings, type ReferralBounty, type ReferralHistory, type InternalAd, type AdImpression, type AdSettings, type ArtStyle, type ArtStyleSettings, type UserUnlockedStyle, type PushToken, type NotificationPreference, type NotificationHistoryEntry, type NotificationSettings } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, desc, gte } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { normalizeComicPagesOrder } from "./comicS3";

function generateUserId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "USR-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  activeSubscriptions: number;
  totalCreditsIssued: number;
  totalCreditsUsed: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, password: string, verificationCode?: string, verificationCodeExpiresAt?: Date): Promise<User>;
  updateUserCredits(userId: string, amount: number): Promise<User | undefined>;
  recordTransaction(userId: string, amount: number, type: string, description: string): Promise<CreditTransaction>;
  getUserTransactions(userId: string): Promise<CreditTransaction[]>;
  getCreditSettings(): Promise<CreditSettings>;
  updateCreditSettings(settings: Partial<CreditSettings>): Promise<CreditSettings>;
  incrementAdsWatched(userId: string): Promise<User | undefined>;
  resetDailyAdsCount(userId: string): Promise<void>;
  verifyEmail(userId: string, code: string): Promise<{ success: boolean; error?: string }>;
  setEmailVerified(userId: string): Promise<boolean>;
  setPasswordResetCode(email: string, code: string, expiresAt: Date): Promise<boolean>;
  resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
  resendVerificationCode(userId: string, newCode: string, expiresAt: Date): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getAdminStats(): Promise<AdminStats>;
  updateUserByAdmin(userId: string, updates: { credits?: number; subscriptionStatus?: string }): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(email: string, password: string, verificationCode?: string, verificationCodeExpiresAt?: Date): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateUserId();
    const referralCode = await this.generateUniqueReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        userId,
        credits: 20,
        subscriptionStatus: "none",
        emailVerified: false,
        verificationCode: verificationCode || null,
        verificationCodeExpiresAt: verificationCodeExpiresAt || null,
        referralCode,
      })
      .returning();
    return user;
  }

  async verifyEmail(id: string, code: string): Promise<{ success: boolean; error?: string }> {
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
    
    if (user.verificationCodeExpiresAt && new Date() > user.verificationCodeExpiresAt) {
      return { success: false, error: "Verification code expired" };
    }
    
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id));
    
    return { success: true };
  }

  async setEmailVerified(id: string): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id))
      .returning();
    
    return !!user;
  }

  async resendVerificationCode(id: string, newCode: string, expiresAt: Date): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({
        verificationCode: newCode,
        verificationCodeExpiresAt: expiresAt,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id))
      .returning();
    
    return !!user;
  }

  async setPasswordResetCode(email: string, code: string, expiresAt: Date): Promise<boolean> {
    const [user] = await db
      .update(users)
      .set({
        passwordResetCode: code,
        passwordResetExpiresAt: expiresAt,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.email, email))
      .returning();
    
    return !!user;
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
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
    
    if (user.passwordResetExpiresAt && new Date() > user.passwordResetExpiresAt) {
      return { success: false, error: "Reset code expired" };
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpiresAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.email, email));
    
    return { success: true };
  }

  async updateUserCredits(id: string, amount: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async recordTransaction(userId: string, amount: number, type: string, description: string): Promise<CreditTransaction> {
    const [transaction] = await db
      .insert(creditTransactions)
      .values({
        usersId: userId,
        amount,
        type,
        description,
      })
      .returning();
    return transaction;
  }

  async getUserTransactions(userId: string): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.usersId, userId))
      .orderBy(sql`${creditTransactions.createdAt} DESC`)
      .limit(50);
  }

  async getCreditSettings(): Promise<CreditSettings> {
    const [settings] = await db.select().from(creditSettings);
    if (!settings) {
      const [newSettings] = await db
        .insert(creditSettings)
        .values({})
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateCreditSettings(updates: Partial<CreditSettings>): Promise<CreditSettings> {
    const existing = await this.getCreditSettings();
    const [settings] = await db
      .update(creditSettings)
      .set({
        ...updates,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(creditSettings.id, existing.id))
      .returning();
    return settings;
  }

  async incrementAdsWatched(id: string): Promise<User | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (!user) return undefined;
    
    const lastAdDate = user.lastAdWatchDate ? String(user.lastAdWatchDate).split('T')[0] : null;
    const adsCount = lastAdDate === today ? user.adsWatchedToday + 1 : 1;
    
    const [updatedUser] = await db
      .update(users)
      .set({
        adsWatchedToday: adsCount,
        lastAdWatchDate: sql`CURRENT_DATE`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  async resetDailyAdsCount(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        adsWatchedToday: 0,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(sql`${users.createdAt} DESC`);
    return allUsers;
  }

  async getAdminStats(): Promise<AdminStats> {
    const allUsers = await db.select().from(users);
    const allTransactions = await db.select().from(creditTransactions);
    
    const totalUsers = allUsers.length;
    const verifiedUsers = allUsers.filter(u => u.emailVerified).length;
    const unverifiedUsers = totalUsers - verifiedUsers;
    const activeSubscriptions = allUsers.filter(u => u.subscriptionStatus === 'weekly' || u.subscriptionStatus === 'yearly').length;
    
    const totalCreditsIssued = allTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalCreditsUsed = Math.abs(allTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));
    
    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      activeSubscriptions,
      totalCreditsIssued,
      totalCreditsUsed
    };
  }

  async updateUserByAdmin(id: string, updates: { credits?: number; subscriptionStatus?: string }): Promise<User | undefined> {
    const updateData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
    
    if (updates.credits !== undefined) {
      updateData.credits = updates.credits;
    }
    if (updates.subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = updates.subscriptionStatus;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  // User Characters CRUD
  async getUserCharacters(userId: string): Promise<UserCharacter[]> {
    const characters = await db
      .select()
      .from(userCharacters)
      .where(eq(userCharacters.userId, userId))
      .orderBy(desc(userCharacters.createdAt));
    return characters;
  }

  async createUserCharacter(userId: string, name: string, photoUri?: string): Promise<UserCharacter> {
    const [character] = await db
      .insert(userCharacters)
      .values({
        userId,
        name,
        photoUri: photoUri || null,
      })
      .returning();
    return character;
  }

  async updateUserCharacter(id: number, userId: string, updates: { name?: string; photoUri?: string }): Promise<UserCharacter | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.photoUri !== undefined) updateData.photoUri = updates.photoUri;
    
    const [character] = await db
      .update(userCharacters)
      .set(updateData)
      .where(and(eq(userCharacters.id, id), eq(userCharacters.userId, userId)))
      .returning();
    return character || undefined;
  }

  async deleteUserCharacter(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userCharacters)
      .where(and(eq(userCharacters.id, id), eq(userCharacters.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // User Comics CRUD
  async getUserComics(userId: string): Promise<UserComic[]> {
    const comics = await db
      .select()
      .from(userComics)
      .where(eq(userComics.userId, userId))
      .orderBy(desc(userComics.createdAt));
    return comics;
  }

  async getUserComicsLightweight(userId: string): Promise<Array<{id: number; title: string; style: string; characterNames: unknown; createdAt: Date}>> {
    const comics = await db
      .select({
        id: userComics.id,
        title: userComics.title,
        style: userComics.style,
        characterNames: userComics.characterNames,
        createdAt: userComics.createdAt,
      })
      .from(userComics)
      .where(eq(userComics.userId, userId))
      .orderBy(desc(userComics.createdAt));
    
    return comics;
  }

  /**
   * Strips leading pages with no images and renumbers pageNumber. Persists when changed
   * so list metadata, thumbnails, and /page/0/... all match the same array.
   */
  private async ensureComicPagesNormalized(id: number, userId: string): Promise<void> {
    const [row] = await db
      .select({ pages: userComics.pages })
      .from(userComics)
      .where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
    if (!row?.pages) {
      return;
    }
    const { pages: next, changed } = normalizeComicPagesOrder(row.pages as unknown[]);
    if (changed) {
      await db
        .update(userComics)
        .set({ pages: next as any, updatedAt: new Date() })
        .where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
    }
  }

  async getUserComicById(id: number, userId: string): Promise<UserComic | undefined> {
    await this.ensureComicPagesNormalized(id, userId);
    const [comic] = await db
      .select()
      .from(userComics)
      .where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
    return comic;
  }

  async getUserComicMetadata(id: number, userId: string): Promise<{
    id: number; userId: string; title: string; style: string;
    characterNames: unknown; createdAt: Date;
    pagesMetadata: Array<{ pageNumber: number; pageType: string; panelCount: number; panels: any; scenes: any; hasImageUrl: boolean }>;
  } | undefined> {
    await this.ensureComicPagesNormalized(id, userId);
    const [comic] = await db
      .select({
        id: userComics.id,
        userId: userComics.userId,
        title: userComics.title,
        style: userComics.style,
        characterNames: userComics.characterNames,
        createdAt: userComics.createdAt,
        pagesMetadata: sql<any>`(
          SELECT jsonb_agg(jsonb_build_object(
            'pageNumber', page->>'pageNumber',
            'pageType', page->>'pageType',
            'panelCount', COALESCE(jsonb_array_length(page->'panelImages'), 0),
            'panels', page->'panels',
            'scenes', page->'scenes',
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
        )`,
      })
      .from(userComics)
      .where(and(eq(userComics.id, id), eq(userComics.userId, userId)));
    
    if (!comic) return undefined;
    return {
      id: comic.id,
      userId: comic.userId,
      title: comic.title,
      style: comic.style,
      characterNames: comic.characterNames,
      createdAt: comic.createdAt,
      pagesMetadata: comic.pagesMetadata || [],
    };
  }

  /** Resolves the image URL for a panel (`panelIndex === -1` = full-page or first panel fallback). */
  async getComicPanelImage(comicId: number, userId: string, pageIndex: number, panelIndex: number): Promise<string | null> {
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
    const p = page as Record<string, unknown>;

    if (safePanelIdx === -1) {
      const u = typeof p.imageUrl === "string" ? p.imageUrl.trim() : "";
      if (u) {
        return u;
      }
      const i = typeof p.imageUri === "string" ? p.imageUri.trim() : "";
      if (i) {
        return i;
      }
      const pan = p.panelImages;
      if (Array.isArray(pan)) {
        for (const cell of pan) {
          if (typeof cell === "string" && cell.trim()) {
            return cell.trim();
          }
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
  async getComicFirstImageUrl(comicId: number, userId: string): Promise<string | null> {
    const comic = await this.getUserComicById(comicId, userId);
    if (!comic?.pages || !Array.isArray(comic.pages)) {
      return null;
    }
    for (const p of comic.pages) {
      if (p == null || typeof p !== "object") {
        continue;
      }
      const page = p as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      const a = str(page.imageUrl);
      if (a) {
        return a;
      }
      const b = str(page.imageUri);
      if (b) {
        return b;
      }
      const pan = page.panelImages;
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

  async createUserComic(userId: string, data: { title: string; style: string; characterNames: string[]; pages: any[] }): Promise<UserComic> {
    const [comic] = await db
      .insert(userComics)
      .values({
        userId,
        title: data.title,
        style: data.style,
        characterNames: data.characterNames,
        pages: data.pages,
      })
      .returning();
    return comic;
  }

  async updateUserComic(id: number, userId: string, updates: { title?: string; pages?: any[] }): Promise<UserComic | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.pages !== undefined) updateData.pages = updates.pages;
    
    const [comic] = await db
      .update(userComics)
      .set(updateData)
      .where(and(eq(userComics.id, id), eq(userComics.userId, userId)))
      .returning();
    return comic || undefined;
  }

  async deleteUserComic(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userComics)
      .where(and(eq(userComics.id, id), eq(userComics.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // Rate Limit Settings
  async getRateLimitSettings(): Promise<RateLimitSettings> {
    const [settings] = await db.select().from(rateLimitSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db
        .insert(rateLimitSettings)
        .values({
          maxGenerationsPerHour: 5,
          maxGenerationsPerDay: 20,
          enabled: true,
        })
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateRateLimitSettings(updates: Partial<RateLimitSettings>): Promise<RateLimitSettings> {
    const currentSettings = await this.getRateLimitSettings();
    const [updated] = await db
      .update(rateLimitSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(rateLimitSettings.id, currentSettings.id))
      .returning();
    return updated;
  }

  // OAuth Settings
  async getOAuthSettings(): Promise<OAuthSettings> {
    const [settings] = await db.select().from(oauthSettings).limit(1);
    if (!settings) {
      const [newSettings] = await db
        .insert(oauthSettings)
        .values({
          googleWebClientId: null,
          googleIosClientId: null,
          googleAndroidClientId: null,
          enabled: false,
        })
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateOAuthSettings(updates: { googleWebClientId?: string; googleIosClientId?: string; googleAndroidClientId?: string; enabled?: boolean }): Promise<OAuthSettings> {
    const currentSettings = await this.getOAuthSettings();
    const [updated] = await db
      .update(oauthSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(oauthSettings.id, currentSettings.id))
      .returning();
    return updated;
  }

  // Check if user is rate limited
  async checkUserRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string; hourlyCount: number; dailyCount: number }> {
    const settings = await this.getRateLimitSettings();
    
    if (!settings.enabled) {
      return { allowed: true, hourlyCount: 0, dailyCount: 0 };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count generations in last hour
    const hourlyLogs = await db
      .select()
      .from(generationAuditLogs)
      .where(
        and(
          eq(generationAuditLogs.userId, userId),
          eq(generationAuditLogs.action, "generation_started"),
          gte(generationAuditLogs.createdAt, oneHourAgo)
        )
      );
    const hourlyCount = hourlyLogs.length;

    // Count generations in last 24 hours
    const dailyLogs = await db
      .select()
      .from(generationAuditLogs)
      .where(
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
  async createAuditLog(data: {
    userId?: string;
    userEmail?: string;
    action: string;
    status: string;
    creditsUsed?: number;
    pagesCount?: number;
    style?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    metadata?: any;
  }): Promise<GenerationAuditLog> {
    const [log] = await db
      .insert(generationAuditLogs)
      .values(data)
      .returning();
    return log;
  }

  async getAuditLogs(options?: { 
    limit?: number; 
    offset?: number; 
    userId?: string;
    action?: string;
  }): Promise<{ logs: GenerationAuditLog[]; total: number }> {
    let query = db.select().from(generationAuditLogs);
    
    const conditions = [];
    if (options?.userId) {
      conditions.push(eq(generationAuditLogs.userId, options.userId));
    }
    if (options?.action) {
      conditions.push(eq(generationAuditLogs.action, options.action));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const logs = await query
      .orderBy(desc(generationAuditLogs.createdAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(generationAuditLogs);
    
    return { logs, total: countResult?.count || 0 };
  }

  async getAuditStats(): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    rateLimitedAttempts: number;
    insufficientCreditsAttempts: number;
    last24Hours: number;
    last7Days: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [stats] = await db
      .select({
        totalGenerations: sql<number>`count(*) filter (where action = 'generation_started')::int`,
        successfulGenerations: sql<number>`count(*) filter (where action = 'generation_completed')::int`,
        failedGenerations: sql<number>`count(*) filter (where action = 'generation_failed')::int`,
        rateLimitedAttempts: sql<number>`count(*) filter (where action = 'rate_limited')::int`,
        insufficientCreditsAttempts: sql<number>`count(*) filter (where action = 'insufficient_credits')::int`,
      })
      .from(generationAuditLogs);

    const [last24HoursResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(generationAuditLogs)
      .where(
        and(
          eq(generationAuditLogs.action, "generation_started"),
          gte(generationAuditLogs.createdAt, oneDayAgo)
        )
      );

    const [last7DaysResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(generationAuditLogs)
      .where(
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
      last7Days: last7DaysResult?.count || 0,
    };
  }

  // Referral System Functions
  generateReferralCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async generateUniqueReferralCode(): Promise<string> {
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

  async setUserReferralCode(userId: string, code: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        referralCode: code,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async setUserReferredBy(userId: string, referrerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        referredBy: referrerId,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getReferralSettings(): Promise<ReferralSettings> {
    const [settings] = await db.select().from(referralSettings).limit(1);
    if (!settings) {
      const [newSettings] = await db
        .insert(referralSettings)
        .values({
          inviterCredits: 50,
          inviteeCredits: 25,
          enabled: true,
        })
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateReferralSettings(updates: Partial<ReferralSettings>): Promise<ReferralSettings> {
    const currentSettings = await this.getReferralSettings();
    const [updated] = await db
      .update(referralSettings)
      .set({
        ...updates,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(referralSettings.id, currentSettings.id))
      .returning();
    return updated;
  }

  async createReferralBounty(data: {
    name: string;
    description?: string;
    userIds: string[];
    bonusInviterCredits: number;
    bonusInviteeCredits: number;
    startsAt: Date;
    endsAt: Date;
  }): Promise<ReferralBounty> {
    const [bounty] = await db
      .insert(referralBounties)
      .values({
        name: data.name,
        description: data.description || null,
        userIds: data.userIds,
        bonusInviterCredits: data.bonusInviterCredits,
        bonusInviteeCredits: data.bonusInviteeCredits,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        enabled: true,
      })
      .returning();
    return bounty;
  }

  async updateReferralBounty(id: number, updates: Partial<ReferralBounty>): Promise<ReferralBounty | undefined> {
    const [bounty] = await db
      .update(referralBounties)
      .set({
        ...updates,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(referralBounties.id, id))
      .returning();
    return bounty || undefined;
  }

  async deleteReferralBounty(id: number): Promise<boolean> {
    const result = await db.delete(referralBounties).where(eq(referralBounties.id, id)).returning();
    return result.length > 0;
  }

  async getAllReferralBounties(): Promise<ReferralBounty[]> {
    return await db.select().from(referralBounties).orderBy(desc(referralBounties.createdAt));
  }

  async getActiveBountyForUser(userId: string): Promise<ReferralBounty | undefined> {
    const now = new Date();
    const bounties = await db
      .select()
      .from(referralBounties)
      .where(eq(referralBounties.enabled, true));
    
    for (const bounty of bounties) {
      const userIds = bounty.userIds as string[];
      if (userIds.includes(userId) && 
          new Date(bounty.startsAt) <= now && 
          new Date(bounty.endsAt) >= now) {
        return bounty;
      }
    }
    return undefined;
  }

  async createReferralHistory(data: {
    inviterId: string;
    inviterEmail: string;
    inviteeId: string;
    inviteeEmail: string;
    referralCode: string;
    inviterCreditsAwarded: number;
    inviteeCreditsAwarded: number;
    bountyId?: number;
    status: string;
  }): Promise<ReferralHistory> {
    const [history] = await db
      .insert(referralHistory)
      .values({
        inviterId: data.inviterId,
        inviterEmail: data.inviterEmail,
        inviteeId: data.inviteeId,
        inviteeEmail: data.inviteeEmail,
        referralCode: data.referralCode,
        inviterCreditsAwarded: data.inviterCreditsAwarded,
        inviteeCreditsAwarded: data.inviteeCreditsAwarded,
        bountyId: data.bountyId || null,
        status: data.status,
      })
      .returning();
    return history;
  }

  async getReferralHistory(options?: { 
    limit?: number; 
    offset?: number; 
    inviterId?: string 
  }): Promise<{ history: ReferralHistory[]; total: number }> {
    let query = db.select().from(referralHistory);
    
    if (options?.inviterId) {
      query = query.where(eq(referralHistory.inviterId, options.inviterId)) as typeof query;
    }

    const history = await query
      .orderBy(desc(referralHistory.createdAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(referralHistory);
    
    return { history, total: countResult?.count || 0 };
  }

  async getReferralStats(): Promise<{
    totalReferrals: number;
    completedReferrals: number;
    totalCreditsAwarded: number;
  }> {
    const allHistory = await db.select().from(referralHistory);
    
    const totalReferrals = allHistory.length;
    const completedReferrals = allHistory.filter(h => h.status === 'completed').length;
    const totalCreditsAwarded = allHistory.reduce((sum, h) => 
      sum + (h.inviterCreditsAwarded || 0) + (h.inviteeCreditsAwarded || 0), 0);
    
    return { totalReferrals, completedReferrals, totalCreditsAwarded };
  }

  async getUserReferralStats(userId: string): Promise<{
    referralCode: string | null;
    totalReferrals: number;
    creditsEarned: number;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    const history = await db
      .select()
      .from(referralHistory)
      .where(eq(referralHistory.inviterId, userId));
    
    const completedReferrals = history.filter(h => h.status === 'completed');
    const creditsEarned = completedReferrals.reduce((sum, h) => sum + (h.inviterCreditsAwarded || 0), 0);
    
    return {
      referralCode: user?.referralCode || null,
      totalReferrals: completedReferrals.length,
      creditsEarned,
    };
  }

  // Internal Ads Methods
  async getAdSettings(): Promise<AdSettings> {
    const [settings] = await db.select().from(adSettings).limit(1);
    if (!settings) {
      const [newSettings] = await db
        .insert(adSettings)
        .values({
          maxImpressionsPerHour: 3,
          maxImpressionsPerDay: 10,
          enabled: true,
          exemptSubscribers: true,
        })
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateAdSettings(updates: Partial<AdSettings>): Promise<AdSettings> {
    const currentSettings = await this.getAdSettings();
    const [updated] = await db
      .update(adSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(adSettings.id, currentSettings.id))
      .returning();
    return updated;
  }

  async getAllAds(): Promise<InternalAd[]> {
    return await db.select().from(internalAds).orderBy(desc(internalAds.createdAt));
  }

  async getActiveAds(type?: 'text' | 'banner'): Promise<InternalAd[]> {
    if (type) {
      return await db
        .select()
        .from(internalAds)
        .where(and(eq(internalAds.isActive, true), eq(internalAds.type, type)));
    }
    return await db
      .select()
      .from(internalAds)
      .where(eq(internalAds.isActive, true));
  }

  async getAdById(id: number): Promise<InternalAd | undefined> {
    const [ad] = await db.select().from(internalAds).where(eq(internalAds.id, id));
    return ad || undefined;
  }

  async createAd(data: { type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; linkUrl?: string; isActive?: boolean }): Promise<InternalAd> {
    const [ad] = await db
      .insert(internalAds)
      .values({
        type: data.type,
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        isActive: data.isActive ?? true,
      })
      .returning();
    return ad;
  }

  async updateAd(id: number, updates: Partial<{ type: 'text' | 'banner'; title: string; content?: string; imageUrl?: string; linkUrl?: string; isActive: boolean }>): Promise<InternalAd | undefined> {
    const [updated] = await db
      .update(internalAds)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(internalAds.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAd(id: number): Promise<boolean> {
    const result = await db.delete(internalAds).where(eq(internalAds.id, id));
    return true;
  }

  async recordAdImpression(userId: string, adId: number): Promise<void> {
    await db.insert(adImpressions).values({
      userId,
      adId,
    });
  }

  async canShowAd(userId: string, isSubscriber: boolean): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getAdSettings();
    
    if (!settings.enabled) {
      return { allowed: false, reason: "Ads are disabled" };
    }

    if (isSubscriber && settings.exemptSubscribers) {
      return { allowed: false, reason: "Subscribers are exempt from ads" };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count impressions in last hour
    const hourlyImpressions = await db
      .select()
      .from(adImpressions)
      .where(
        and(
          eq(adImpressions.userId, userId),
          gte(adImpressions.createdAt, oneHourAgo)
        )
      );

    if (hourlyImpressions.length >= settings.maxImpressionsPerHour) {
      return { allowed: false, reason: "Hourly impression limit reached" };
    }

    // Count impressions in last day
    const dailyImpressions = await db
      .select()
      .from(adImpressions)
      .where(
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

  async getRandomAd(type: 'text' | 'banner'): Promise<InternalAd | null> {
    const ads = await this.getActiveAds(type);
    if (ads.length === 0) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  }

  // Push Notification Functions
  async registerPushToken(userId: string, token: string, platform: string, deviceName?: string): Promise<PushToken> {
    // Upsert - update if token exists, insert if not
    const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, token));
    
    if (existing.length > 0) {
      // Update existing token to point to this user
      const [updated] = await db
        .update(pushTokens)
        .set({
          userId,
          platform,
          deviceName,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.token, token))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(pushTokens)
      .values({
        userId,
        token,
        platform,
        deviceName,
        isActive: true,
      })
      .returning();
    return created;
  }

  async unregisterPushToken(token: string): Promise<boolean> {
    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushTokens.token, token));
    return true;
  }

  async getUserPushTokens(userId: string): Promise<PushToken[]> {
    return await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));
  }

  async getAllActivePushTokens(): Promise<PushToken[]> {
    return await db.select().from(pushTokens).where(eq(pushTokens.isActive, true));
  }

  async getActiveTokenCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(pushTokens)
      .where(eq(pushTokens.isActive, true));
    return result[0]?.count || 0;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs || null;
  }

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreference, "id" | "userId" | "updatedAt">>
  ): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        ...updates,
      })
      .returning();
    return created;
  }

  // Notification History
  async logNotification(
    userId: string | null,
    type: string,
    title: string,
    body: string,
    status: string = "sent",
    data?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<NotificationHistoryEntry> {
    const [entry] = await db
      .insert(notificationHistory)
      .values({
        userId,
        type,
        title,
        body,
        status,
        data,
        errorMessage,
      })
      .returning();
    return entry;
  }

  async getNotificationHistory(limit: number = 100, offset: number = 0): Promise<NotificationHistoryEntry[]> {
    return await db
      .select()
      .from(notificationHistory)
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Notification Settings (Admin)
  async getNotificationSettings(): Promise<NotificationSettings> {
    const [settings] = await db.select().from(notificationSettings);
    if (settings) return settings;
    
    // Create default settings if none exist
    const [created] = await db
      .insert(notificationSettings)
      .values({
        enabled: true,
        lowCreditsThreshold: 20,
      })
      .returning();
    return created;
  }

  async updateNotificationSettings(updates: Partial<Omit<NotificationSettings, "id" | "updatedAt">>): Promise<NotificationSettings> {
    const current = await this.getNotificationSettings();
    const [updated] = await db
      .update(notificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notificationSettings.id, current.id))
      .returning();
    return updated;
  }

  // Art Styles
  async getArtStyles(): Promise<ArtStyle[]> {
    return await db.select().from(artStyles).orderBy(artStyles.displayOrder);
  }

  async getArtStyleSettings(): Promise<ArtStyleSettings> {
    const [settings] = await db.select().from(artStyleSettings);
    if (!settings) {
      const [newSettings] = await db.insert(artStyleSettings).values({}).returning();
      return newSettings;
    }
    return settings;
  }

  async updateArtStyleSettings(updates: Partial<ArtStyleSettings>): Promise<ArtStyleSettings> {
    const existing = await this.getArtStyleSettings();
    const [settings] = await db
      .update(artStyleSettings)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(artStyleSettings.id, existing.id))
      .returning();
    return settings;
  }

  async createArtStyle(data: { name: string; isPremium: boolean; unlockCost: number; displayOrder: number }): Promise<ArtStyle> {
    const [style] = await db.insert(artStyles).values(data).returning();
    return style;
  }

  async updateArtStyle(id: number, updates: Partial<ArtStyle>): Promise<ArtStyle | undefined> {
    const [style] = await db
      .update(artStyles)
      .set({ ...updates, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(artStyles.id, id))
      .returning();
    return style;
  }

  async deleteArtStyle(id: number): Promise<boolean> {
    const result = await db.delete(artStyles).where(eq(artStyles.id, id));
    return true;
  }

  async seedDefaultArtStyles(): Promise<void> {
    const existing = await db.select().from(artStyles);
    if (existing.length > 0) return;
    
    const defaults = [
      { name: "Comic", displayOrder: 0, isPremium: false, unlockCost: 0 },
      { name: "Manga", displayOrder: 1, isPremium: false, unlockCost: 0 },
      { name: "Manhwa", displayOrder: 2, isPremium: false, unlockCost: 0 },
      { name: "Graphic", displayOrder: 3, isPremium: true, unlockCost: 100 },
      { name: "Kawaii", displayOrder: 4, isPremium: true, unlockCost: 100 },
      { name: "Noir", displayOrder: 5, isPremium: true, unlockCost: 100 },
      { name: "Anime", displayOrder: 6, isPremium: true, unlockCost: 100 },
      { name: "Afro", displayOrder: 7, isPremium: true, unlockCost: 100 },
    ];
    
    for (const style of defaults) {
      await db.insert(artStyles).values(style);
    }
  }

  async getUserUnlockedStyles(userId: string): Promise<UserUnlockedStyle[]> {
    return await db.select().from(userUnlockedStyles).where(eq(userUnlockedStyles.userId, userId));
  }

  async hasUserUnlockedAllStyles(userId: string): Promise<boolean> {
    const [result] = await db.select().from(userUnlockedStyles)
      .where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.allStylesUnlocked, true)));
    return !!result;
  }

  async unlockStyleForUser(userId: string, styleId: number): Promise<UserUnlockedStyle> {
    const [existing] = await db.select().from(userUnlockedStyles)
      .where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.styleId, styleId)));
    if (existing) return existing;
    const [unlocked] = await db.insert(userUnlockedStyles).values({ userId, styleId }).returning();
    return unlocked;
  }

  async unlockAllStylesForUser(userId: string): Promise<UserUnlockedStyle> {
    const [existing] = await db.select().from(userUnlockedStyles)
      .where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.allStylesUnlocked, true)));
    if (existing) return existing;
    const [unlocked] = await db.insert(userUnlockedStyles).values({ userId, allStylesUnlocked: true }).returning();
    return unlocked;
  }

  async revokeUserStyle(userId: string, styleId: number): Promise<void> {
    await db.delete(userUnlockedStyles)
      .where(and(eq(userUnlockedStyles.userId, userId), eq(userUnlockedStyles.styleId, styleId)));
  }

  async revokeAllUserStyles(userId: string): Promise<void> {
    await db.delete(userUnlockedStyles)
      .where(eq(userUnlockedStyles.userId, userId));
  }
}

export const storage = new DatabaseStorage();
