import type { Express, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import {
  assertComicS3Configured,
  comicS3ErrorPayload,
  ComicS3Error,
  ingestComicPagesToS3,
  isComicAssetUrl,
  normalizeComicPagesOrder,
  uploadTestPngToS3,
} from "./comicS3";
import { db } from "./db";
import { comicJobs } from "../shared/schema";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./email";
import { sendPushNotification, sendBroadcastNotification, sendComicCompleteNotification, sendReferralSuccessNotification } from "./notifications";

const MAX_STORY_PROMPT_LENGTH = 4000;
const MAX_CHARACTER_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeStoryPrompt(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  s = s.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s.slice(0, MAX_STORY_PROMPT_LENGTH);
}

function getBase64ImageSize(dataUri: string | undefined | null): number | null {
  if (!dataUri || typeof dataUri !== "string") return null;
  const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.byteLength(match[1], "base64");
  } catch {
    return null;
  }
}

/** Create row with `pages: []`, ingest to S3, then update with `https` URLs. Deletes row on failure. */
async function createUserComicS3Only(
  userId: string,
  data: { title: string; style: string; characterNames: string[]; pages: any[] }
) {
  assertComicS3Configured();
  const row = await storage.createUserComic(userId, {
    title: data.title,
    style: data.style,
    characterNames: data.characterNames,
    pages: [],
    isDraft: false,
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
      /* best-effort */
    });
    throw e;
  }
}

/**
 * Hidden draft row used only as the S3 key namespace (`comicId`) while a job runs.
 * Pages are never persisted on the job row as base64 — they are ingested here first.
 */
async function ensureLibraryComicDraftForJob(
  job: ComicJob,
  params: { title?: string; style: string; characterNames: string[] }
): Promise<void> {
  if (!job.userId || job.libraryComicId != null) {
    return;
  }
  assertComicS3Configured();
  const row = await storage.createUserComic(job.userId, {
    title: params.title || job.title || "Untitled Comic",
    style: params.style || job.style || "Comic",
    characterNames: params.characterNames,
    pages: [],
    isDraft: true,
  });
  job.libraryComicId = row.id;
}

/** Uploads any inline or external image URLs in `job.pages` to S3, updates the draft library row, replaces `job.pages` with HTTPS asset URLs. */
async function syncJobPagesToS3Library(job: ComicJob, opts?: { publish?: boolean }): Promise<void> {
  if (!job.userId || job.libraryComicId == null) {
    return;
  }
  if (!Array.isArray(job.pages) || job.pages.length === 0) {
    return;
  }
  assertComicS3Configured();
  const ingested = await ingestComicPagesToS3(job.userId, job.libraryComicId, job.pages as unknown[]);
  const { pages: normalizedPages } = normalizeComicPagesOrder(ingested);
  await storage.updateUserComic(job.libraryComicId, job.userId, {
    title: job.title || "Untitled Comic",
    pages: normalizedPages,
    ...(opts?.publish ? { isDraft: false } : {}),
  });
  job.pages = normalizedPages as ComicPage[];
}

async function discardLibraryComicDraftIfUnused(job: ComicJob): Promise<void> {
  if (!job.userId || job.libraryComicId == null || job.savedToLibrary) {
    return;
  }
  await storage.deleteUserComic(job.libraryComicId, job.userId).catch(() => {
    /* best-effort */
  });
  job.libraryComicId = undefined;
}

const JWT_SECRET = process.env.SESSION_SECRET || "fallback-jwt-secret-key";

// Utility function to chunk an array into batches for parallel processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Parallel panel generation settings
const PARALLEL_BATCH_SIZE = 8; // Generate 8 panels at a time for faster generation
const BATCH_DELAY_MS = 300; // Small delay between batches to respect rate limits

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const adminTokens = new Set<string>();

function generateAdminToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  adminTokens.add(token);
  return token;
}

function verifyAdminToken(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return adminTokens.has(token);
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (verifyAdminToken(req)) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// User authentication with JWT
function generateUserToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function getUserIdFromToken(req: Request): string | null {
  let token: string | null = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromToken(req);
  if (userId) {
    (req as any).userId = userId;
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}

async function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const user = await storage.getUser(userId);
  if (!user) return res.status(401).json({ error: "User not found" });
  if (!user.emailVerified) {
    return res.status(403).json({ error: "Email verification required", code: "EMAIL_NOT_VERIFIED" });
  }
  next();
}

// Legacy alias for admin auth
const requireAuth = requireAdminAuth;

interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  isDefault: boolean;
}

interface ReplicateModelConfig {
  enabled: boolean;
  modelId: string;
  cost: string;
}

interface ReplicateSettings extends ProviderConfig {
  models: {
    fluxSchnell: ReplicateModelConfig;
    flux11Pro: ReplicateModelConfig;
    fluxKontextDev: ReplicateModelConfig;
    consistentCharacter: ReplicateModelConfig;
  };
  defaultModel: string;
}

interface SiliconFlowSettings extends ProviderConfig {
  models: {
    fluxKontextDev: ReplicateModelConfig;
    fluxKontextPro: ReplicateModelConfig;
  };
  defaultModel: string;
}

interface Flux2ProSettings extends ProviderConfig {
  models: {
    flux2Pro: ReplicateModelConfig;
    flux2Flex: ReplicateModelConfig;
  };
  defaultModel: string;
}

interface TextProviderSettings {
  provider: 'openai' | 'gemini' | 'replicate';
  openaiModel: string;
  geminiModel: string;
  geminiApiKey: string;
  replicateModel: string;
}

interface GeminiImageSettings {
  enabled: boolean;
  apiKey: string;
  model: string;
  models: {
    gemini25Flash: { enabled: boolean; modelId: string; cost: string };
    gemini3Pro: { enabled: boolean; modelId: string; cost: string };
  };
  defaultModel: string;
}

interface AISettings {
  openai: ProviderConfig;
  replicate: ReplicateSettings;
  siliconflow: SiliconFlowSettings;
  flux2pro: Flux2ProSettings;
  stability: ProviderConfig;
  geminiImage: GeminiImageSettings;
  defaultProvider: string;
  fallbackProvider: string | null;
  panelGenerationProvider: 'siliconflow' | 'flux2pro' | 'gemini';
  comicGenerationMode: 'multi-model' | 'gemini-fullpage';
  storyTextProvider: TextProviderSettings;
}

const SETTINGS_FILE = path.join(process.cwd(), ".ai-settings.json");

function loadSettings(): AISettings {
  const defaultSettings: AISettings = {
    openai: {
      enabled: false,
      apiKey: "",
      isDefault: false,
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
      apiKey: '',
      model: 'gemini-2.5-flash-image',
      models: {
        gemini25Flash: {
          enabled: true,
          modelId: 'gemini-2.5-flash-image',
          cost: '$0.039/image (500 free/day)'
        },
        gemini3Pro: {
          enabled: false,
          modelId: 'gemini-3-pro-image-preview',
          cost: '$0.039/image'
        }
      },
      defaultModel: 'gemini25Flash'
    },
    defaultProvider: "openai",
    fallbackProvider: null,
    panelGenerationProvider: "siliconflow",
    comicGenerationMode: 'multi-model',
    storyTextProvider: {
      provider: 'openai',
      openaiModel: 'gpt-4o',
      geminiModel: 'gemini-2.0-flash',
      geminiApiKey: '',
      replicateModel: 'meta/meta-llama-3-70b-instruct',
    },
  };

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const stored = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      const merged = { ...defaultSettings, ...stored };
      if (stored.replicate) {
        merged.replicate = {
          ...defaultSettings.replicate,
          ...stored.replicate,
          models: {
            ...defaultSettings.replicate.models,
            ...(stored.replicate.models || {})
          }
        };
      }
      if (stored.siliconflow) {
        merged.siliconflow = {
          ...defaultSettings.siliconflow,
          ...stored.siliconflow,
          models: {
            ...defaultSettings.siliconflow.models,
            ...(stored.siliconflow.models || {})
          }
        };
      }
      if (stored.flux2pro) {
        merged.flux2pro = {
          ...defaultSettings.flux2pro,
          ...stored.flux2pro,
          models: {
            ...defaultSettings.flux2pro.models,
            ...(stored.flux2pro.models || {})
          }
        };
      }
      if (stored.geminiImage) {
        merged.geminiImage = {
          ...defaultSettings.geminiImage,
          ...stored.geminiImage,
          models: {
            ...defaultSettings.geminiImage.models,
            ...(stored.geminiImage.models || {})
          }
        };
      }
      if (stored.storyTextProvider) {
        merged.storyTextProvider = {
          ...defaultSettings.storyTextProvider,
          ...stored.storyTextProvider,
        };
      }
      return merged;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return defaultSettings;
}

function saveSettings(settings: AISettings): void {
  try {
    const toSave = {
      ...settings,
      openai: { ...settings.openai },
      replicate: { ...settings.replicate },
      siliconflow: { ...settings.siliconflow },
      flux2pro: { ...settings.flux2pro },
      stability: { ...settings.stability },
      geminiImage: { ...settings.geminiImage },
      storyTextProvider: { ...settings.storyTextProvider },
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

let aiSettings = loadSettings();

function getOpenAIClient(): OpenAI {
  // Only use admin-configured API key - no Replit fallbacks
  const adminKey = aiSettings.openai.apiKey;
  const isValidAdminKey = adminKey && 
                          !adminKey.includes('DUMMY') && 
                          adminKey.length > 10 &&
                          adminKey.startsWith('sk-');
  
  if (!isValidAdminKey) {
    throw new Error("OpenAI API key not configured. Please set a valid API key in the admin panel.");
  }
  
  return new OpenAI({
    apiKey: adminKey,
    baseURL: "https://api.openai.com/v1",
  });
}

async function generateTextWithGemini(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiKey: string,
  responseFormat?: { type: string }
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: any = {
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
    }
  };
  if (responseFormat?.type === 'json_object') {
    body.generationConfig.responseMimeType = 'application/json';
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }
  const data = await response.json() as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

async function generateTextWithReplicate(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const replicateApiKey = apiKey || aiSettings.replicate.apiKey;
  if (!replicateApiKey) throw new Error('Replicate API key not configured');
  
  const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: 8192,
        temperature: 0.8,
      },
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${errText}`);
  }
  const prediction = await response.json() as any;
  
  let result = prediction;
  const getUrl = prediction.urls?.get;
  if (getUrl) {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${replicateApiKey}` },
      });
      result = await pollRes.json() as any;
      if (result.status === 'succeeded') break;
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Replicate prediction ${result.status}: ${result.error || 'unknown'}`);
      }
    }
  }
  
  const output = result.output;
  if (Array.isArray(output)) return output.join('');
  if (typeof output === 'string') return output;
  throw new Error('Replicate returned unexpected output format');
}

async function generateTextWithProvider(
  systemPrompt: string,
  userPrompt: string,
  responseFormat?: { type: string }
): Promise<string> {
  const textSettings = aiSettings.storyTextProvider;
  const provider = textSettings.provider;
  
  if (provider === 'gemini') {
    if (!textSettings.geminiApiKey) throw new Error('Gemini API key not configured in admin panel');
    return generateTextWithGemini(systemPrompt, userPrompt, textSettings.geminiModel, textSettings.geminiApiKey, responseFormat);
  }
  
  if (provider === 'replicate') {
    const result = await generateTextWithReplicate(systemPrompt, userPrompt, textSettings.replicateModel, aiSettings.replicate.apiKey);
    return result;
  }
  
  const openai = getOpenAIClient();
  const params: any = {
    model: textSettings.openaiModel || 'gpt-4o',
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
  };
  if (responseFormat) params.response_format = responseFormat;
  const response = await openai.chat.completions.create(params);
  return response.choices[0].message.content || '';
}

interface GenerateComicRequest {
  storyPrompt: string;
  style: string;
  characters: Array<{ name: string; type: string; imageUri?: string; description?: string }>;
  pagesCount: number;
  scenesPerPage: number;
  title?: string;
  language?: string;
}

interface ComicPanel {
  description: string;
  dialogue: string;
  cameraAngle?: string;
}

interface ComicPage {
  pageNumber: number;
  pageType?: 'cover' | 'body' | 'conclusion';
  imageUrl: string;
  panelImages?: string[];
  panels?: ComicPanel[];
  scenes?: {
    description: string;
    dialogue: string;
  };
  generationMode?: 'multi-model' | 'gemini-fullpage';
}

interface ComicJob {
  id: string;
  userId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  title?: string;
  style?: string;
  pagesCount?: number;
  pages: ComicPage[];
  characterNames?: string[];
  savedToLibrary?: boolean;
  /** `user_comics.id` after server auto-save; lets the app open Preview without holding base64 in RAM. */
  libraryComicId?: number;
  error?: string;
  createdAt: number;
}

const jobsCache = new Map<string, ComicJob>();

async function saveJobToDb(job: ComicJob): Promise<void> {
  try {
    if (job.userId && job.libraryComicId != null && Array.isArray(job.pages) && job.pages.length > 0) {
      await syncJobPagesToS3Library(job);
    }
    const existingJob = await db.select().from(comicJobs).where(eq(comicJobs.id, job.id)).limit(1);
    if (existingJob.length > 0) {
      await db.update(comicJobs).set({
        status: job.status,
        progress: job.progress,
        title: job.title || null,
        pages: job.pages,
        error: job.error || null,
        libraryComicId: job.libraryComicId ?? null,
        updatedAt: new Date(),
      }).where(eq(comicJobs.id, job.id));
    } else {
      await db.insert(comicJobs).values({
        id: job.id,
        userId: job.userId || null,
        status: job.status,
        progress: job.progress,
        title: job.title || null,
        style: job.style || null,
        pagesCount: job.pagesCount || null,
        pages: job.pages,
        error: job.error || null,
        libraryComicId: job.libraryComicId ?? null,
      });
    }
    jobsCache.set(job.id, job);
  } catch (error) {
    console.error("Error saving job to database:", error);
    jobsCache.set(job.id, job);
  }
}

async function getJobFromDb(jobId: string): Promise<ComicJob | null> {
  if (jobsCache.has(jobId)) {
    return jobsCache.get(jobId)!;
  }
  
  try {
    const result = await db.select().from(comicJobs).where(eq(comicJobs.id, jobId)).limit(1);
    if (result.length > 0) {
      const dbJob = result[0];
      const job: ComicJob = {
        id: dbJob.id,
        userId: dbJob.userId || undefined,
        status: dbJob.status as ComicJob["status"],
        progress: dbJob.progress,
        title: dbJob.title || undefined,
        style: dbJob.style || undefined,
        pagesCount: dbJob.pagesCount || undefined,
        pages: (dbJob.pages || []) as ComicPage[],
        error: dbJob.error || undefined,
        libraryComicId: dbJob.libraryComicId ?? undefined,
        createdAt: new Date(dbJob.createdAt).getTime(),
      };
      jobsCache.set(jobId, job);
      return job;
    }
  } catch (error) {
    console.error("Error loading job from database:", error);
  }
  return null;
}

// Recover stuck jobs on server startup - mark any "processing" jobs as failed
async function recoverStuckJobs(): Promise<void> {
  try {
    const stuckJobs = await db.select().from(comicJobs)
      .where(eq(comicJobs.status, "processing"));
    
    if (stuckJobs.length > 0) {
      console.log(`Found ${stuckJobs.length} stuck job(s), marking as failed...`);
      for (const job of stuckJobs) {
        if (job.userId && job.libraryComicId != null) {
          await storage.deleteUserComic(job.libraryComicId, job.userId).catch(() => {
            /* best-effort: draft row may already be gone */
          });
        }
        await db.update(comicJobs).set({
          status: "failed",
          error: "Server restarted during generation. Please try again.",
          libraryComicId: null,
          updatedAt: new Date(),
        }).where(eq(comicJobs.id, job.id));
        console.log(`Marked job ${job.id} as failed (was ${job.progress}% complete)`);
      }
    }
  } catch (error) {
    console.error("Error recovering stuck jobs:", error);
  }
}

function getActiveReplicateModel(): { modelId: string; name: string } | null {
  const { models, defaultModel } = aiSettings.replicate;
  
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

async function generateImageWithReplicate(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
  const apiKey = aiSettings.replicate.apiKey;
  if (!apiKey) throw new Error("Replicate API key not configured");

  const activeModel = getActiveReplicateModel();
  if (!activeModel) throw new Error("No Replicate models enabled");

  console.log(`Using Replicate model: ${activeModel.name}`);
  
  const isFluxPro = activeModel.modelId.includes("flux-1.1-pro");
  const isFluxSchnell = activeModel.modelId.includes("flux-schnell");
  
  let inputPayload: any;
  
  if (isFluxPro) {
    inputPayload = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
      output_quality: 80,
      safety_tolerance: 2,
    };
  } else if (isFluxSchnell) {
    inputPayload = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
      output_quality: 80,
      go_fast: true,
      num_outputs: 1,
    };
  } else {
    const fallbackWidth = aspectRatio === "9:16" ? 576 : 1024;
    const fallbackHeight = aspectRatio === "9:16" ? 1024 : 1024;
    inputPayload = {
      prompt: prompt,
      width: fallbackWidth,
      height: fallbackHeight,
      num_outputs: 1,
    };
  }

  const response = await fetch(`https://api.replicate.com/v1/models/${activeModel.modelId}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({ input: inputPayload }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate API error: ${error}`);
  }

  let result = await response.json();
  
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === 'string' ? result.output : result.output?.[0];
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/webp";
      return `data:${contentType};base64,${base64}`;
    }
    return "";
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    result = await statusResponse.json();

    if (result.status === "succeeded") {
      const imageUrl = typeof result.output === 'string' ? result.output : result.output?.[0];
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/webp";
        return `data:${contentType};base64,${base64}`;
      }
      return "";
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Image generation failed");
    }
  }

  throw new Error("Image generation timed out");
}

async function generateImageWithKontext(prompt: string, inputImageUrl: string, aspectRatio: string = "1:1"): Promise<string> {
  const apiKey = aiSettings.replicate.apiKey;
  if (!apiKey) throw new Error("Replicate API key not configured");
  
  if (!aiSettings.replicate.models.fluxKontextDev.enabled) {
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
        prompt: prompt,
        input_image: inputImageUrl,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: 80,
        guidance: 2.5,
        num_inference_steps: 28,
        go_fast: true
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate Kontext API error: ${error}`);
  }

  let result = await response.json();
  
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === 'string' ? result.output : result.output?.[0];
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/webp";
      return `data:${contentType};base64,${base64}`;
    }
    return "";
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    result = await statusResponse.json();

    if (result.status === "succeeded") {
      const imageUrl = typeof result.output === 'string' ? result.output : result.output?.[0];
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/webp";
        return `data:${contentType};base64,${base64}`;
      }
      return "";
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Kontext image generation failed");
    }
  }

  throw new Error("Kontext image generation timed out");
}

// SiliconFlow FLUX Kontext with multi-reference image support
async function generateImageWithSiliconFlow(
  prompt: string, 
  referenceImageUrls: string[] = [],
  aspectRatio: string = "1:1"
): Promise<string> {
  const apiKey = aiSettings.siliconflow.apiKey;
  if (!apiKey) throw new Error("SiliconFlow API key not configured");
  
  const modelConfig = aiSettings.siliconflow.models.fluxKontextDev;
  if (!modelConfig.enabled) {
    throw new Error("SiliconFlow FLUX Kontext is not enabled");
  }

  console.log(`Using SiliconFlow FLUX Kontext with ${referenceImageUrls.length} reference image(s)`);
  
  // Build the request body
  const requestBody: any = {
    model: modelConfig.modelId,
    prompt: prompt,
    image_size: aspectRatio === "9:16" ? "576x1024" : "1024x1024",
    num_inference_steps: 28,
    guidance_scale: 3.5,
  };

  // If we have reference images, add them to the request
  // SiliconFlow supports multiple reference images via the image parameter
  if (referenceImageUrls.length > 0) {
    // For FLUX Kontext, we pass the reference images
    // If multiple images, we'll use the first one as primary input_image
    // and include descriptions of others in the prompt
    requestBody.image = referenceImageUrls[0];
    
    // If we have multiple reference images, we describe them in the prompt
    if (referenceImageUrls.length > 1) {
      // For now, use first reference as the main image
      // The prompt should describe that there are multiple distinct characters
      console.log(`Multi-reference mode: Using ${referenceImageUrls.length} character references`);
    }
  }

  const response = await fetch("https://api.siliconflow.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SiliconFlow API error: ${error}`);
  }

  const result = await response.json();
  
  // SiliconFlow returns images in data array
  if (result.images && result.images.length > 0) {
    const imageUrl = result.images[0].url;
    if (imageUrl) {
      // Download and convert to base64
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/png";
      return `data:${contentType};base64,${base64}`;
    }
  }
  
  // Alternative response format
  if (result.data && result.data.length > 0) {
    const imageData = result.data[0];
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/png";
      return `data:${contentType};base64,${base64}`;
    }
    if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }
  }

  throw new Error("SiliconFlow returned no image data");
}

// FLUX.2 Pro via Replicate with multi-reference image support
async function generateImageWithFlux2Pro(
  prompt: string, 
  referenceImageUrls: string[] = [],
  aspectRatio: string = "1:1"
): Promise<string> {
  const apiKey = aiSettings.flux2pro.apiKey || aiSettings.replicate.apiKey;
  if (!apiKey) throw new Error("FLUX.2 Pro / Replicate API key not configured");
  
  const modelConfig = aiSettings.flux2pro.models.flux2Pro;
  if (!modelConfig || !modelConfig.enabled) {
    throw new Error("FLUX.2 Pro is not enabled");
  }

  console.log(`Using FLUX.2 Pro (Replicate) with ${referenceImageUrls.length} reference image(s)`);
  
  // Build input with reference images
  // FLUX.2 Pro uses input_images array for reference images (up to 8)
  const input: any = {
    prompt: prompt,
    aspect_ratio: aspectRatio,
    output_format: "webp",
    output_quality: 80,
    safety_tolerance: 5
  };

  // Add reference images using input_images array (FLUX.2 Pro's correct parameter)
  if (referenceImageUrls.length > 0) {
    const maxRefs = Math.min(referenceImageUrls.length, 8);
    input.input_images = referenceImageUrls.slice(0, maxRefs);
    console.log(`Multi-reference mode: Passing ${maxRefs} images via input_images array`);
    
    // Update prompt to reference the input images for character consistency
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
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FLUX.2 Pro API error: ${error}`);
  }

  let result = await response.json();
  
  // Handle async prediction polling
  if (result.status === "starting" || result.status === "processing") {
    const pollUrl = result.urls?.get || `https://api.replicate.com/v1/predictions/${result.id}`;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      result = await pollResponse.json();
      if (result.status === "succeeded" || result.status === "failed") break;
    }
  }
  
  if (result.status === "succeeded") {
    const imageUrl = typeof result.output === 'string' ? result.output : result.output?.[0];
    if (imageUrl) {
      // Download and convert to base64
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/webp";
      return `data:${contentType};base64,${base64}`;
    }
  }
  
  throw new Error(`FLUX.2 Pro generation failed: ${result.error || result.status}`);
}

async function generateImageWithConsistentCharacter(
  prompt: string, 
  subjectImageUrl: string,
  outputFormat: string = "webp"
): Promise<string> {
  const apiKey = aiSettings.replicate.apiKey;
  if (!apiKey) throw new Error("Replicate API key not configured");
  
  if (!aiSettings.replicate.models.consistentCharacter.enabled) {
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
        prompt: prompt,
        subject: subjectImageUrl,
        output_format: outputFormat,
        output_quality: 85,
        number_of_outputs: 1,
        randomise_poses: false,
        number_of_images_per_pose: 1
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate Consistent Character API error: ${error}`);
  }

  let result = await response.json();
  
  if (result.status === "succeeded") {
    const outputs = result.output;
    if (outputs && outputs.length > 0) {
      const imageUrl = outputs[0];
      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = imageResponse.headers.get("content-type") || "image/webp";
      return `data:${contentType};base64,${base64}`;
    }
    return "";
  }

  for (let i = 0; i < 90; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    result = await statusResponse.json();

    if (result.status === "succeeded") {
      const outputs = result.output;
      if (outputs && outputs.length > 0) {
        const imageUrl = outputs[0];
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/webp";
        return `data:${contentType};base64,${base64}`;
      }
      return "";
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Consistent Character image generation failed");
    }
  }

  throw new Error("Consistent Character image generation timed out");
}

async function generateImageWithStability(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
  const apiKey = aiSettings.stability.apiKey;
  if (!apiKey) throw new Error("Stability API key not configured");

  const response = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        output_format: "png",
        aspect_ratio: aspectRatio,
      }),
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

// Detect outfit from uploaded character photo using GPT-4o Vision
async function detectOutfitFromPhoto(imageUrl: string, characterName: string): Promise<string> {
  const systemPrompt = `You are an outfit detector. Describe the clothing and accessories visible in the photo in detail.
Focus on: clothing type, colors, patterns, accessories, shoes if visible.
Be specific about colors (e.g., "navy blue" not just "blue").
Format: A concise description suitable for image generation prompts.
Example output: "wearing a red plaid flannel shirt, dark blue jeans, brown leather belt, white sneakers"`;
  const userText = "Describe the outfit/clothing this person is wearing. Be specific about colors and style.";
  
  try {
    console.log(`Detecting outfit for "${characterName}" from uploaded photo...`);
    
    const textSettings = aiSettings.storyTextProvider;
    let outfit = "";
    
    if (textSettings.provider === 'gemini' && textSettings.geminiApiKey) {
      const model = textSettings.geminiModel || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${textSettings.geminiApiKey}`;
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\n${userText}` },
            { inlineData: undefined as any, fileData: undefined as any },
          ]
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 }
      };
      
      if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          body.contents[0].parts[1] = { inlineData: { mimeType: matches[1], data: matches[2] }, fileData: undefined };
        }
      } else {
        body.contents[0].parts[1] = { inlineData: undefined as any, fileData: { mimeType: 'image/jpeg', fileUri: imageUrl } };
      }
      body.contents[0].parts = body.contents[0].parts.filter((p: any) => p.text || p.inlineData || p.fileData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Vision error (${response.status}): ${errText}`);
      }
      const data = await response.json() as any;
      outfit = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } else {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: textSettings.provider === 'openai' ? (textSettings.openaiModel || "gpt-4o") : "gpt-4o",
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
  } catch (error: any) {
    console.error(`Failed to detect outfit for "${characterName}":`, error.message);
    return "";
  }
}

// Adapt detected outfit to story context/role
async function adaptOutfitToStory(
  originalOutfit: string, 
  characterName: string, 
  storyPrompt: string,
  style: string
): Promise<string> {
  try {
    console.log(`Adapting outfit for "${characterName}" to story context...`);
    
    const systemPrompt = `You adapt character outfits to fit story contexts while keeping recognizable elements.

Rules:
1. If the story requires a specific role (knight, wizard, astronaut), adapt the outfit to that role
2. Keep distinctive colors from the original outfit (e.g., blue shirt → blue-accented armor)
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
  } catch (error: any) {
    console.error(`Failed to adapt outfit for "${characterName}":`, error.message);
    return originalOutfit; // Return original if adaptation fails
  }
}

async function generateImageWithOpenAI(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
  const openai = getOpenAIClient();

  console.log("Generating image with OpenAI, prompt length:", prompt.length);
  
  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt: prompt,
    size: aspectRatio === "9:16" ? "1024x1792" as any : "1024x1024",
    n: 1,
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

async function generateImageWithGemini(prompt: string, referenceImageUrls?: string[], aspectRatio: string = "1:1"): Promise<string> {
  const geminiSettings = aiSettings.geminiImage;
  const apiKey = geminiSettings.apiKey || aiSettings.storyTextProvider.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Set it in the Gemini Image section or Story Text Provider section of the admin panel.');
  }

  const selectedModelKey = geminiSettings.defaultModel || 'gemini25Flash';
  const modelConfig = geminiSettings.models[selectedModelKey as keyof typeof geminiSettings.models];
  const modelId = modelConfig?.modelId || geminiSettings.model || 'gemini-2.5-flash-image';

  console.log(`Generating image with Gemini model: ${modelId}`);

  const parts: any[] = [];

  if (referenceImageUrls && referenceImageUrls.length > 0) {
    for (let i = 0; i < referenceImageUrls.length; i++) {
      const refUrl = referenceImageUrls[i];
      try {
        let base64Data: string;
        let mimeType = 'image/png';

        if (refUrl.startsWith('data:')) {
          const match = refUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            continue;
          }
        } else {
          const imgResponse = await fetch(refUrl);
          if (!imgResponse.ok) continue;
          const buffer = await imgResponse.arrayBuffer();
          base64Data = Buffer.from(buffer).toString('base64');
          const contentType = imgResponse.headers.get('content-type');
          if (contentType) mimeType = contentType.split(';')[0];
        }

        parts.push({
          text: `Reference image ${i + 1} - use this character's exact appearance:`
        });
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } catch (err: any) {
        console.warn(`Failed to load reference image ${i + 1} for Gemini: ${err.message}`);
      }
    }
  }

  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['Image'],
      temperature: 1.0,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image generation error (${response.status}): ${errText}`);
  }

  const data = await response.json() as any;
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini returned no image candidates');
  }

  const candidateParts = candidates[0]?.content?.parts;
  if (!candidateParts || candidateParts.length === 0) {
    throw new Error('Gemini returned no image parts');
  }

  for (const part of candidateParts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData) {
      const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
      const base64 = inlineData.data;
      console.log(`Gemini image generated successfully (${mimeType})`);
      return `data:${mimeType};base64,${base64}`;
    }
  }

  console.error('Gemini response parts:', JSON.stringify(candidateParts.map((p: any) => Object.keys(p))));
  throw new Error('Gemini response did not contain image data');
}

function getActiveProvider(): string {
  const defaultProvider = aiSettings.defaultProvider;
  
  // Check if default provider is enabled and has a valid API key
  const providerConfig = aiSettings[defaultProvider as keyof typeof aiSettings];
  if (providerConfig && typeof providerConfig === 'object' && 'enabled' in providerConfig && providerConfig.enabled) {
    // For OpenAI, only use if admin has configured a valid key
    if (defaultProvider === 'openai') {
      const hasValidKey = aiSettings.openai.apiKey && 
                          !aiSettings.openai.apiKey.includes('DUMMY') &&
                          aiSettings.openai.apiKey.length > 10 &&
                          aiSettings.openai.apiKey.startsWith('sk-');
      if (hasValidKey) {
        return 'openai';
      }
    } else if (defaultProvider === 'replicate' && aiSettings.replicate.apiKey) {
      return 'replicate';
    } else if (defaultProvider === 'stability' && aiSettings.stability.apiKey) {
      return 'stability';
    }
  }
  
  // Fall back to first enabled provider with valid key
  if (aiSettings.replicate.enabled && aiSettings.replicate.apiKey) {
    return 'replicate';
  }
  if (aiSettings.stability.enabled && aiSettings.stability.apiKey) {
    return 'stability';
  }
  // Check if OpenAI has a valid admin-configured key
  if (aiSettings.openai.enabled && aiSettings.openai.apiKey && 
      !aiSettings.openai.apiKey.includes('DUMMY') && 
      aiSettings.openai.apiKey.length > 10 &&
      aiSettings.openai.apiKey.startsWith('sk-')) {
    return 'openai';
  }
  
  // No valid providers configured - throw error
  throw new Error("No AI providers configured. Please set up API keys in the admin panel.");
}

async function generateImage(prompt: string, referenceImageUrls?: string[], aspectRatio?: string): Promise<string> {
  const provider = getActiveProvider();
  const panelProvider = aiSettings.panelGenerationProvider || 'siliconflow';
  console.log(`Generating image with provider: ${provider}, panel provider: ${panelProvider}`);

  try {
    // When we have reference images, use the admin-selected panel generation provider
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      // Route to the selected panel generation provider
      if (panelProvider === 'gemini') {
        const geminiKey = aiSettings.geminiImage.apiKey || aiSettings.storyTextProvider.geminiApiKey;
        if (geminiKey && aiSettings.geminiImage.enabled) {
          console.log(`Using Gemini with ${referenceImageUrls.length} reference image(s) for character consistency`);
          return await generateImageWithGemini(prompt, referenceImageUrls, aspectRatio || "1:1");
        } else {
          console.log("Gemini Image not configured, falling back to SiliconFlow...");
        }
      }
      
      if (panelProvider === 'flux2pro') {
        // Use FLUX.2 Pro via Replicate for panel generation
        const apiKey = aiSettings.flux2pro.apiKey || aiSettings.replicate.apiKey;
        const modelEnabled = aiSettings.flux2pro.models?.flux2Pro?.enabled;
        
        if (apiKey && modelEnabled) {
          console.log(`Using FLUX.2 Pro with ${referenceImageUrls.length} reference image(s) for character consistency`);
          return await generateImageWithFlux2Pro(prompt, referenceImageUrls, aspectRatio || "1:1");
        } else {
          console.log("FLUX.2 Pro not configured, falling back to SiliconFlow...");
        }
      }
      
      // Use SiliconFlow (default or fallback)
      if (aiSettings.siliconflow.enabled && 
          aiSettings.siliconflow.apiKey &&
          aiSettings.siliconflow.models.fluxKontextDev.enabled) {
        console.log(`Using SiliconFlow with ${referenceImageUrls.length} reference image(s) for character consistency`);
        return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
      }
      
      // Final fallback: Replicate Kontext (single reference only)
      if (provider === "replicate" && 
          aiSettings.replicate.models.fluxKontextDev.enabled) {
        console.log(`Falling back to Replicate Kontext with first reference image`);
        return await generateImageWithKontext(prompt, referenceImageUrls[0], aspectRatio || "1:1");
      }
    }

    if (panelProvider === 'gemini' && aiSettings.geminiImage.enabled) {
      const geminiKey = aiSettings.geminiImage.apiKey || aiSettings.storyTextProvider.geminiApiKey;
      if (geminiKey) {
        return await generateImageWithGemini(prompt, undefined, aspectRatio || "1:1");
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
  } catch (error: any) {
    console.error(`Image generation error with ${provider}:`, error);
    
    // Step 1: Try other enabled providers first
    const enabledProviders = getEnabledProviders().filter(p => p !== provider);
    for (const altProvider of enabledProviders) {
      try {
        console.log(`Trying other enabled provider: ${altProvider}`);
        return await generateImageWithProvider(altProvider, prompt, referenceImageUrls, aspectRatio);
      } catch (altError: any) {
        console.error(`Enabled provider ${altProvider} also failed:`, altError.message);
      }
    }
    
    // Step 2: Try admin-configured fallback provider as LAST resort
    const fallbackProvider = aiSettings.fallbackProvider;
    if (fallbackProvider && fallbackProvider !== provider && !enabledProviders.includes(fallbackProvider)) {
      try {
        console.log(`Trying admin-configured FALLBACK provider: ${fallbackProvider}`);
        return await generateImageWithProvider(fallbackProvider, prompt, referenceImageUrls, aspectRatio);
      } catch (fallbackError: any) {
        console.error(`FALLBACK provider ${fallbackProvider} also failed:`, fallbackError.message);
      }
    }
    
    throw error;
  }
}

// Get list of enabled providers with valid API keys
function getEnabledProviders(): string[] {
  const enabled: string[] = [];
  
  if (aiSettings.openai.enabled && aiSettings.openai.apiKey && 
      aiSettings.openai.apiKey.length > 10 && aiSettings.openai.apiKey.startsWith('sk-')) {
    enabled.push('openai');
  }
  if (aiSettings.replicate.enabled && aiSettings.replicate.apiKey) {
    enabled.push('replicate');
  }
  if (aiSettings.siliconflow.enabled && aiSettings.siliconflow.apiKey) {
    enabled.push('siliconflow');
  }
  if (aiSettings.stability.enabled && aiSettings.stability.apiKey) {
    enabled.push('stability');
  }
  if (aiSettings.geminiImage.enabled && (aiSettings.geminiImage.apiKey || aiSettings.storyTextProvider.geminiApiKey)) {
    enabled.push('gemini');
  }
  
  return enabled;
}

// Generate image with a specific provider
async function generateImageWithProvider(provider: string, prompt: string, referenceImageUrls?: string[], aspectRatio?: string): Promise<string> {
  // Check if provider has a valid API key
  if (provider === 'gemini') {
    const geminiKey = aiSettings.geminiImage.apiKey || aiSettings.storyTextProvider.geminiApiKey;
    if (!geminiKey || geminiKey.length < 4) {
      throw new Error('Gemini API key not configured');
    }
  } else {
    const providerConfig = aiSettings[provider as keyof typeof aiSettings] as { apiKey?: string } | undefined;
    if (!providerConfig || typeof providerConfig !== 'object' || !providerConfig.apiKey || providerConfig.apiKey.length < 4) {
      throw new Error(`Provider ${provider} is not configured with a valid API key`);
    }
  }
  
  // Handle reference images for panel generation
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    if (provider === 'gemini') {
      return await generateImageWithGemini(prompt, referenceImageUrls, aspectRatio || "1:1");
    }
    if (provider === 'siliconflow' && aiSettings.siliconflow.models?.fluxKontextDev?.enabled) {
      return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
    }
    if (provider === 'replicate' && aiSettings.replicate.models?.fluxKontextDev?.enabled) {
      return await generateImageWithKontext(prompt, referenceImageUrls[0], aspectRatio || "1:1");
    }
  }
  
  switch (provider) {
    case 'gemini':
      return await generateImageWithGemini(prompt, undefined, aspectRatio || "1:1");
    case 'replicate':
      return await generateImageWithReplicate(prompt, aspectRatio || "1:1");
    case 'stability':
      return await generateImageWithStability(prompt, aspectRatio || "1:1");
    case 'siliconflow':
      return await generateImageWithSiliconFlow(prompt, referenceImageUrls, aspectRatio || "1:1");
    case 'openai':
    default:
      return await generateImageWithOpenAI(prompt, aspectRatio || "1:1");
  }
}

async function processComicJobGeminiFullPage(jobId: string, params: GenerateComicRequest) {
  const job = await getJobFromDb(jobId);
  if (!job) return;

  const { storyPrompt, style, characters, pagesCount, title, language } = params;

  const characterNames = (characters || []).map(c => c.name).filter(Boolean);
  job.characterNames = characterNames;

  try {
    job.status = "processing";
    job.progress = 5;
    await ensureLibraryComicDraftForJob(job, {
      title: job.title || title,
      style: job.style || style,
      characterNames,
    });
    await saveJobToDb(job);

    const allCharacters = characters || [];
    const charactersWithImages = allCharacters
      .filter((c) => c.imageUri && (c.imageUri.startsWith('http') || c.imageUri.startsWith('data:')))
      .map((c) => ({ name: c.name, imageUri: c.imageUri as string, description: c.description || '' }));

    const characterDescriptions = (characters || [])
      .map((c) => {
        if (c.description) return `${c.name}: ${c.description}`;
        return `${c.name} (${c.type})`;
      })
      .join("; ");

    const mainCharacterNames = (characters || []).map(c => c.name).filter(Boolean);
    const characterNamesList = mainCharacterNames.length > 0 ? mainCharacterNames.join(', ') : 'the main characters';

    const languageInstruction = language ? `IMPORTANT: Write ALL dialogue, narration, and text in ${language}.` : "";
    const titleInstruction = title ? `The comic title MUST be "${title}".` : "";

    const styleDescriptions: Record<string, string> = {
      Comic: "American comic book style with bold vibrant colors, dynamic action poses, halftone dots, thick black outlines",
      Manga: "Japanese manga style with black and white tones, expressive eyes, dramatic shading, clean linework",
      Manhwa: "Korean manhwa style with soft pastel colors, detailed characters, modern webtoon aesthetic",
      Graphic: "Mature graphic novel style with cinematic composition, realistic proportions, muted colors, dramatic shadows",
      Kawaii: "Kawaii chibi style with oversized heads, huge sparkly eyes, soft pastel colors, adorable proportions",
      Noir: "Film noir style, strictly black and white, high contrast dramatic shadows, moody atmospheric lighting",
      Anime: "Japanese anime style with full vibrant colors, large expressive eyes, clean cel-shaded coloring",
      Afro: "Afrofuturism art style with bold geometric African patterns, vibrant rich colors, futuristic sci-fi elements",
    };

    const narrativeArc = buildNarrativeArcForFullPage(pagesCount);

    const storySystemPrompt = `You are a professional comic book story writer who creates compelling, well-paced narratives with natural dialogue flow. Your stories read like real published comics — each page connects smoothly to the next, dialogue feels natural and advances the plot, and the emotional arc builds from beginning to end.
CRITICAL: Follow the user's story EXACTLY. Do not make up a different story.
Always respond with valid JSON.

=== GOLD STANDARD EXAMPLE — Study this story's flow pattern ===
Here is a perfect 5-page comic story ("Immune") that demonstrates ideal narrative flow. Use this as your quality benchmark:

PAGE 1 (Cover): Hero stands defiantly, ally behind him, setting established visually.
PAGE 2 (World-building + Character): Establishes the world (everyone has powers), shows the hero's problem (he has none), introduces the mysterious ally watching from shadows, ends on the hero's frustration.
  - Panel flow: Wide city → hero alone at school → ally watching → close-up of hero's emotion
  - Dialogue builds: "Everyone is special except me" → "I'm suffocating" → "He's the key" → "I wish I could do something"
  - Each panel shows a DIFFERENT scene but they ALL serve ONE purpose: establishing who the hero is and why he matters

PAGE 3 (Inciting incident + Ally revealed): Villain appears stealing powers (NEWS on screen), villain shown in action (defeating a hero), ally arrives urgently to the hero, hero learns HE is the solution.
  - Panel flow: News report → villain in action → ally lands before hero → hero's shocked reaction
  - Dialogue escalates: "What's going on?" → "Power is mine!" → "You're the only one immune!" → "Me? But I'm..."
  - CAUSE-EFFECT: Villain steals powers (cause) → ally needs hero's help (effect) → hero is shocked (reaction)

PAGE 4 (Action + Confrontation): Ally transfers powers to hero, hero punches villain, hero charges again, villain fires back.
  - Panel flow: Power transfer → first punch → hero flying in → villain's counterattack
  - Dialogue is SHORT and ACTION-DRIVEN: "Take my strength!" → "Argh!" → "This ends now!" → "You cannot defeat me!"
  - Every panel is a CONSECUTIVE MOMENT in the fight — like frames of an action movie

PAGE 5 (Resolution + Emotional payoff): Villain defeated, heroes celebrating, ally acknowledges hero, hero finds new confidence.
  - Panel flow: Villain down → heroes celebrating → ally smiles → hero looks at city with confidence
  - Dialogue wraps up emotionally: "Impossible!" → "We did it" → "No, YOU did it" → "Maybe I'm not so ordinary after all"
  - SATISFYING ENDING: The hero's arc is complete — from feeling powerless to realizing his uniqueness IS his power

KEY PATTERNS TO REPLICATE:
- Each page has ONE clear purpose (world-build, incite, fight, resolve)
- Panels within a page flow like movie scenes — sequential moments, not random snapshots
- Dialogue gets progressively more intense: casual → concerned → urgent → action → reflective
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

=== STORY FLOW RULES (CRITICAL — READ CAREFULLY) ===
1. PAGE-TO-PAGE CONTINUITY: Each page MUST pick up exactly where the previous page left off. No unexplained time jumps or scene changes between pages. If page 2 ends with a character opening a door, page 3 must start with what they see on the other side.
2. DIALOGUE PROGRESSION: Dialogue must flow like a real conversation across the comic. Characters react to what was JUST said. No repeating the same idea across pages. Each line moves the conversation and story forward.
3. CAUSE AND EFFECT: Every event should be caused by something that happened before. If a character is angry on page 4, something on page 3 made them angry. The reader should always understand WHY things are happening.
4. EMOTIONAL ARC: The emotional tone must shift naturally: calm/happy → curious/concerned → tense/worried → intense/dramatic → relieved/satisfied. Never jump from calm to intense without buildup.
5. PANEL-TO-PANEL FLOW: Within each page, panels should flow like a movie scene — like sequential frames of a film. Panel 1 leads to Panel 2 leads to Panel 3. Each panel shows the NEXT moment in time, not a random unrelated moment. The reader should be able to read left-to-right, top-to-bottom and follow the action smoothly.
6. PAGE-TURN HOOKS: Every body page should end on a moment that makes the reader want to turn the page — a cliffhanger, a revelation, a dramatic reaction, or an unresolved moment.
7. NO FILLER: Every panel must advance the story. No panels that just show characters standing around with generic dialogue. Each panel should either reveal something new, show a character reacting, or move the plot forward.
8. SINGLE COHERENT STORYLINE: The entire comic must tell ONE continuous story from start to finish. Do NOT introduce disconnected subplots, random scene changes, or unrelated events. Every page should be a direct continuation of the previous page's events.
9. CHARACTER ACTIONS MATTER: Show characters DOING things that move the plot — running, fighting, discovering, building, helping — not just talking. Mix action panels with dialogue panels for dynamic pacing.
10. LOGICAL CONSEQUENCES: If a character does something on one page, the NEXT page must show the consequences. If they run toward danger, the next page shows them IN the danger. Never skip over important moments.

=== OUTPUT FORMAT ===
For each page, write:
- A CINEMATICALLY DETAILED layout description — each panel must specify: camera angle (wide/medium/close-up/bird's-eye/over-the-shoulder), character positions (left/right/center, facing which direction), specific body language and actions, and the EXACT same environment details when panels share a location
- All dialogue/speech bubbles with character names
- Narration box text for context
- The emotional tone

=== PANEL DESCRIPTION REQUIREMENTS (CRITICAL FOR VISUAL COHERENCE) ===
Each panel description MUST include ALL of these elements:
1. CAMERA ANGLE: "Wide shot", "Medium shot", "Close-up of face", "Over-the-shoulder", "Bird's-eye view", "Low angle looking up", "Dutch angle"
2. CHARACTER POSITION: "Character-A on the LEFT facing right", "Character-B on the RIGHT facing left", "Character-A in CENTER facing camera"
3. CHARACTER ACTION: What the character is physically DOING — "reaching for the door handle", "pointing at the sky", "crouching behind a rock", "running toward the explosion" — NOT "standing" or "looking"
4. ENVIRONMENT: Specific, consistent details — "inside the dark cave with glowing blue crystals on the walls and a narrow stone path", NOT just "in a cave". When the SAME location appears in multiple panels, use the SAME environment description so the AI draws it consistently.
5. VISUAL CONTINUITY: If this panel continues from the previous panel, state what stayed the same — "Same cave interior as Panel 1, but now the camera is closer to the crystal wall"
6. LIGHTING & MOOD: "Warm golden sunset light from the left", "Harsh overhead fluorescent lights", "Dramatic shadows with red emergency lighting"

Format as JSON:
{
  "title": "${title || 'Comic Title'}",
  "pages": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "layoutDescription": "Full page dramatic cover. Background: [SPECIFIC detailed setting with lighting and atmosphere]. Characters positioned in lower 60%: [Character-A] on the LEFT in [specific pose with body language], [Character-B] on the RIGHT in [specific pose]. Camera: low angle looking up at characters, making them look heroic. Lighting: [specific lighting]. All faces clearly visible and matching their portraits.",
      "dialogues": [],
      "narration": "",
      "characters_in_page": [${mainCharacterNames.map(n => `"${n}"`).join(', ') || '"Hero"'}],
      "emotionalTone": "dramatic, inviting"
    },
    {
      "pageNumber": 2,
      "pageType": "body",
      "layoutDescription": "4-panel page: Panel 1 (top, full width) — WIDE SHOT establishing [specific location with details: time of day, weather, notable objects]. [Character-A] on the LEFT walking toward [specific landmark], [Character-B] on the RIGHT pointing at [something specific]. Lighting: [specific]. Panel 2 (middle-left) — MEDIUM SHOT, same location as Panel 1 but camera moved closer. [Character-A] in CENTER, now stopped, turning to look at [what Character-B pointed at], expression of [specific emotion]. Panel 3 (middle-right) — CLOSE-UP of [Character-B]'s face, eyes wide, mouth slightly open, looking directly at [the thing]. Same background visible but blurred behind them. Panel 4 (bottom, full width) — WIDE SHOT, same location, both characters now standing together on the LEFT, both looking RIGHT at [the thing], which is now [changed/closer/revealed]. This creates tension leading to next page.",
      "dialogues": [
        {"character": "${mainCharacterNames[0] || 'Hero'}", "text": "short dialogue line", "panel": 1},
        {"character": "${mainCharacterNames[1] || mainCharacterNames[0] || 'Hero'}", "text": "natural response", "panel": 2},
        {"character": "${mainCharacterNames[0] || 'Hero'}", "text": "reaction advancing plot", "panel": 3}
      ],
      "narration": "Brief narration providing context",
      "characters_in_page": ["${mainCharacterNames[0] || 'Hero'}", "${mainCharacterNames[1] || mainCharacterNames[0] || 'Hero'}"],
      "emotionalTone": "calm, establishing"
    }
  ]
}

=== RULES ===
- Cover page: MUST include ALL main characters (${characterNamesList}) in characters_in_page and show them all prominently
- Body pages: 3-6 panels per page with cinematically detailed compositions
- Each panel description MUST specify camera angle, character positions (left/right/center), specific actions, and environment details — NEVER write vague descriptions like "characters in a park" or "characters talking"
- When the same location appears in multiple panels, REPEAT the same environment details word-for-word so the AI draws the same place consistently
- Dialogue must be character-attributed and feel like natural speech for that character
- IMPORTANT: Keep ALL dialogue lines SHORT — maximum 5-10 words per speech bubble. Break longer dialogue into multiple short bubbles
- Each page's narration should provide context or transitions, not repeat what the dialogue says
- The LAST page's final dialogue line should feel like a satisfying story ending
- NO CHARACTER DUPLICATION: Each character appears AT MOST ONCE per panel. Never describe the same character in two positions within one panel.
- SEQUENTIAL PANELS: Panels must read like consecutive movie frames. Panel 1 → 2 → 3 → 4 shows the NEXT moment each time. Describe what CHANGED between panels.
- CONTINUITY BETWEEN PAGES: The first panel of each body page must continue from the last panel of the previous page. If the location is the same, describe it identically. If the location changed, the narration must explain the transition.

=== TITLE AND DIALOGUE SEPARATION (CRITICAL) ===
- The comic title "${title || 'Comic Title'}" is ONLY for the cover page visual — it appears as stylized lettering on the cover art
- Characters must NEVER say, repeat, reference, or mention the comic title in their dialogue on ANY page
- Dialogue should be natural conversation — people do not say the name of the story they are in
- If the title describes the plot (e.g. "The Great Adventure"), characters should NOT say "this is a great adventure" or similar phrases that echo the title
- Narration boxes should also NOT repeat or reference the title — use original narration text`;

    job.progress = 10;
    await saveJobToDb(job);

    const storyContent = await generateTextWithProvider(storySystemPrompt, storyPromptText, { type: "json_object" });
    if (!storyContent) throw new Error("No story content generated");

    const story = JSON.parse(storyContent);
    job.title = story.title || title;
    job.progress = 20;
    await saveJobToDb(job);

    const geminiApiKey = aiSettings.geminiImage.apiKey || aiSettings.storyTextProvider.geminiApiKey;
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured. Required for full-page generation mode.');
    }

    const selectedModelKey = aiSettings.geminiImage.defaultModel || 'gemini25Flash';
    const modelConfig = aiSettings.geminiImage.models[selectedModelKey as keyof typeof aiSettings.geminiImage.models];
    const modelId = modelConfig?.modelId || aiSettings.geminiImage.model || 'gemini-2.5-flash-image';

    const styleDesc = styleDescriptions[style] || styleDescriptions.Comic;

    // === PHASE 0: Transform character photos into art style ===
    // This creates stylized character portraits that Gemini can consistently reference
    const stylizedCharacters: Map<string, { base64: string; mimeType: string }> = new Map();

    if (charactersWithImages.length > 0) {
      console.log(`=== GEMINI FULL-PAGE: Transforming ${charactersWithImages.length} character(s) into ${style} style ===`);
      job.progress = 15;
      await saveJobToDb(job);

      for (const charData of charactersWithImages) {
        try {
          let rawBase64: string;
          let rawMime = 'image/png';
          if (charData.imageUri.startsWith('data:')) {
            const match = charData.imageUri.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              rawMime = match[1];
              rawBase64 = match[2];
            } else continue;
          } else {
            const imgResponse = await fetch(charData.imageUri);
            if (!imgResponse.ok) continue;
            const buffer = await imgResponse.arrayBuffer();
            rawBase64 = Buffer.from(buffer).toString('base64');
            const contentType = imgResponse.headers.get('content-type');
            if (contentType) rawMime = contentType.split(';')[0];
          }

          const transformPrompt = `Transform this person's photo into a ${styleDesc} character portrait.

CRITICAL INSTRUCTIONS:
- KEEP the EXACT same face: same face shape, same eye shape, same eye color, same nose, same mouth, same skin tone, same hair color, same hairstyle
- The person must be IMMEDIATELY RECOGNIZABLE — someone who knows this person should instantly say "that's them!"
- ONLY change the rendering style to ${style} — apply the art style's linework, coloring technique, and shading method
- Do NOT change, idealize, or beautify any facial features. Preserve every detail: freckles, dimples, moles, facial hair, glasses, scars, wrinkles, etc.
- Draw a portrait from shoulders up, face clearly visible and facing slightly toward camera
- Clean simple background (solid or simple gradient)
- The result should look like a professional ${style} character sheet portrait of THIS specific person
- DO NOT add any text, labels, or watermarks`;

          const transformUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const transformBody = {
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: rawMime, data: rawBase64 } },
                { text: transformPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ['Image'],
              temperature: 0.4,
            }
          };

          let stylizedBase64 = '';
          let stylizedMime = 'image/png';

          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              console.log(`Transforming "${charData.name}" to ${style} style (attempt ${attempt}/2)...`);
              const response = await fetch(transformUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transformBody),
              });

              if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini transform error (${response.status}): ${errText.substring(0, 200)}`);
              }

              const data = await response.json() as any;
              const candidateParts = data.candidates?.[0]?.content?.parts;
              if (!candidateParts) throw new Error('No content parts in transform response');

              for (const part of candidateParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  stylizedMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                  stylizedBase64 = inlineData.data;
                  break;
                }
              }

              if (stylizedBase64) {
                console.log(`Successfully transformed "${charData.name}" into ${style} style`);
                break;
              }
              throw new Error('No image data in transform response');
            } catch (err: any) {
              console.error(`Transform attempt ${attempt} for "${charData.name}" failed: ${err.message}`);
              if (attempt === 2) {
                console.warn(`Using raw photo for "${charData.name}" as fallback`);
                stylizedBase64 = rawBase64;
                stylizedMime = rawMime;
              } else {
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          }

          stylizedCharacters.set(charData.name, { base64: stylizedBase64, mimeType: stylizedMime });
        } catch (err: any) {
          console.error(`Failed to process character "${charData.name}": ${err.message}`);
        }
      }

      console.log(`=== Character transformation complete: ${stylizedCharacters.size}/${charactersWithImages.length} stylized ===`);
    }

    const totalPages = Math.min(story.pages?.length || pagesCount, pagesCount);

    for (let i = 0; i < totalPages; i++) {
      const page = story.pages?.[i];
      if (!page) continue;

      const pageType = page.pageType || (i === 0 ? 'cover' : (i === totalPages - 1 ? 'conclusion' : 'body'));
      const isCover = pageType === 'cover';

      console.log(`=== GEMINI FULL-PAGE: Generating page ${i + 1}/${totalPages} (${pageType}) ===`);

      const dialogueText = (page.dialogues || [])
        .map((d: any) => `${d.character}: "${d.text}"`)
        .join('\n');

      const charactersInPage = page.characters_in_page || mainCharacterNames;

      // Build character reference parts using STYLIZED portraits (not raw photos)
      let characterRefParts: any[] = [];
      const refCharsInPage: Array<{ name: string; description: string }> = [];
      for (const charName of charactersInPage) {
        const stylized = stylizedCharacters.get(charName);
        const charInfo = allCharacters.find(c => c.name === charName);
        const charDesc = charInfo?.description || '';
        if (stylized) {
          refCharsInPage.push({ name: charName, description: charDesc });
          const descLabel = charDesc ? ` Physical appearance: ${charDesc}.` : '';
          characterRefParts.push({
            text: `CHARACTER PORTRAIT #${refCharsInPage.length}: "${charName}".${descLabel} This is the ONLY correct face for "${charName}". Every time "${charName}" appears in a panel, they MUST have THIS exact face, hair, and skin tone. Do NOT use any other character's face for "${charName}":`
          });
          characterRefParts.push({
            inlineData: { mimeType: stylized.mimeType, data: stylized.base64 }
          });
        }
      }

      // Build character differentiation section when multiple characters exist
      let characterDiffSection = '';
      if (refCharsInPage.length >= 2) {
        const diffLines = refCharsInPage.map((c, idx) => {
          const desc = c.description ? ` — ${c.description}` : '';
          return `  - "${c.name}" = Portrait #${idx + 1}${desc}`;
        }).join('\n');
        characterDiffSection = `\n\nCHARACTER DIFFERENTIATION (CRITICAL — DO NOT MIX UP CHARACTERS):
Each character is a DIFFERENT person with a UNIQUE face. NEVER swap their faces.
${diffLines}
- When multiple characters appear in the same panel, carefully check WHICH portrait matches WHICH character name before drawing
- "${refCharsInPage[0].name}" and "${refCharsInPage[1].name}" are DIFFERENT people — they must NOT look alike
- If a panel shows characters side by side, draw "${refCharsInPage[0].name}" using Portrait #1 and "${refCharsInPage[1].name}" using Portrait #2 — NEVER reverse them`;
      }

      const hasRefPhotos = characterRefParts.length > 0;
      const faceMatchReminder = hasRefPhotos
        ? `\n\nCHARACTER CONSISTENCY (HIGHEST PRIORITY):
- Stylized character portraits have been provided above. Each character MUST look exactly like their portrait.
- These portraits are already in ${style} art style — match the face, hair, skin tone, and features precisely.
- The characters must be IMMEDIATELY RECOGNIZABLE as the same people from the portraits across every panel.
- Maintain consistent: face shape, eye shape & color, nose, mouth, skin tone, hair color & style, body type, and any unique features.
- Do NOT deviate from the character portraits. They are the GROUND TRUTH for character appearance.
- NEVER use one character's face on another character's body. Each character has their OWN unique face.${characterDiffSection}`
        : '';

      let pagePrompt: string;

      if (isCover) {
        pagePrompt = `Generate a comic book COVER PAGE as a single image. Do NOT include any title text, lettering, words, or written text of any kind. Only draw the artwork.

ART STYLE: ${styleDesc}

LAYOUT: Full page cover art. Main characters in dramatic heroic poses in the lower 60%. Rich atmospheric background. Leave the TOP 20% of the image relatively clean/simple (sky, gradient, atmospheric effect) as space where a title will be added later.

CHARACTERS: ${characterDescriptions || charactersInPage.join(', ')}
${faceMatchReminder}

REQUIREMENTS:
- Draw the comic book cover artwork ONLY — NO text, NO title, NO lettering anywhere
- Characters in dramatic poses, full body visible — faces must be clearly visible and MATCH the stylized portraits exactly
- Rich detailed background setting
- Professional comic book cover quality
- Use 9:16 portrait aspect ratio composition
- Keep the TOP 20% of the image as a clean area (sky, atmosphere, gradient) for title placement later
- CHARACTER FACES must match the provided stylized portraits faithfully — same person, same features, same art style`;
      } else {
        pagePrompt = `Generate a comic book PAGE as a single image with multiple panels and white gutters. Do NOT include any speech bubbles, dialogue text, narration boxes, or any written text at all. Only draw the artwork.

ART STYLE: ${styleDesc}

PAGE LAYOUT: ${page.layoutDescription || 'Standard 4-panel comic page layout'}

CHARACTERS: ${characterDescriptions || charactersInPage.join(', ')}
Emotional tone: ${page.emotionalTone || 'dramatic'}
${faceMatchReminder}

CRITICAL REQUIREMENTS:
- Draw the comic page as ONE image with panel borders and THICK WHITE GUTTERS (at least 3-4% of image width) between panels
- Also leave a WHITE BORDER/MARGIN around the entire page — at least 3% on all four sides
- Do NOT draw any speech bubbles, text, dialogue, narration boxes, or any words — leave the panels clean with artwork only
- Each panel shows a DIFFERENT SEQUENTIAL MOMENT in the scene — like consecutive frames of a movie, flowing left-to-right, top-to-bottom
- Characters must look CONSISTENT across all panels AND match the stylized character portraits provided
- CHARACTER FACES must faithfully reproduce the features from the stylized portraits — this is the highest priority
- Professional comic book page quality with clear, thick panel borders
- Use 9:16 portrait aspect ratio composition
- Leave EMPTY SPACE in the upper area of each panel (sky, ceiling, open area) where speech bubbles will be added later — do not fill the top 20-25% of panels with important character details
- Make it look like a real published comic book page minus the text

CHARACTER DUPLICATION RULES (CRITICAL — NO CLONING):
- Each named character may appear AT MOST ONCE per panel — NEVER draw the same character twice in a single panel
- If there are 2 characters, each panel should show at most 2 distinct people — one matching each portrait
- Do NOT duplicate, clone, or mirror any character within a panel
- If the layout says a character speaks in a panel, draw them ONCE in that panel, not multiple times
- Check each panel before finalizing: count the characters — if you see the same face twice, remove the duplicate`;
      }

      const parts: any[] = [...characterRefParts, { text: pagePrompt }];

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
      const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['Image'],
          temperature: 1.0,
        }
      };

      let pageImageUrl = '';
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Page ${i + 1} attempt ${attempt}/${maxRetries} with Gemini ${modelId}...`);
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini error (${response.status}): ${errText.substring(0, 200)}`);
          }

          const data = await response.json() as any;
          const candidates = data.candidates;
          if (!candidates || candidates.length === 0) throw new Error('No image candidates');

          const candidateParts = candidates[0]?.content?.parts;
          if (!candidateParts) throw new Error('No content parts');

          for (const part of candidateParts) {
            const inlineData = part.inlineData || part.inline_data;
            if (inlineData) {
              const mime = inlineData.mimeType || inlineData.mime_type || 'image/png';
              pageImageUrl = `data:${mime};base64,${inlineData.data}`;
              break;
            }
          }

          if (pageImageUrl) {
            console.log(`Page ${i + 1} generated successfully`);
            break;
          }
          throw new Error('Response did not contain image data');
        } catch (err: any) {
          console.error(`Page ${i + 1} attempt ${attempt} failed: ${err.message}`);
          if (attempt === maxRetries) {
            console.error(`All retries exhausted for page ${i + 1}`);
          } else {
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      // === PASS 2 (COVER): Add title text to cover page ===
      if (isCover && pageImageUrl && job.title) {
        console.log(`Page ${i + 1} PASS 2: Adding title "${job.title}" to cover...`);
        try {
          const coverBase64 = pageImageUrl.replace(/^data:image\/\w+;base64,/, '');
          const coverMime = pageImageUrl.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

          const titleOverlayPrompt = `You are given a comic book cover image with character artwork but NO title text. Your job is to ADD the title text on top of this existing artwork.

TITLE TO ADD: "${job.title}"

CRITICAL RULES:
- Add the title "${job.title}" as LARGE, BOLD, stylized comic book lettering
- Place the title in the UPPER portion of the image where there is clean/open space
- The title must be CENTERED horizontally
- Use dramatic comic book title typography — bold, with outline or drop shadow for contrast
- DO NOT change, redraw, or alter the existing artwork — ONLY add the title text on top
- DO NOT add any other text, speech bubbles, or captions — ONLY the title

TITLE PLACEMENT (ABSOLUTELY CRITICAL):
- The title MUST be 100% within the image boundaries — every single letter fully visible
- Keep at least 10% margin from the left edge and 10% margin from the right edge
- Keep at least 5% margin from the top edge
- If the title is long (more than 15 characters), SHRINK the font size or WRAP onto two lines to fit within the safe area
- NEVER let any letter get cut off or extend beyond any edge of the image
- The entire title must be readable in one glance — no missing or clipped characters
- Test mentally: if you drew a rectangle around all the title text, that rectangle must be fully inside the image with margins on all sides`;

          const titleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const titleBody = {
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: coverMime, data: coverBase64 } },
                { text: titleOverlayPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ['Image'],
              temperature: 0.4,
            }
          };

          for (let titleAttempt = 1; titleAttempt <= 2; titleAttempt++) {
            try {
              const titleResponse = await fetch(titleUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(titleBody),
              });

              if (!titleResponse.ok) {
                const errText = await titleResponse.text();
                throw new Error(`Gemini title overlay error (${titleResponse.status}): ${errText.substring(0, 200)}`);
              }

              const titleData = await titleResponse.json() as any;
              const titleParts = titleData.candidates?.[0]?.content?.parts;
              if (!titleParts) throw new Error('No content in title overlay response');

              for (const part of titleParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  const mime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                  pageImageUrl = `data:${mime};base64,${inlineData.data}`;
                  console.log(`Page ${i + 1} PASS 2: Title added successfully`);
                  break;
                }
              }
              break;
            } catch (err: any) {
              console.error(`Cover title attempt ${titleAttempt} failed: ${err.message}`);
              if (titleAttempt < 2) await new Promise(r => setTimeout(r, 2000));
              else console.warn(`Cover: Using artwork without title as fallback`);
            }
          }
        } catch (err: any) {
          console.error(`Cover title overlay error: ${err.message}. Using artwork as-is.`);
        }
      }

      // === PASS 2 (BODY): Add speech bubbles and text to body pages ===
      if (!isCover && pageImageUrl && (dialogueText || page.narration)) {
        console.log(`Page ${i + 1} PASS 2: Adding speech bubbles with large readable text...`);
        try {
          const artBase64 = pageImageUrl.replace(/^data:image\/\w+;base64,/, '');
          const artMime = pageImageUrl.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

          const textOverlayPrompt = `You are given a comic book page with panels and artwork but NO speech bubbles or text. Your job is to ADD speech bubbles and narration boxes with dialogue text ON TOP of this existing artwork.

DIALOGUE TO ADD (as speech bubbles with tails pointing to the speaking character):
${dialogueText || 'No dialogue'}

${page.narration ? `NARRATION TO ADD (as rectangular caption boxes at top or bottom of panels): "${page.narration}"` : ''}

CRITICAL RULES FOR TEXT:
- Add WHITE speech bubbles with BLACK text on top of the existing panel artwork
- Text MUST be VERY LARGE and BOLD — at least 3-4% of the total image height per letter
- Use thick, clean, uppercase comic book hand-lettering
- Each speech bubble must have a clear pointed TAIL pointing toward the speaking character
- Speech bubbles should be WHITE with a thin BLACK outline
- Text must FILL the speech bubble generously — no tiny text with excessive white space
- Narration boxes should be rectangular with a colored/shaded background and large bold text
- DO NOT change, redraw, or alter the existing artwork in any way — ONLY add speech bubbles and text on top
- DO NOT move, resize, or modify any panels or characters
- Place speech bubbles in the upper portion of panels where possible, not covering character faces
- Every piece of dialogue listed above MUST appear as a speech bubble — do not skip any
- The text must be easily readable on a small mobile phone screen

BUBBLE PLACEMENT (HIGHEST PRIORITY — ABSOLUTELY NO CLIPPING):
- Imagine the ENTIRE IMAGE has an invisible safe zone that starts 8% from the left edge, 8% from the right edge, 5% from the top, and 5% from the bottom
- EVERY speech bubble and narration box must be ENTIRELY within this safe zone — no exceptions
- If a character is near the edge of a panel, place the speech bubble IN THE CENTER of the panel and use a LONG CURVED TAIL to connect it
- NEVER place a bubble touching or near any edge of the image — always keep generous margins
- If space is tight, use SMALLER bubbles with FEWER words rather than placing anything near an edge
- Before finalizing each bubble: verify all 4 sides of the bubble are well inside the safe zone

PANEL BORDER RESPECT (CRITICAL — ZERO TOLERANCE):
- The image has white gutters/borders separating panels — these are NO-GO ZONES for speech bubbles
- Each speech bubble must be ENTIRELY WITHIN the artwork area of a single panel — NOT touching, overlapping, or crossing any white gutter line
- Imagine each panel has its own internal safe zone: 10% inset from each of its 4 edges — place bubbles within that inner area only
- Do NOT place a bubble that spans two panels, sits on a gutter, or has any part extending into an adjacent panel
- If a panel is small, use a SMALLER bubble — never let a bubble spill outside its panel
- Narration boxes must also stay within panel boundaries`;

          const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
          const textBody = {
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: artMime, data: artBase64 } },
                { text: textOverlayPrompt }
              ]
            }],
            generationConfig: {
              responseModalities: ['Image'],
              temperature: 0.4,
            }
          };

          for (let textAttempt = 1; textAttempt <= 2; textAttempt++) {
            try {
              const textResponse = await fetch(textUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(textBody),
              });

              if (!textResponse.ok) {
                const errText = await textResponse.text();
                throw new Error(`Gemini text overlay error (${textResponse.status}): ${errText.substring(0, 200)}`);
              }

              const textData = await textResponse.json() as any;
              const textParts = textData.candidates?.[0]?.content?.parts;
              if (!textParts) throw new Error('No content in text overlay response');

              for (const part of textParts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData) {
                  const mime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                  pageImageUrl = `data:${mime};base64,${inlineData.data}`;
                  console.log(`Page ${i + 1} PASS 2: Speech bubbles added successfully`);
                  break;
                }
              }
              break;
            } catch (err: any) {
              console.error(`Page ${i + 1} text overlay attempt ${textAttempt} failed: ${err.message}`);
              if (textAttempt < 2) await new Promise(r => setTimeout(r, 2000));
              else console.warn(`Page ${i + 1}: Using artwork without text overlay as fallback`);
            }
          }
        } catch (err: any) {
          console.error(`Page ${i + 1} text overlay error: ${err.message}. Using artwork as-is.`);
        }
      }

      job.pages.push({
        pageNumber: i + 1,
        pageType: pageType as 'cover' | 'body' | 'conclusion',
        imageUrl: pageImageUrl,
        panelImages: undefined,
        scenes: {
          description: page.layoutDescription || '',
          dialogue: dialogueText || '',
        },
        panels: (page.dialogues || []).map((d: any, idx: number) => ({
          description: d.text || '',
          dialogue: `${d.character}: ${d.text}`,
          cameraAngle: '',
        })),
        generationMode: 'gemini-fullpage',
      });

      const pageProgress = 20 + ((i + 1) / totalPages) * 70;
      job.progress = Math.round(pageProgress);
      await saveJobToDb(job);
    }

    console.log(`Job ${jobId} completed with ${job.pages.length} full pages via Gemini`);

    if (job.userId && !job.savedToLibrary) {
      try {
        await syncJobPagesToS3Library(job, { publish: true });
        job.savedToLibrary = true;
      } catch (saveError) {
        console.error("Failed to publish comic draft to library:", saveError);
        await discardLibraryComicDraftIfUnused(job);
        try {
          const comic = await createUserComicS3Only(job.userId, {
            title: job.title || "Untitled Comic",
            style: job.style || "Comic",
            characterNames: job.characterNames || [],
            pages: job.pages,
          });
          job.libraryComicId = comic.id;
          job.savedToLibrary = true;
          job.pages = comic.pages as ComicPage[];
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
  } catch (error: any) {
    console.error("Gemini full-page generation error:", error);
    job.status = "failed";
    job.error = error.message || "Generation failed";
    await discardLibraryComicDraftIfUnused(job);
    await saveJobToDb(job);
    await refundCreditsForFailedJob(job);
  }
}

async function refundCreditsForFailedJob(job: ComicJob): Promise<void> {
  if (!job.userId) return;
  try {
    const settings = await storage.getCreditSettings();
    const numPages = job.pagesCount ?? 6;
    const additionalPages = Math.max(0, numPages - 1);
    const totalCost = settings.baseCost + additionalPages * settings.costPerPage;
    await storage.updateUserCredits(job.userId, totalCost);
    await storage.recordTransaction(job.userId, totalCost, "comic_refund", "Refund: generation failed");
    console.log(`Refunded ${totalCost} credits to user ${job.userId} after generation failure`);
  } catch (refundError: any) {
    console.error("Failed to refund credits:", refundError);
  }
}

function buildNarrativeArcForFullPage(totalPages: number): string {
  const parts: string[] = [];

  parts.push(`PAGE 1 - COVER:
  Purpose: Title page and first impression. Movie poster composition.
  Content: Title in bold stylized lettering at top. All main characters in dramatic/heroic poses. Background hints at the story setting and mood.
  Panels: 1 full-page image.`);

  if (totalPages <= 3) {
    parts.push(`PAGE 2 - INTRODUCTION + CONFLICT + CLIMAX:
  Purpose: The entire story arc in one page — set up the world, introduce the problem, and reach the peak moment.
  Story beats: Panel 1-2: Introduce characters in their normal setting with a calm opening. Panel 3: The inciting incident — something disrupts their world. Panel 4-5: Characters react and confront the challenge. Final panel: The climactic moment — highest tension.
  Dialogue flow: Start with casual/friendly dialogue, shift to urgent/dramatic as conflict appears, end with intense/action dialogue.
  Page-turn hook: End on the peak moment so the reader MUST turn to see how it resolves.
  Panels: 4-6 panels.`);

    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Resolve the conflict and deliver emotional payoff.
  Story beats: Panel 1: The aftermath of the climax — how was the challenge overcome? Panel 2-3: Characters react with relief, joy, or reflection. Final panel: A satisfying closing image — characters together, a new beginning, or a meaningful final moment.
  Dialogue flow: Start with relieved/triumphant dialogue, end with warm/reflective words. The last line should feel like a proper story ending.
  Panels: 3-5 panels.`);

  } else if (totalPages <= 5) {
    parts.push(`PAGE 2 - INTRODUCTION:
  Purpose: Establish the world and characters. Show normal life BEFORE the adventure begins.
  Story beats: Panel 1: Wide establishing shot of the setting — show where and when. Panel 2-3: Introduce each main character through action or dialogue that reveals their personality. Final panel: A subtle hint or foreshadowing of trouble ahead.
  Dialogue flow: Natural, conversational. Characters talk about their day, their plans, or their relationship. Dialogue should reveal who they are.
  Page-turn hook: End with a tease — a strange noise, an unexpected visitor, or an ominous sign.
  Panels: 4-5 panels.`);

    for (let p = 3; p < totalPages; p++) {
      const isLast = p === totalPages - 1;
      if (!isLast) {
        parts.push(`PAGE ${p} - RISING ACTION:
  Purpose: The conflict appears and escalates. Tension builds steadily.
  Story beats: Panel 1: Pick up EXACTLY where page ${p - 1} ended — same scene, same moment. Panel 2-3: The problem becomes clear — characters face an obstacle, threat, or challenge. Panel 4-5: Characters attempt to deal with it but things get worse or more complicated.
  Dialogue flow: Shift from curious/concerned to worried/determined. Characters discuss the problem, argue about solutions, or express fear.
  Page-turn hook: End on a moment of maximum danger or a dramatic revelation that demands the reader continue.
  Panels: 4-6 panels.`);
      } else {
        parts.push(`PAGE ${p} - CLIMAX:
  Purpose: The peak of the story — the most intense, dramatic, exciting page.
  Story beats: Panel 1: Continue directly from page ${p - 1}. Panel 2-3: The big confrontation, challenge, or decisive moment. Characters take bold action. Panel 4-5: The turning point — the moment everything changes. Victory, breakthrough, or sacrifice.
  Dialogue flow: Short, punchy, emotional. Action-driven lines. Battle cries, desperate pleas, or triumphant declarations.
  Page-turn hook: End at the moment of triumph or transformation — the reader turns to see the aftermath.
  Panels: 4-6 panels.`);
      }
    }

    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Wrap up the story with emotional payoff and a satisfying conclusion.
  Story beats: Panel 1: The immediate aftermath of the climax. Panel 2-3: Characters process what happened — celebration, relief, gratitude, or reflection. Final panel: A closing image that gives the reader a sense of completion — characters together, a peaceful scene, or a meaningful visual callback to the beginning.
  Dialogue flow: Warm, reflective. Characters express what the experience meant to them. The final dialogue line should feel like a proper ending — hopeful, funny, or emotionally resonant.
  Panels: 3-5 panels.`);

  } else {
    // 6+ pages: full 5-act structure
    parts.push(`PAGE 2 - INTRODUCTION:
  Purpose: Establish the world and characters. The reader should understand WHO these people are and WHAT their normal life looks like.
  Story beats: Panel 1: Wide establishing shot showing the setting — time, place, atmosphere. Panel 2-3: Introduce each main character through action or dialogue that reveals personality and relationships. Final panel: Foreshadowing — a subtle hint that something is about to change.
  Dialogue flow: Warm, natural conversation. Characters reveal their personalities through how they speak to each other.
  Page-turn hook: End with an intriguing moment — something catches a character's attention, an unexpected arrival, or a mysterious discovery.
  Panels: 4-5 panels.`);

    const bodyEnd = totalPages - 1;
    const midpoint = Math.floor((3 + bodyEnd) / 2);

    for (let p = 3; p <= bodyEnd; p++) {
      if (p < midpoint) {
        const risingPart = p - 2;
        parts.push(`PAGE ${p} - RISING ACTION (Part ${risingPart}):
  Purpose: The conflict deepens and stakes get higher. Each page should be MORE tense than the last.
  Story beats: Panel 1: Continue DIRECTLY from page ${p - 1} — same scene, same moment, no time jumps. Panel 2-3: New obstacles, revelations, or complications make the situation worse. Characters struggle, argue, discover clues, or face setbacks. Final panel: A mini-cliffhanger or escalation that raises the stakes even further.
  Dialogue flow: Increasingly urgent. Characters shift from concerned to determined to desperate. Arguments, plans, and emotional reactions drive the dialogue.
  Page-turn hook: End on a moment where things just got significantly worse — a betrayal, a new threat, or a ticking clock.
  Panels: 4-6 panels.`);
      } else {
        const climaxPart = p - midpoint + 1;
        const totalClimaxPages = bodyEnd - midpoint + 1;
        const isFirstClimax = climaxPart === 1;
        const isLastClimax = p === bodyEnd;

        parts.push(`PAGE ${p} - CLIMAX (Part ${climaxPart} of ${totalClimaxPages}):
  Purpose: ${isFirstClimax ? 'The big confrontation BEGINS. Maximum action and drama.' : isLastClimax ? 'The TURNING POINT. The decisive moment where the outcome is determined.' : 'The confrontation CONTINUES at peak intensity.'}
  Story beats: Panel 1: ${isFirstClimax ? 'The confrontation erupts — characters face the main challenge head-on.' : `Continue directly from page ${p - 1} at full intensity.`} Panel 2-4: ${isFirstClimax ? 'Back-and-forth action. Characters use their skills, make sacrifices, or discover inner strength.' : isLastClimax ? 'The final push. Characters give everything they have. The decisive blow, choice, or breakthrough happens.' : 'The battle/challenge continues with twists and reversals. Things seem hopeless before a glimmer of hope appears.'} Final panel: ${isLastClimax ? 'The moment of victory, resolution, or transformation. The main conflict is DECIDED.' : 'A dramatic moment that pushes the conflict even higher.'}
  Dialogue flow: Short, punchy, emotional. Action lines, battle cries, desperate pleas, or triumphant declarations. Every word matters.
  ${isLastClimax ? '' : `Page-turn hook: End on a moment of maximum danger or a dramatic reversal.`}
  Panels: 4-6 panels.`);
      }
    }

    parts.push(`PAGE ${totalPages} - RESOLUTION + ENDING:
  Purpose: Deliver the emotional payoff. Wrap up every story thread. Leave the reader satisfied.
  Story beats: Panel 1: The immediate aftermath of the climax — show the result. Panel 2-3: Characters react emotionally — celebration, relief, tears of joy, gratitude, or quiet reflection. Panel 4: A moment that echoes or contrasts with the beginning — showing how characters have grown or changed. Final panel: The closing image — characters together, a peaceful scene, or a meaningful visual that gives the story a sense of completion.
  Dialogue flow: Warm, reflective, and hopeful. Characters express gratitude, share what they learned, or look forward to the future. The LAST line of dialogue should feel like a real ending — memorable, emotional, or gently funny.
  Panels: 3-5 panels.`);
  }

  return parts.join('\n\n');
}

async function processComicJob(jobId: string, params: GenerateComicRequest) {
  if (aiSettings.comicGenerationMode === 'gemini-fullpage') {
    console.log(`=== Using GEMINI FULL-PAGE generation mode ===`);
    return processComicJobGeminiFullPage(jobId, params);
  }
  
  console.log(`=== Using MULTI-MODEL generation mode ===`);
  
  const job = await getJobFromDb(jobId);
  if (!job) return;

  const { storyPrompt, style, characters, pagesCount, title, language } = params;
  
  // Store character names for auto-save
  const characterNames = (characters || []).map(c => c.name).filter(Boolean);
  job.characterNames = characterNames;

  try {
    job.status = "processing";
    job.progress = 10;
    await ensureLibraryComicDraftForJob(job, {
      title: job.title || title,
      style: job.style || style,
      characterNames,
    });
    await saveJobToDb(job);

    // Extract character reference images WITH their names (for proper mapping)
    // Accept both HTTP URLs and base64 data URIs from the client
    const allCharacters = characters || [];
    const charactersWithImages = allCharacters
      .filter((c) => c.imageUri && (c.imageUri.startsWith('http') || c.imageUri.startsWith('data:')))
      .map((c) => ({ name: c.name, imageUri: c.imageUri as string, description: c.description || '' }));
    
    const characterReferenceImages = charactersWithImages.map(c => c.imageUri);
    
    if (characterReferenceImages.length > 0) {
      console.log(`Found ${characterReferenceImages.length} character reference image(s) for visual consistency`);
      console.log(`Characters with images: ${charactersWithImages.map(c => c.name).join(', ')}`);
    }
    
    // Diagnostic: warn if characters were sent but images were filtered out
    const charsWithAnyImage = allCharacters.filter((c) => c.imageUri);
    if (charsWithAnyImage.length > 0 && charactersWithImages.length === 0) {
      console.warn(`⚠️ WARNING: ${charsWithAnyImage.length} character(s) had imageUri but ALL were filtered out!`);
      charsWithAnyImage.forEach((c) => {
        const prefix = c.imageUri ? c.imageUri.substring(0, 50) : 'null';
        console.warn(`  - "${c.name}": imageUri starts with "${prefix}..." (length: ${c.imageUri?.length || 0})`);
      });
    } else if (allCharacters.length > 0 && charsWithAnyImage.length === 0) {
      console.warn(`⚠️ WARNING: ${allCharacters.length} character(s) sent but NONE had imageUri property`);
      allCharacters.forEach((c) => {
        console.warn(`  - "${c.name}": imageUri = ${c.imageUri === undefined ? 'undefined' : c.imageUri === null ? 'null' : `"${String(c.imageUri).substring(0, 30)}"`}`);
      });
    }

    // === PHASE 0: Detect outfits from uploaded character photos ===
    const characterOutfits: Map<string, string> = new Map();
    
    if (charactersWithImages.length > 0) {
      console.log(`=== PHASE 0: Detecting outfits from uploaded character photos ===`);
      
      // Detect outfits in parallel for efficiency
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
    }

    // Build detailed character descriptions for AI - include appearance if provided
    const characterDescriptions = (characters || [])
      .map((c) => {
        if (c.description) {
          return `${c.name}: ${c.description}`;
        }
        return `${c.name} (${c.type})`;
      })
      .join("; ");

    const languageInstruction = language
      ? `IMPORTANT: Write ALL dialogue, narration, and text in ${language}.`
      : "";
    const titleInstruction = title
      ? `The comic title MUST be "${title}".`
      : "";

    // Build character name list for strict enforcement
    const mainCharacterNames = (characters || []).map(c => c.name).filter(Boolean);
    const characterNamesList = mainCharacterNames.length > 0 
      ? mainCharacterNames.join(', ') 
      : 'the main characters';

    // === 5-ACT NARRATIVE ARC: Assign story roles to each page ===
    const buildNarrativeArc = (totalPages: number): Array<{ page: number; role: string; type: string; guidance: string; cameraGuidance: string }> => {
      const arc: Array<{ page: number; role: string; type: string; guidance: string; cameraGuidance: string }> = [];
      
      arc.push({
        page: 1,
        role: "Cover",
        type: "cover",
        guidance: "Title + dramatic character poses. Show the main characters in heroic/dramatic poses with visual hints about the story theme. This is the reader's first impression.",
        cameraGuidance: "Wide dramatic shot, movie poster composition"
      });

      if (totalPages <= 3) {
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
      } else if (totalPages === 4) {
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
        // 5+ pages: full 5-act structure with extra pages distributed to middle acts
        arc.push({
          page: 2,
          role: "Introduction",
          type: "body",
          guidance: "Set the scene. Introduce all main characters and establish the world. Show normal life BEFORE the adventure begins. Establish relationships between characters. The reader should understand who these characters are and what their world is like.",
          cameraGuidance: "Wide establishing shots to set the scene, medium shots for character introductions, warm lighting"
        });

        const bodyPages = totalPages - 3; // subtract cover, intro, conclusion
        const risingActionPages = Math.ceil(bodyPages / 2);
        const climaxPages = bodyPages - risingActionPages;

        for (let r = 0; r < risingActionPages; r++) {
          const pageNum = 3 + r;
          const isFirst = r === 0;
          const isLast = r === risingActionPages - 1;
          arc.push({
            page: pageNum,
            role: `Rising Action${risingActionPages > 1 ? ` (Part ${r + 1})` : ''}`,
            type: "body",
            guidance: isFirst 
              ? "The problem or threat APPEARS. Something disrupts the characters' normal life. Tension begins to build, characters react with surprise or concern, and the stakes are revealed for the first time."
              : isLast
              ? "Tension reaches its peak BEFORE the climax. Characters prepare, gather allies, or make a crucial discovery. The situation feels increasingly dangerous or urgent. Build maximum anticipation."
              : "The conflict ESCALATES. New obstacles appear, characters face setbacks or make discoveries. Each panel should raise the stakes higher than the last. The threat grows more serious.",
            cameraGuidance: isFirst
              ? "Medium shots transitioning to dramatic angles as tension builds, close-ups on character reactions of surprise/worry"
              : "Increasingly dynamic angles, tilted frames for unease, close-ups showing determination or fear"
          });
        }

        for (let c = 0; c < climaxPages; c++) {
          const pageNum = 3 + risingActionPages + c;
          const isFirst = c === 0;
          arc.push({
            page: pageNum,
            role: `Climax / Confrontation${climaxPages > 1 ? ` (Part ${c + 1})` : ''}`,
            type: "body",
            guidance: isFirst
              ? "The BIG MOMENT begins. The fight scene, face-off, or critical challenge starts. Maximum action and drama. Characters confront the main obstacle head-on. This should be the most visually intense and exciting page."
              : "The climax CONTINUES. The battle/challenge reaches its peak. Show the turning point where the hero gains the upper hand or makes a breakthrough. Maximum visual impact and emotional intensity.",
            cameraGuidance: "Dynamic action shots, dramatic low angles, intense close-ups, speed lines, impact frames, bird's-eye views of the action"
          });
        }

        arc.push({
          page: totalPages,
          role: "Resolution / Conclusion",
          type: "conclusion",
          guidance: "The aftermath. Victory achieved, problem solved, or lesson learned. Characters celebrate, reflect, or return to their normal lives changed by the experience. Show the emotional payoff - relief, joy, gratitude. End on a satisfying note that wraps up all story threads.",
          cameraGuidance: "Medium shots for emotional moments, character reactions of relief/joy, wide shot for the final panel showing characters together in their resolved world"
        });
      }

      return arc;
    };

    const narrativeArc = buildNarrativeArc(pagesCount);
    const narrativeInstructions = narrativeArc.map(act => 
      `PAGE ${act.page} - ${act.role} (type: "${act.type}"):\n  Story purpose: ${act.guidance}\n  Camera/Visual style: ${act.cameraGuidance}`
    ).join('\n\n');

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
3. Each character's name is PERMANENT - ${mainCharacterNames.length > 0 ? mainCharacterNames.map(n => `"${n}" is always "${n}"`).join(', ') : 'keep names consistent'}
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

=== STORY FLOW RULES (CRITICAL — READ CAREFULLY) ===
1. PAGE-TO-PAGE CONTINUITY: Each page MUST pick up exactly where the previous page left off. No unexplained time jumps or scene changes between pages. If page 2 ends with a character opening a door, page 3 must start with what they see on the other side.
2. DIALOGUE PROGRESSION: Dialogue must flow like a real conversation across the comic. Characters react to what was JUST said. No repeating the same idea across pages. Each line moves the conversation and story forward.
3. CAUSE AND EFFECT: Every event should be caused by something that happened before. If a character is angry on page 4, something on page 3 made them angry. The reader should always understand WHY things are happening.
4. EMOTIONAL ARC: The emotional tone must shift naturally: calm/happy → curious/concerned → tense/worried → intense/dramatic → relieved/satisfied. Never jump from calm to intense without buildup.
5. PANEL-TO-PANEL FLOW: Within each page, panels should flow like a movie scene — like sequential frames of a film. Panel 1 leads to Panel 2 leads to Panel 3. Each panel shows the NEXT moment in time, not a random unrelated moment.
6. PAGE-TURN HOOKS: Every body page should end on a moment that makes the reader want to turn the page — a cliffhanger, a revelation, a dramatic reaction, or an unresolved moment.
7. NO FILLER: Every panel must advance the story. No panels that just show characters standing around with generic dialogue.
8. SINGLE COHERENT STORYLINE: The entire comic must tell ONE continuous story from start to finish. Do NOT introduce disconnected subplots or random scene changes.
9. CHARACTER ACTIONS MATTER: Show characters DOING things that move the plot — running, fighting, discovering, building, helping — not just talking. Mix action panels with dialogue panels.
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

    job.progress = 20;
    await saveJobToDb(job);

    const storySystemPrompt = `You are a professional comic book story writer who creates compelling, well-paced narratives with natural dialogue flow. Your stories read like real published comics — each page connects smoothly to the next, dialogue feels natural and advances the plot, and the emotional arc builds from beginning to end.
CRITICAL: You must FOLLOW the user's story EXACTLY. Do not make up a different story.
If the user says "A knight saves a princess", you create panels about a knight saving a princess.
Always respond with valid JSON.

=== GOLD STANDARD EXAMPLE — Study this story's flow pattern ===
Here is a perfect 5-page comic story ("Immune") that demonstrates ideal narrative flow. Use this as your quality benchmark:

PAGE 1 (Cover): Hero stands defiantly, ally behind him, setting established visually.
PAGE 2 (World-building + Character): Establishes the world (everyone has powers), shows the hero's problem (he has none), introduces the mysterious ally watching from shadows, ends on the hero's frustration.
  - Panel flow: Wide city → hero alone at school → ally watching → close-up of hero's emotion
  - Dialogue builds: "Everyone is special except me" → "I'm suffocating" → "He's the key" → "I wish I could do something"
  - Each panel shows a DIFFERENT scene but they ALL serve ONE purpose: establishing who the hero is and why he matters

PAGE 3 (Inciting incident + Ally revealed): Villain appears stealing powers (NEWS on screen), villain shown in action (defeating a hero), ally arrives urgently to the hero, hero learns HE is the solution.
  - Panel flow: News report → villain in action → ally lands before hero → hero's shocked reaction
  - Dialogue escalates: "What's going on?" → "Power is mine!" → "You're the only one immune!" → "Me? But I'm..."
  - CAUSE-EFFECT: Villain steals powers (cause) → ally needs hero's help (effect) → hero is shocked (reaction)

PAGE 4 (Action + Confrontation): Ally transfers powers to hero, hero punches villain, hero charges again, villain fires back.
  - Panel flow: Power transfer → first punch → hero flying in → villain's counterattack
  - Dialogue is SHORT and ACTION-DRIVEN: "Take my strength!" → "Argh!" → "This ends now!" → "You cannot defeat me!"
  - Every panel is a CONSECUTIVE MOMENT in the fight — like frames of an action movie

PAGE 5 (Resolution + Emotional payoff): Villain defeated, heroes celebrating, ally acknowledges hero, hero finds new confidence.
  - Panel flow: Villain down → heroes celebrating → ally smiles → hero looks at city with confidence
  - Dialogue wraps up emotionally: "Impossible!" → "We did it" → "No, YOU did it" → "Maybe I'm not so ordinary after all"
  - SATISFYING ENDING: The hero's arc is complete — from feeling powerless to realizing his uniqueness IS his power

KEY PATTERNS TO REPLICATE:
- Each page has ONE clear purpose (world-build, incite, fight, resolve)
- Panels within a page flow like movie scenes — sequential moments, not random snapshots
- Dialogue gets progressively more intense: casual → concerned → urgent → action → reflective
- Every page ends on a moment that pulls you to the next page
- The LAST line of the comic echoes the hero's journey
=== END OF EXAMPLE ===`;
    
    const storyContent = await generateTextWithProvider(storySystemPrompt, storyPromptText, { type: "json_object" });
    if (!storyContent) {
      throw new Error("No story content generated");
    }

    const story = JSON.parse(storyContent);
    job.title = story.title || title;
    
    // === PHASE 0.5: Adapt detected outfits to story context ===
    const adaptedOutfits: Map<string, string> = new Map();
    
    if (characterOutfits.size > 0) {
      console.log(`=== PHASE 0.5: Adapting outfits to story context ===`);
      
      // Adapt outfits in parallel
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
    }
    
    // VALIDATION: Ensure minimum panels per page
    // If AI returned too few panels, expand them by duplicating/splitting scenes
    const storyPagesCount = story.pages?.length || pagesCount;
    for (let i = 0; i < storyPagesCount; i++) {
      const page = story.pages?.[i];
      if (!page) continue;
      
      const pageType = page.pageType || (i === 0 ? 'cover' : (i === storyPagesCount - 1 ? 'conclusion' : 'body'));
      const panels = page.panels || [];
      
      // Define minimum panels per page type
      const minPanels = pageType === 'cover' ? 1 : 3; // Body and conclusion need at least 3
      
      if (panels.length < minPanels && pageType !== 'cover') {
        console.log(`Page ${i + 1} (${pageType}) has only ${panels.length} panels, expanding to ${minPanels}...`);
        
        // Expand panels by creating variations of existing ones
        const originalPanel = panels[0] || {
          sceneDescription: 'A scene from the story',
          characterName: mainCharacterNames[0] || 'the character',
          dialogue: '',
          cameraAngle: 'wide shot'
        };
        
        const cameraAngles = ['wide shot', 'close-up', 'medium shot', 'low angle', 'high angle', 'action shot'];
        
        while (panels.length < minPanels) {
          const panelNum = panels.length + 1;
          const newPanel = {
            panelNumber: panelNum,
            sceneDescription: `${originalPanel.sceneDescription} - ${cameraAngles[panelNum % cameraAngles.length]} perspective`,
            characterName: mainCharacterNames[panelNum % mainCharacterNames.length] || originalPanel.characterName,
            isVillain: false,
            isSupportingCharacter: false,
            dialogue: panelNum === 1 ? originalPanel.dialogue : '',
            cameraAngle: cameraAngles[panelNum % cameraAngles.length]
          };
          panels.push(newPanel);
        }
        
        page.panels = panels;
        console.log(`Page ${i + 1} now has ${panels.length} panels`);
      }
    }
    
    // === POST-PROCESSING: Ensure every panel has characterName assigned ===
    // The AI story generator often omits characterName, causing only the first character's
    // reference photo to be used. This step fills in missing characterNames.
    if (mainCharacterNames.length > 0) {
      const totalPages = story.pages?.length || 0;
      let panelsFixed = 0;
      
      for (let i = 0; i < totalPages; i++) {
        const page = story.pages?.[i];
        if (!page || !page.panels) continue;
        
        const pageType = page.pageType || (i === 0 ? 'cover' : (i === totalPages - 1 ? 'conclusion' : 'body'));
        
        for (let p = 0; p < page.panels.length; p++) {
          const panel = page.panels[p];
          
          // Skip if already has a valid characterName that matches one of our characters
          if (panel.characterName) {
            const hasMatch = mainCharacterNames.some(name => 
              panel.characterName.toLowerCase().includes(name.toLowerCase())
            );
            if (hasMatch) continue;
          }
          
          // Skip villain panels
          if (panel.isVillain) continue;
          
          // Skip supporting character panels
          if (panel.isSupportingCharacter) continue;
          
          // Try to infer character from scene description
          const desc = (panel.sceneDescription || '').toLowerCase();
          const matchedNames = mainCharacterNames.filter(name => 
            desc.includes(name.toLowerCase())
          );
          
          if (matchedNames.length > 0) {
            // Scene mentions specific character(s)
            panel.characterName = matchedNames.join(' and ');
            panelsFixed++;
          } else if (pageType === 'cover') {
            // Cover should feature all main characters
            panel.characterName = mainCharacterNames.join(' and ');
            panelsFixed++;
          } else {
            // Round-robin assignment to ensure all characters get used
            const charIndex = p % mainCharacterNames.length;
            panel.characterName = mainCharacterNames[charIndex];
            panelsFixed++;
          }
        }
      }
      
      if (panelsFixed > 0) {
        console.log(`=== POST-PROCESSING: Assigned characterName to ${panelsFixed} panel(s) across ${totalPages} pages ===`);
      }
    }
    
    job.progress = 30;
    await saveJobToDb(job);

    // OPTIMIZATION: Generate comic-style versions of characters ONCE using FLUX Kontext
    // Then reuse these generated images for all pages with FLUX Schnell
    // Use a Map to prevent index misalignment when a character's conversion fails
    const comicStyleCharacterMap: Map<string, string> = new Map();
    
    if (characterReferenceImages.length > 0 && 
        aiSettings.replicate.models.fluxKontextDev.enabled) {
      const useConsistentCharacter = aiSettings.replicate.models.consistentCharacter.enabled;
      
      if (useConsistentCharacter) {
        console.log(`=== PHASE 1: Generating comic-style character versions using Consistent Character model ===`);
      } else {
        console.log(`=== PHASE 1: Generating comic-style character versions using FLUX Kontext ===`);
      }
      
      for (let charIdx = 0; charIdx < charactersWithImages.length; charIdx++) {
        const charData = charactersWithImages[charIdx];
        const refImage = charData.imageUri;
        const charName = charData.name || `Character ${charIdx + 1}`;
        const charDescription = charData.description || "";
        
        try {
          if (useConsistentCharacter) {
            console.log(`Generating comic-style version of "${charName}" using Consistent Character...`);
            
            // Create a detailed prompt - PRESERVE PHOTO LIKENESS
            const characterPrompt = `CRITICAL: Keep this person's face EXACTLY as it appears in the photo.

Preserve with 100% accuracy:
- Their exact face shape, jawline, chin
- Their exact nose, eyes, eyebrows, lips
- Their exact skin tone, hairstyle, hair color

Add subtle ${style} artistic styling only:
${style === 'Comic' ? 'Subtle comic shading, slightly enhanced colors. Keep face photo-realistic.' : ''}
${style === 'Manga' ? 'Soft manga shading. Keep face photo-realistic, NO large anime eyes.' : ''}
${style === 'Manhwa' ? 'Soft manhwa gradients. Keep face photo-realistic.' : ''}
${charDescription ? `Character: ${charName} - ${charDescription}. ` : `Character: ${charName}. `}
Portrait, one person, centered, clean background. Face must be RECOGNIZABLE as the same person.`;
            
            const comicCharacterUrl = await generateImageWithConsistentCharacter(characterPrompt, refImage);
            
            if (comicCharacterUrl) {
              comicStyleCharacterMap.set(charName, comicCharacterUrl);
              console.log(`Successfully created comic-style version of "${charName}" with Consistent Character`);
            }
          } else {
            console.log(`Generating comic-style version of "${charName}" using FLUX Kontext...`);
            
            // Create a single definitive character reference - PRESERVE PHOTO LIKENESS
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
${style === 'Comic' ? 'Add subtle comic book shading and slightly enhanced colors. Keep face photo-realistic.' : ''}
${style === 'Manga' ? 'Add soft manga-style shading. Keep face photo-realistic, do NOT add large anime eyes.' : ''}
${style === 'Manhwa' ? 'Add soft manhwa gradients. Keep face photo-realistic with elegant lighting.' : ''}
${style === 'Graphic' ? 'Add cinematic dramatic shading with muted colors. Keep face 100% photo-realistic - do NOT alter any facial features.' : ''}
${style === 'Kawaii' ? 'Add soft pastel colors and cute aesthetic to background and clothing only. Keep face 100% photo-realistic with EXACT same proportions - do NOT make eyes bigger, do NOT change head size, do NOT alter any facial features.' : ''}
${style === 'Noir' ? 'Convert to black and white with high contrast shadows. Keep face 100% photo-realistic - do NOT alter any facial features, only change lighting.' : ''}
${style === 'Anime' ? 'Add vibrant colors and clean line art styling to background and clothing. Keep face 100% photo-realistic - do NOT make eyes bigger, do NOT alter any facial features.' : ''}
${style === 'Afro' ? 'Add Afrofuturism styling with vibrant African-inspired colors to background and clothing. Keep face 100% photo-realistic - do NOT alter any facial features.' : ''}

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
        } catch (charError: any) {
          console.error(`Failed to generate comic version of "${charName}":`, charError.message);
          // Continue without this character's comic version
        }
        
        // Update progress for character conversion phase (30-40%)
        const charProgress = 30 + ((charIdx + 1) / characterReferenceImages.length) * 10;
        job.progress = Math.round(charProgress);
        await saveJobToDb(job);
      }
      
      console.log(`=== PHASE 1 COMPLETE: Created ${comicStyleCharacterMap.size} comic-style character(s) ===`);
    }

    // Style prompts for different comic styles (defined early for use in anchor generation)
    const stylePrompts: Record<string, string> = {
      Comic:
        "American comic book style, bold vibrant colors, dynamic action poses, halftone dots, thick black outlines, superhero aesthetic, professional comic art",
      Manga:
        "Japanese manga style, black and white with screen tones, expressive anime eyes, dramatic shading, clean linework, professional manga illustration",
      Manhwa:
        "Korean manhwa style, soft pastel colors, detailed character designs, modern webtoon aesthetic, romantic atmosphere, professional digital art",
      Graphic:
        "Mature graphic novel style, cinematic composition, realistic proportions, detailed dramatic shading, muted color palette, dark atmospheric lighting, gritty textures, professional illustration like Watchmen or Sin City",
      Kawaii:
        "Kawaii chibi style, oversized heads with tiny bodies, huge sparkly eyes, exaggerated cute expressions, soft pastel colors, rounded bubbly shapes, adorable proportions, Japanese cute aesthetic",
      Noir:
        "Film noir style, strictly black and white only, high contrast dramatic shadows, silhouetted figures, moody atmospheric lighting, vintage detective aesthetic, film grain texture, 1940s crime drama feel",
      Anime:
        "Japanese anime style, full vibrant colors, large expressive eyes, dynamic poses, clean cel-shaded coloring, crisp line art, professional animation quality like Studio Ghibli or modern anime",
      Afro:
        "Afrofuturism art style, bold geometric African patterns, vibrant rich colors inspired by African heritage, futuristic sci-fi elements, tribal motifs fused with technology, cultural symbolism, dynamic composition",
    };

    // === ANCHOR SYSTEM: Map character names to their anchor images ===
    // This ensures EVERY character (user-uploaded OR AI-generated) uses the same reference across all panels
    const characterAnchors: Map<string, string> = new Map();
    
    // Add user-uploaded characters to anchor map
    // Use the name-keyed Map so we always get the correct image for each character
    for (let i = 0; i < charactersWithImages.length; i++) {
      const charName = charactersWithImages[i].name;
      const comicStyleImage = comicStyleCharacterMap.get(charName);
      if (comicStyleImage) {
        characterAnchors.set(charName, comicStyleImage);
        console.log(`Anchor set for "${charName}" (comic-style) → matched by name`);
      } else if (charactersWithImages[i].imageUri) {
        // Fallback to original uploaded photo if comic-style conversion failed
        characterAnchors.set(charName, charactersWithImages[i].imageUri);
        console.log(`Anchor set for "${charName}" (original photo fallback) → comic-style conversion was unavailable`);
      }
    }
    
    // Pre-generate villain anchor if story has a villain
    const villainDescription = story.villainDescription;
    if (villainDescription && villainDescription.length > 10) {
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
          console.log(`Villain anchor image generated successfully`);
        }
      } catch (villainError: any) {
        console.error(`Failed to generate villain anchor: ${villainError.message}`);
      }
    }
    
    console.log(`=== ANCHOR MAP: ${characterAnchors.size} character(s) with anchors ===`);

    const totalPages = Math.min(story.pages?.length || pagesCount, pagesCount);
    const pageProgressStart = characterReferenceImages.length > 0 ? 40 : 30;

    // Sanitize scene description for image generation to avoid safety filter triggers
    const sanitizeForImage = (text: string | undefined): string => {
      if (!text) return 'A peaceful scene with characters in a beautiful setting';
      const safeText = text
        .replace(/\b(fight|fights|fighting|battle|battles|attack|attacks|kill|kills|killed|death|die|dies|sword|weapon|gun|knife|blood|violent|violence|save|saves|rescue|rescues|saving|rescuing|capture|captures|kidnap|kidnaps|kidnapped|evil|villain|enemy|defeat|defeats|destroy|destroys)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return safeText || 'A peaceful scene with characters in a beautiful setting';
    };

    // Helper function to generate a single panel image with character/villain consistency
    interface PanelMeta {
      characterName?: string;
      isVillain?: boolean;
      isSupportingCharacter?: boolean;
      villainDescription?: string;
    }
    
    const generatePanelImage = async (panelDesc: string, panelIndex: number, panelMeta?: PanelMeta): Promise<string> => {
      const safeDesc = sanitizeForImage(panelDesc);
      const { characterName, isVillain, isSupportingCharacter, villainDescription } = panelMeta || {};
      
      // === ANCHOR-BASED PANEL GENERATION WITH RETRY ===
      const hasKontextEnabled = aiSettings.replicate.models.fluxKontextDev.enabled;
      const hasSiliconFlowEnabled = aiSettings.siliconflow.enabled && aiSettings.siliconflow.apiKey;
      const hasAnyRefCapability = hasKontextEnabled || hasSiliconFlowEnabled;
      
      // Parse character names in panel (handles "Jo, Sa" or "Jos and Sab")
      let namesInPanel: string[] = [];
      if (characterName) {
        if (characterName.toLowerCase().includes(' and ')) {
          namesInPanel = characterName.split(/\s+and\s+/i).map(n => n.trim()).filter(n => n);
        } else {
          namesInPanel = characterName.split(',').map(n => n.trim()).filter(n => n);
        }
      }
      
      // Collect anchor references for all characters in this panel
      const anchorRefs: string[] = [];
      const anchorNames: string[] = [];
      
      // Check for villain first (uses __VILLAIN__ anchor)
      if (isVillain && characterAnchors.has("__VILLAIN__")) {
        anchorRefs.push(characterAnchors.get("__VILLAIN__")!);
        anchorNames.push("The Villain");
        console.log(`Panel ${panelIndex}: Using VILLAIN anchor`);
      }
      
      // Add main character anchors
      for (const name of namesInPanel) {
        if (characterAnchors.has(name)) {
          anchorRefs.push(characterAnchors.get(name)!);
          anchorNames.push(name);
          console.log(`Panel ${panelIndex}: Using anchor for "${name}"`);
        }
      }
      
      // If no specific character matched but we have anchors, rotate through them
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
      
      // Build the prompt based on scene type
      const charName = anchorNames[0] || characterName || "the character";
      const isVillainPanel = isVillain || charName === "The Villain";
      
      // Get adapted outfit descriptions for characters in this panel
      const char1Outfit = anchorNames[0] ? adaptedOutfits.get(anchorNames[0]) : undefined;
      const char2Outfit = anchorNames[1] ? adaptedOutfits.get(anchorNames[1]) : undefined;
      const primaryOutfit = char1Outfit || (charName !== "the character" ? adaptedOutfits.get(charName) : undefined);
      
      let panelPrompt: string;
      
      if (anchorRefs.length >= 2) {
        // Multi-character scene
        const char1Name = anchorNames[0] || 'Character 1';
        const char2Name = anchorNames[1] || 'Character 2';
        const outfitInstructions = [
          char1Outfit ? `"${char1Name}" is ${char1Outfit}` : null,
          char2Outfit ? `"${char2Name}" is ${char2Outfit}` : null
        ].filter(Boolean).join('. ');
        
        panelPrompt = `Wide shot, full body visible, camera pulled back to show complete figures head to toe with ample space above heads. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.

CAMERA: Wide-angle medium-long shot. Characters occupy only 60-70% of the frame height, leaving 15-20% empty space above their heads and 10-15% below their feet. Pull the virtual camera FAR BACK so full bodies are visible.

FACIAL ACCURACY - TWO DISTINCT CHARACTERS:
1. "${char1Name}" - EXACT LIKENESS of reference image 1. Same facial structure, eye shape, eye color, nose, lips, jawline, skin tone, hairstyle, hair color.
2. "${char2Name}" - EXACT LIKENESS of reference image 2. Same facial structure, eye shape, eye color, nose, lips, jawline, skin tone, hairstyle, hair color.

${outfitInstructions ? `OUTFIT CONSISTENCY: ${outfitInstructions}.` : ''}

RULES:
- FACE FIDELITY is more important than artistic style
- Show exactly 2 distinct people - NO duplicates, NO clones
- Both faces clearly visible, well-lit

Professional comic panel, detailed background, dynamic composition.
NO text, NO speech bubbles, NO words.`;
      } else if (isSupportingCharacter) {
        // Supporting character (no anchor)
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
        // Single character scene
        const outfitInstruction = primaryOutfit ? `OUTFIT: The character is ${primaryOutfit}. Maintain this outfit consistently.` : '';
        
        panelPrompt = `Wide shot, full body visible, camera pulled back to show complete figure head to toe with ample space above head. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
CAMERA: Wide-angle medium-long shot. Character occupies only 60-70% of frame height with 15-20% empty space above head and 10-15% below feet. Pull the virtual camera FAR BACK so the full body is visible.
${isVillainPanel ? 'This is the VILLAIN of the story.' : `This panel features "${charName}".`}
${outfitInstruction}
STRICT RULES:
1. Show EXACTLY ONE PERSON who looks like the reference image
2. The character MUST have the EXACT same face, hair, and features as the reference
3. Do NOT show the same person twice - no clones, no reflections, no duplicates
4. ONE instance of the character only
${isVillainPanel ? 'Menacing villain presence, dramatic lighting.' : ''}
Professional comic panel, detailed background, dynamic pose.
NO text, NO speech bubbles, NO words, NO title text.`;
      }
      
      // === RETRY LOGIC WITH ANCHOR PRESERVATION ===
      const maxRetries = 3;
      const refsToUse = anchorRefs.length >= 2 ? anchorRefs.slice(0, 2) : (anchorRefs.length === 1 ? [anchorRefs[0]] : undefined);
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt === 1) {
            // First attempt: Use configured provider with anchors
            if (refsToUse && hasAnyRefCapability) {
              return await generateImage(panelPrompt, refsToUse);
            } else if (!isSupportingCharacter && !refsToUse) {
              // No anchors available, use prompt-only generation
              const noAnchorPrompt = `Wide shot, full body visible, camera pulled back. ${stylePrompts[style] || stylePrompts.Comic}. 
Scene: ${safeDesc}. 
CAMERA: Wide-angle medium-long shot showing complete figures with ample empty space above heads.
${characterName ? `This panel features "${characterName}".` : ''}
${characterDescriptions ? `Main characters: ${characterDescriptions}.` : ""} 
${isVillain && villainDescription ? `Villain appearance: ${villainDescription}.` : ''}
Beautiful illustration, detailed background, family-friendly, NO text, NO speech bubbles, NO words.`;
              return await generateImage(noAnchorPrompt);
            } else {
              return await generateImage(panelPrompt);
            }
          } else if (attempt === 2) {
            // Retry #1: Same provider, same anchor, wait a bit
            console.log(`Panel ${panelIndex}: Retry attempt ${attempt} with same anchor...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            if (refsToUse && hasAnyRefCapability) {
              return await generateImage(panelPrompt, refsToUse);
            } else {
              return await generateImage(panelPrompt);
            }
          } else if (attempt === 3) {
            // Retry #2: Try alternate provider if available
            console.log(`Panel ${panelIndex}: Retry attempt ${attempt} - trying alternate provider...`);
            
            // Try SiliconFlow if we were using Replicate, or vice versa
            if (refsToUse && refsToUse.length > 0) {
              if (hasSiliconFlowEnabled) {
                console.log(`Panel ${panelIndex}: Trying SiliconFlow as alternate provider`);
                return await generateImageWithSiliconFlow(panelPrompt, refsToUse);
              } else if (hasKontextEnabled) {
                console.log(`Panel ${panelIndex}: Trying Replicate Kontext as alternate provider`);
                return await generateImageWithKontext(panelPrompt, refsToUse[0]);
              }
            }
            
            // Final fallback: Generate without anchor but WITH original scene description
            console.log(`Panel ${panelIndex}: Final fallback - generating without anchor but with scene description`);
            const finalFallbackPrompt = `Wide shot, full body visible, camera pulled back. ${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
CAMERA: Wide-angle medium-long shot showing complete figures with ample empty space above heads.
${characterName ? `This panel features "${characterName}".` : ''}
${isVillainPanel && villainDescription ? `Villain appearance: ${villainDescription}.` : ''}
${characterDescriptions ? `Character details: ${characterDescriptions}.` : ''}
Professional comic panel, detailed background, dynamic pose.
NO text, NO speech bubbles, NO words, NO title text.`;
            return await generateImage(finalFallbackPrompt);
          }
        } catch (error: any) {
          console.error(`Panel ${panelIndex} attempt ${attempt} failed: ${error.message}`);
          if (attempt === maxRetries) {
            // All retries exhausted - use final fallback with original scene
            console.log(`Panel ${panelIndex}: All retries exhausted, using scene-based fallback`);
            const emergencyPrompt = `${stylePrompts[style] || stylePrompts.Comic}.
Scene: ${safeDesc}.
${characterName ? `Featuring ${characterName}.` : ''}
Professional comic illustration, detailed background.
NO text, NO speech bubbles, NO words.`;
            return await generateImage(emergencyPrompt);
          }
          // Continue to next retry attempt
        }
      }
      
      // Should never reach here, but just in case
      return await generateImage(`${stylePrompts[style] || stylePrompts.Comic}. ${safeDesc}. Professional comic panel.`);
    };

    // Helper function to generate cover image featuring ALL main characters
    // Uses the same provider as body panels (generateImage) with ALL character reference photos
    const generateCoverImage = async (coverDesc: string): Promise<string> => {
      const safeDesc = sanitizeForImage(coverDesc);
      
      try {
        const allCharNames = mainCharacterNames.length > 0 
          ? mainCharacterNames.join(' and ') 
          : 'the main characters';
        
        const hasKontextEnabled = aiSettings.replicate.models.fluxKontextDev.enabled;
        const hasSiliconFlowEnabled = aiSettings.siliconflow.enabled && aiSettings.siliconflow.apiKey;
        const hasAnyRefCapability = hasKontextEnabled || hasSiliconFlowEnabled;
        
        // Build cover reference images with correct name-to-image alignment
        const coverCharsWithImages: Array<{ name: string; imageUrl: string }> = [];
        for (const charData of charactersWithImages) {
          const comicStyleImage = comicStyleCharacterMap.get(charData.name);
          const imageUrl = comicStyleImage || charData.imageUri;
          if (imageUrl) {
            coverCharsWithImages.push({ name: charData.name, imageUrl });
          }
        }
        const coverReferenceImages = coverCharsWithImages.map(c => c.imageUrl);
        
        if (coverReferenceImages.length > 0 && hasAnyRefCapability) {
          // Build per-character facial accuracy instructions
          let charsDescription = '';
          if (coverCharsWithImages.length >= 2) {
            charsDescription = `FACIAL ACCURACY IS THE #1 PRIORITY. This cover features ${coverCharsWithImages.length} main characters:`;
            coverCharsWithImages.forEach((char, idx) => {
              charsDescription += `\n- "${char.name}" must be an EXACT LIKENESS of reference image ${idx + 1}. Replicate their PRECISE facial structure: eye shape, eye color, nose shape, lip shape, jawline, skin tone, hairstyle, hair color, eyebrow shape, and all distinguishing facial features.`;
            });
          } else {
            const name = coverCharsWithImages[0]?.name || 'the hero';
            charsDescription = `FACIAL ACCURACY IS THE #1 PRIORITY. Show "${name}" as the main focus. Replicate their PRECISE facial structure from the reference image.`;
          }
          
          // Get outfit descriptions
          const coverOutfitDescriptions = coverCharsWithImages
            .map(char => {
              const outfit = adaptedOutfits.get(char.name);
              return outfit ? `"${char.name}" is wearing: ${outfit}` : null;
            })
            .filter(Boolean)
            .join('. ');
          
          const coverPrompt = `EXTREME WIDE SHOT, MOVIE POSTER COMPOSITION. Camera pulled far back. Full body visible from head to toe with large empty space above and around characters. ${stylePrompts[style] || stylePrompts.Comic}.
COMIC BOOK COVER ART: ${safeDesc}.

COMPOSITION RULES (CRITICAL):
- Characters occupy ONLY the LOWER 50-60% of the frame
- The UPPER 30-40% of the image MUST be open sky, background scenery, or atmospheric effects with NO characters — this space is reserved for the title
- Frame characters from a DISTANCE — show full bodies, feet touching ground, with at least 20% empty space on each side
- NEVER use close-up, medium close-up, or chest-up framing — always full-body or wider
- Think MOVIE POSTER layout: title area on top, characters posed below

${charsDescription}

${coverOutfitDescriptions ? `OUTFIT CONSISTENCY: ${coverOutfitDescriptions}.` : ''}

TITLE (MUST INCLUDE):
- Write the title "${job.title}" in LARGE BOLD STYLIZED COMIC BOOK LETTERING in the UPPER portion of the image
- Use a compact font size so the title fits within the top area with generous margin from all edges
- Comic book title typography: bold, dynamic, with outline or shadow for contrast against the background

RULES:
- Characters in heroic dramatic poses in the LOWER portion of the image
${coverCharsWithImages.length >= 2 ? `- ${coverCharsWithImages.length} DISTINCT individuals with DIFFERENT faces matching their reference images` : ''}
- Each character appears EXACTLY ONCE - no duplicates
- Faces clearly visible, well-lit
- Rich atmospheric background filling the upper portion behind the title
- NO speech bubbles`;
          
          console.log(`Generating cover with ${coverReferenceImages.length} reference image(s): ${coverCharsWithImages.map(c => c.name).join(', ')}`);
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
          return await generateImage(fallbackPrompt, undefined, "9:16");
        }
      } catch (error: any) {
        console.error(`Cover generation failed: ${error.message}`);
        const safePrompt = `${stylePrompts[style] || stylePrompts.Comic}. Comic book cover with dramatic scenery and bold title. Professional illustration.`;
        return await generateImage(safePrompt, undefined, "9:16");
      }
    };

    // Extract villain description from story for consistency across panels
    const storyVillainDescription = story.villainDescription || '';
    if (storyVillainDescription) {
      console.log(`Villain description captured: ${storyVillainDescription.substring(0, 100)}...`);
    }
    
    // Count total panels for progress tracking
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
      
      const pageType = page.pageType || (i === 0 ? 'cover' : (i === totalPages - 1 ? 'conclusion' : 'body'));
      const panels = page.panels || [{ sceneDescription: page.sceneDescription, dialogue: page.dialogue }];
      
      console.log(`=== Generating Page ${i + 1} (${pageType}) with ${panels.length} panel(s) ===`);
      
      const panelImages: string[] = [];
      const panelData: Array<{ description: string; dialogue: string; cameraAngle?: string }> = [];
      
      // Prepare all panel generation tasks
      interface PanelTask {
        index: number;
        desc: string;
        dialogue: string;
        cameraAngle: string;
        meta: PanelMeta;
        isCover: boolean;
      }
      
      const panelTasks: PanelTask[] = panels.map((panel: any, p: number) => ({
        index: p,
        desc: panel.sceneDescription || panel.description || 'A scene from the story',
        dialogue: panel.dialogue || '',
        cameraAngle: panel.cameraAngle || '',
        meta: {
          characterName: panel.characterName || undefined,
          isVillain: panel.isVillain || false,
          isSupportingCharacter: panel.isSupportingCharacter || false,
          villainDescription: storyVillainDescription || undefined,
        },
        isCover: pageType === 'cover' && p === 0,
      }));
      
      // Results array to maintain order
      const results: Array<{ imageUrl: string; desc: string; dialogue: string; cameraAngle: string }> = new Array(panels.length);
      
      // Cover page: generate cover first (sequential), then parallelize remaining panels
      const coverTask = panelTasks.find(t => t.isCover);
      const regularTasks = panelTasks.filter(t => !t.isCover);
      
      // Generate cover if present
      if (coverTask) {
        console.log(`Generating cover image...`);
        try {
          const coverImageUrl = await generateCoverImage(coverTask.desc);
          results[coverTask.index] = {
            imageUrl: coverImageUrl,
            desc: coverTask.desc,
            dialogue: coverTask.dialogue,
            cameraAngle: coverTask.cameraAngle,
          };
          console.log(`Cover panel generated successfully`);
        } catch (err: any) {
          console.error(`Error generating cover:`, err.message);
          results[coverTask.index] = {
            imageUrl: "",
            desc: coverTask.desc,
            dialogue: coverTask.dialogue,
            cameraAngle: coverTask.cameraAngle,
          };
        }
        completedPanels++;
        const coverProgress = pageProgressStart + (completedPanels / totalPanels) * (90 - pageProgressStart);
        job.progress = Math.round(coverProgress);
        await saveJobToDb(job);
      }
      
      // Generate remaining panels in parallel batches
      if (regularTasks.length > 0) {
        const batches = chunkArray(regularTasks, PARALLEL_BATCH_SIZE);
        console.log(`Generating ${regularTasks.length} panels in ${batches.length} batch(es) of up to ${PARALLEL_BATCH_SIZE} panels`);
        
        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];
          console.log(`=== Batch ${batchIdx + 1}/${batches.length}: Generating ${batch.length} panels in parallel ===`);
          
          // Generate all panels in this batch in parallel
          const batchPromises = batch.map(async (task) => {
            const panelLabel = `Panel ${task.index + 1}/${panels.length} for page ${i + 1}`;
            console.log(`Starting ${panelLabel}... (Character: ${task.meta.characterName || 'unspecified'})`);
            
            try {
              const imageUrl = await generatePanelImage(task.desc, i * 10 + task.index, task.meta);
              console.log(`${panelLabel} generated successfully`);
              return {
                index: task.index,
                imageUrl,
                desc: task.desc,
                dialogue: task.dialogue,
                cameraAngle: task.cameraAngle,
                success: true,
              };
            } catch (err: any) {
              console.error(`Error generating ${panelLabel}:`, err.message);
              return {
                index: task.index,
                imageUrl: "",
                desc: task.desc,
                dialogue: task.dialogue,
                cameraAngle: task.cameraAngle,
                success: false,
              };
            }
          });
          
          // Wait for all panels in batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Store results in correct order
          for (const result of batchResults) {
            results[result.index] = {
              imageUrl: result.imageUrl,
              desc: result.desc,
              dialogue: result.dialogue,
              cameraAngle: result.cameraAngle,
            };
          }
          
          // Update progress after batch completes
          completedPanels += batch.length;
          const batchProgress = pageProgressStart + (completedPanels / totalPanels) * (90 - pageProgressStart);
          job.progress = Math.round(batchProgress);
          await saveJobToDb(job);
          console.log(`Batch ${batchIdx + 1} completed. Progress: ${job.progress}%`);
          
          // Small delay between batches to respect API rate limits
          if (batchIdx < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      }
      
      // Populate final arrays from ordered results
      for (const result of results) {
        if (result) {
          panelImages.push(result.imageUrl);
          panelData.push({
            description: result.desc,
            dialogue: result.dialogue,
            cameraAngle: result.cameraAngle,
          });
        }
      }
      
      // Store page with all its panels
      job.pages.push({
        pageNumber: i + 1,
        pageType: pageType,
        imageUrl: panelImages[0] || "",
        panelImages: panelImages,
        scenes: {
          description: panelData.map(p => p.description).join(' | '),
          dialogue: panelData.map(p => p.dialogue).filter(d => d).join(' | '),
        },
        panels: panelData,
        generationMode: 'multi-model',
      });
      await saveJobToDb(job);
      console.log(`Page ${i + 1} completed with ${panelImages.length} panel(s)`);
    }

    console.log(`Job ${jobId} completed with ${job.pages.length} pages, total panels generated`);
    
    // Auto-save comic to user's library BEFORE marking job as completed
    // This prevents a race condition where the client sees completed status
    // but savedToLibrary is still false, causing a duplicate save
    if (job.userId && !job.savedToLibrary) {
      try {
        await syncJobPagesToS3Library(job, { publish: true });
        job.savedToLibrary = true;
        console.log(`Comic auto-saved to library for user ${job.userId}`);
      } catch (saveError) {
        console.error("Failed to publish comic draft to library:", saveError);
        await discardLibraryComicDraftIfUnused(job);
        try {
          const comic = await createUserComicS3Only(job.userId, {
            title: job.title || "Untitled Comic",
            style: job.style || "Comic",
            characterNames: job.characterNames || [],
            pages: job.pages,
          });
          job.libraryComicId = comic.id;
          job.savedToLibrary = true;
          job.pages = comic.pages as ComicPage[];
          console.log(`Comic auto-saved via fallback for user ${job.userId}`);
        } catch (fallbackErr) {
          console.error("Library fallback save also failed:", fallbackErr);
        }
      }
    }

    job.progress = 100;
    job.status = "completed";
    await saveJobToDb(job);
    
    // Send push notification to user that comic is ready
    if (job.userId) {
      try {
        await sendComicCompleteNotification(job.userId, job.title || "Your Comic");
        console.log(`Push notification sent to user ${job.userId} for comic completion`);
      } catch (notifError) {
        console.error("Failed to send comic completion notification:", notifError);
      }
    }
  } catch (error: any) {
    console.error("Comic generation error:", error);
    job.status = "failed";
    job.error = error.message || "Generation failed";
    await discardLibraryComicDraftIfUnused(job);
    await saveJobToDb(job);
    await refundCreditsForFailedJob(job);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  assertComicS3Configured();
  storage.seedDefaultArtStyles().catch(console.error);

  if (process.env.NODE_ENV === "production") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const proto = req.get("x-forwarded-proto");
      if (proto !== "https") {
        return res.status(426).json({ error: "HTTPS required" });
      }
      next();
    });
  }

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Serve admin dashboard
  app.get("/admin", (req: Request, res: Response) => {
    const adminHtml = fs.readFileSync(
      path.join(process.cwd(), "server/templates/admin.html"),
      "utf-8"
    );
    res.type("html").send(adminHtml);
  });

  // Admin login
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = generateAdminToken();
      res.json({ token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  // Verify admin token
  app.get("/api/admin/verify", (req: Request, res: Response) => {
    if (verifyAdminToken(req)) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Protected: Get settings
  app.get("/api/admin/settings", requireAuth, (req: Request, res: Response) => {
    const settings = loadSettings();
    const maskedSettings = {
      openai: {
        enabled: settings.openai.enabled,
        apiKey: settings.openai.apiKey ? "****" + settings.openai.apiKey.slice(-4) : "",
        isDefault: settings.openai.isDefault,
      },
      replicate: {
        enabled: settings.replicate.enabled,
        apiKey: settings.replicate.apiKey ? "****" + settings.replicate.apiKey.slice(-4) : "",
        isDefault: settings.replicate.isDefault,
        models: settings.replicate.models,
        defaultModel: settings.replicate.defaultModel,
      },
      siliconflow: {
        enabled: settings.siliconflow.enabled,
        apiKey: settings.siliconflow.apiKey ? "****" + settings.siliconflow.apiKey.slice(-4) : "",
        isDefault: settings.siliconflow.isDefault,
        models: settings.siliconflow.models,
      },
      flux2pro: {
        enabled: settings.flux2pro.enabled,
        apiKey: settings.flux2pro.apiKey ? "****" + settings.flux2pro.apiKey.slice(-4) : "",
        isDefault: settings.flux2pro.isDefault,
        models: settings.flux2pro.models,
      },
      stability: {
        enabled: settings.stability.enabled,
        apiKey: settings.stability.apiKey ? "****" + settings.stability.apiKey.slice(-4) : "",
        isDefault: settings.stability.isDefault,
      },
      geminiImage: {
        enabled: settings.geminiImage.enabled,
        apiKey: settings.geminiImage.apiKey ? "****" + settings.geminiImage.apiKey.slice(-4) : "",
        model: settings.geminiImage.model,
        models: settings.geminiImage.models,
      },
      defaultProvider: settings.defaultProvider,
      fallbackProvider: settings.fallbackProvider || null,
      panelGenerationProvider: settings.panelGenerationProvider || 'siliconflow',
      comicGenerationMode: settings.comicGenerationMode || 'multi-model',
      storyTextProvider: {
        ...settings.storyTextProvider,
        geminiApiKey: settings.storyTextProvider?.geminiApiKey 
          ? "••••••••" + settings.storyTextProvider.geminiApiKey.slice(-4) 
          : "",
      },
    };
    res.json(maskedSettings);
  });

  // Protected: Update settings
  app.post("/api/admin/settings", requireAuth, (req: Request, res: Response) => {
    try {
      const newSettings = req.body as AISettings;

      const currentSettings = loadSettings();

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

      // Handle SiliconFlow settings
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

      // Handle FLUX.2 Pro settings (uses Replicate API key)
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

      // Handle Gemini Image settings
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

      // Update panel generation provider
      if (newSettings.panelGenerationProvider) {
        currentSettings.panelGenerationProvider = newSettings.panelGenerationProvider;
      }

      // Update comic generation mode
      if (newSettings.comicGenerationMode) {
        currentSettings.comicGenerationMode = newSettings.comicGenerationMode;
      }

      // Update fallback provider
      if (newSettings.fallbackProvider !== undefined) {
        currentSettings.fallbackProvider = newSettings.fallbackProvider;
      }

      // Update story text provider settings
      if (newSettings.storyTextProvider) {
        if (!currentSettings.storyTextProvider) {
          currentSettings.storyTextProvider = { provider: 'openai', openaiModel: 'gpt-4o', geminiModel: 'gemini-2.0-flash', geminiApiKey: '', replicateModel: 'meta/meta-llama-3-70b-instruct' };
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
        if (newSettings.storyTextProvider.geminiApiKey && !newSettings.storyTextProvider.geminiApiKey.startsWith('••')) {
          currentSettings.storyTextProvider.geminiApiKey = newSettings.storyTextProvider.geminiApiKey;
        }
        if (newSettings.storyTextProvider.replicateModel) {
          currentSettings.storyTextProvider.replicateModel = newSettings.storyTextProvider.replicateModel;
        }
      }

      saveSettings(currentSettings);
      aiSettings = currentSettings;

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // User Authentication Endpoints
  app.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
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
      
      let referrerId: string | null = null;
      if (referralCode && referralCode.trim()) {
        const referrer = await storage.getUserByReferralCode(referralCode.trim().toUpperCase());
        if (referrer && referrer.emailVerified) {
          referrerId = referrer.id;
        }
      }
      
      const verificationCode = generateVerificationCode();
      const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const user = await storage.createUser(email, password, verificationCode, verificationCodeExpiresAt);
      
      if (referrerId) {
        await storage.setUserReferredBy(user.id, referrerId);
      }
      
      const token = generateUserToken(user.id);
      
      sendVerificationEmail(email, verificationCode, "").catch(err => {
        console.error("Failed to send verification email:", err);
      });
      
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
          adsWatchedToday: user.adsWatchedToday,
        }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
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
          adsWatchedToday: user.adsWatchedToday,
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken, accessToken, referralCode } = req.body;
      
      if (!idToken && !accessToken) {
        return res.status(400).json({ error: "Google token is required" });
      }

      let googleEmail: string | null = null;
      let googleId: string | null = null;
      let name: string | null = null;

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
        user = await storage.createUser(googleEmail, tempPassword, undefined, undefined);
        
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
          adsWatchedToday: user.adsWatchedToday,
        }
      });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Google authentication failed" });
    }
  });

  app.get("/api/auth/me", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
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
        referralCode: user.referralCode,
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // JWT tokens are stateless - client just deletes the token
    // For enhanced security, a token blacklist could be implemented
    res.json({ success: true });
  });

  app.post("/api/auth/verify-email", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
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
            const referralSettings = await storage.getReferralSettings();
            
            if (referralSettings.enabled) {
              let inviterCredits = referralSettings.inviterCredits;
              let inviteeCredits = referralSettings.inviteeCredits;
              let bountyId: number | undefined;
              
              const activeBounty = await storage.getActiveBountyForUser(referrer.id);
              if (activeBounty) {
                inviterCredits += activeBounty.bonusInviterCredits;
                inviteeCredits += activeBounty.bonusInviteeCredits;
                bountyId = activeBounty.id;
              }
              
              await storage.updateUserCredits(referrer.id, inviterCredits);
              await storage.recordTransaction(referrer.id, inviterCredits, 'referral_bonus', `Referral bonus for inviting ${user.email}`);
              
              await storage.updateUserCredits(user.id, inviteeCredits);
              await storage.recordTransaction(user.id, inviteeCredits, 'referral_bonus', `Welcome bonus from referral`);
              
              await storage.createReferralHistory({
                inviterId: referrer.id,
                inviterEmail: referrer.email,
                inviteeId: user.id,
                inviteeEmail: user.email,
                referralCode: referrer.referralCode || '',
                inviterCreditsAwarded: inviterCredits,
                inviteeCreditsAwarded: inviteeCredits,
                bountyId,
                status: 'completed',
              });
            }
          }
        }
        
        sendWelcomeEmail(user.email).catch(err => {
          console.error("Failed to send welcome email:", err);
        });
      }
      
      res.json({ success: true, message: "Email verified successfully" });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      
      const newCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await storage.resendVerificationCode(userId, newCode, expiresAt);
      
      sendVerificationEmail(user.email, newCode, "").catch(err => {
        console.error("Failed to send verification email:", err);
      });
      
      res.json({ success: true, message: "Verification code sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  });

  app.post("/api/auth/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
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
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.setPasswordResetCode(email, resetCode, expiresAt);
      
      sendPasswordResetEmail(email, resetCode, "").catch(err => {
        console.error("Failed to send password reset email:", err);
      });
      
      res.json({ success: true, message: "If an account exists, a reset code will be sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", authRateLimiter, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Credit Settings Endpoints
  app.get("/api/credits/settings", async (req: Request, res: Response) => {
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
        topUp3Price: settings.topUp3Price,
      });
    } catch (error: any) {
      console.error("Get credit settings error:", error);
      res.status(500).json({ error: "Failed to get credit settings" });
    }
  });

  app.post("/api/credits/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const settings = await storage.updateCreditSettings(updates);
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Update credit settings error:", error);
      res.status(500).json({ error: "Failed to update credit settings" });
    }
  });

  // Watch Ad for Credits
  app.post("/api/credits/watch-ad", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const settings = await storage.getCreditSettings();
      const today = new Date().toISOString().split('T')[0];
      const lastAdDate = user.lastAdWatchDate ? String(user.lastAdWatchDate).split('T')[0] : null;
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
    } catch (error: any) {
      console.error("Watch ad error:", error);
      res.status(500).json({ error: "Failed to process ad reward" });
    }
  });

  // Subscription webhook (for RevenueCat)
  app.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(200).json({ received: true });
    }
  });

  // Calculate credit cost for a comic
  app.get("/api/credits/calculate", async (req: Request, res: Response) => {
    try {
      const pagesCount = parseInt(req.query.pages as string) || 2;
      const settings = await storage.getCreditSettings();
      
      const baseCost = settings.baseCost;
      const additionalPages = Math.max(0, pagesCount - 1);
      const additionalCost = additionalPages * settings.costPerPage;
      const totalCost = baseCost + additionalCost;
      
      res.json({
        pagesCount,
        baseCost,
        additionalCost,
        totalCost,
      });
    } catch (error: any) {
      console.error("Calculate credits error:", error);
      res.status(500).json({ error: "Failed to calculate credits" });
    }
  });

  // Deduct credits for comic generation
  app.post("/api/credits/deduct", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
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
    } catch (error: any) {
      console.error("Deduct credits error:", error);
      res.status(500).json({ error: "Failed to deduct credits" });
    }
  });

  // Get user transactions
  app.get("/api/credits/transactions", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const transactions = await storage.getUserTransactions(userId);
      res.json({ transactions });
    } catch (error: any) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Failed to get transactions" });
    }
  });

  // Admin: Get all users (for admin dashboard)
  app.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const sanitizedUsers = allUsers.map(u => ({
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
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Admin: Get admin stats
  app.get("/api/admin/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  });

  // Admin: Update user credits/subscription
  app.post("/api/admin/users/:userId/update", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
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
      }});
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin: Get credit settings
  app.get("/api/admin/credit-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getCreditSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Get credit settings error:", error);
      res.status(500).json({ error: "Failed to get credit settings" });
    }
  });

  // Admin: Update credit settings
  app.post("/api/admin/credit-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const settings = await storage.updateCreditSettings(updates);
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Update credit settings error:", error);
      res.status(500).json({ error: "Failed to update credit settings" });
    }
  });

  // Admin: Get rate limit settings
  app.get("/api/admin/rate-limits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getRateLimitSettings();
      res.json({ settings });
    } catch (error: any) {
      console.error("Get rate limit settings error:", error);
      res.status(500).json({ error: "Failed to get rate limit settings" });
    }
  });

  // Admin: Update rate limit settings
  app.post("/api/admin/rate-limits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { maxGenerationsPerHour, maxGenerationsPerDay, enabled } = req.body;
      const updates: any = {};
      if (maxGenerationsPerHour !== undefined) updates.maxGenerationsPerHour = maxGenerationsPerHour;
      if (maxGenerationsPerDay !== undefined) updates.maxGenerationsPerDay = maxGenerationsPerDay;
      if (enabled !== undefined) updates.enabled = enabled;
      
      const settings = await storage.updateRateLimitSettings(updates);
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Update rate limit settings error:", error);
      res.status(500).json({ error: "Failed to update rate limit settings" });
    }
  });

  // Admin: Get OAuth settings
  app.get("/api/admin/oauth-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getOAuthSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Get OAuth settings error:", error);
      res.status(500).json({ error: "Failed to get OAuth settings" });
    }
  });

  // Admin: Update OAuth settings
  app.post("/api/admin/oauth-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { googleWebClientId, googleIosClientId, googleAndroidClientId, enabled } = req.body;
      const updates: any = {};
      if (googleWebClientId !== undefined) updates.googleWebClientId = googleWebClientId || null;
      if (googleIosClientId !== undefined) updates.googleIosClientId = googleIosClientId || null;
      if (googleAndroidClientId !== undefined) updates.googleAndroidClientId = googleAndroidClientId || null;
      if (enabled !== undefined) updates.enabled = enabled;
      
      const settings = await storage.updateOAuthSettings(updates);
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Update OAuth settings error:", error);
      res.status(500).json({ error: "Failed to update OAuth settings" });
    }
  });

  // Public: Get OAuth config for mobile app
  app.get("/api/oauth-config", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getOAuthSettings();
      if (!settings.enabled) {
        return res.json({ enabled: false });
      }
      res.json({
        enabled: true,
        googleWebClientId: settings.googleWebClientId,
        googleIosClientId: settings.googleIosClientId,
        googleAndroidClientId: settings.googleAndroidClientId,
      });
    } catch (error: any) {
      console.error("Get OAuth config error:", error);
      res.status(500).json({ error: "Failed to get OAuth config" });
    }
  });

  // Admin: Get audit logs
  app.get("/api/admin/audit-logs", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      
      const result = await storage.getAuditLogs({ limit, offset, userId, action });
      res.json(result);
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  // Admin: Get audit stats
  app.get("/api/admin/audit-stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAuditStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Get audit stats error:", error);
      res.status(500).json({ error: "Failed to get audit stats" });
    }
  });

  // =============== REFERRAL SYSTEM API ===============
  // User: Get referral stats
  app.get("/api/referral/stats", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const stats = await storage.getUserReferralStats(userId);
      const settings = await storage.getReferralSettings();
      
      res.json({
        referralCode: stats.referralCode,
        totalReferrals: stats.totalReferrals,
        creditsEarned: stats.creditsEarned,
        inviterCredits: settings.inviterCredits,
        inviteeCredits: settings.inviteeCredits,
        enabled: settings.enabled,
      });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });

  // User: Check referral code validity
  app.get("/api/referral/check/:code", async (req: Request, res: Response) => {
    try {
      const code = (req.params.code as string)?.toUpperCase();
      if (!code) {
        return res.json({ valid: false });
      }
      
      const user = await storage.getUserByReferralCode(code);
      if (user && user.emailVerified) {
        res.json({ valid: true });
      } else {
        res.json({ valid: false });
      }
    } catch (error: any) {
      console.error("Check referral code error:", error);
      res.status(500).json({ error: "Failed to check referral code" });
    }
  });

  // Admin: Get referral settings
  app.get("/api/admin/referral-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getReferralSettings();
      res.json({ settings });
    } catch (error: any) {
      console.error("Get referral settings error:", error);
      res.status(500).json({ error: "Failed to get referral settings" });
    }
  });

  // Admin: Update referral settings
  app.post("/api/admin/referral-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { inviterCredits, inviteeCredits, enabled } = req.body;
      const settings = await storage.updateReferralSettings({
        inviterCredits,
        inviteeCredits,
        enabled,
      });
      res.json({ settings });
    } catch (error: any) {
      console.error("Update referral settings error:", error);
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });

  // Admin: Get all referral bounties
  app.get("/api/admin/referral-bounties", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const bounties = await storage.getAllReferralBounties();
      // Enrich bounties with user emails
      const enrichedBounties = await Promise.all(bounties.map(async (bounty) => {
        const userIds = bounty.userIds as (number | string)[];
        const userEmails: string[] = [];
        for (const userId of userIds) {
          const user = await storage.getUser(String(userId));
          if (user) {
            userEmails.push(user.email);
          }
        }
        return {
          ...bounty,
          userEmail: userEmails.join(', ') || 'Unknown',
          bonusCredits: bounty.bonusInviterCredits,
          expiresAt: bounty.endsAt
        };
      }));
      res.json({ bounties: enrichedBounties });
    } catch (error: any) {
      console.error("Get referral bounties error:", error);
      res.status(500).json({ error: "Failed to get referral bounties" });
    }
  });

  // Admin: Create referral bounty
  app.post("/api/admin/referral-bounties", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { name, description, userIds, userEmail, bonusInviterCredits, bonusInviteeCredits, startsAt, endsAt } = req.body;
      
      // If userEmail is provided, look up the user ID
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
        endsAt: new Date(endsAt),
      });
      res.json({ bounty });
    } catch (error: any) {
      console.error("Create referral bounty error:", error);
      res.status(500).json({ error: "Failed to create referral bounty" });
    }
  });

  // Admin: Update referral bounty
  app.put("/api/admin/referral-bounties/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const bountyId = parseInt(req.params.id as string);
      const { name, description, userIds, bonusInviterCredits, bonusInviteeCredits, startsAt, endsAt, enabled } = req.body;
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (userIds !== undefined) updates.userIds = userIds;
      if (bonusInviterCredits !== undefined) updates.bonusInviterCredits = bonusInviterCredits;
      if (bonusInviteeCredits !== undefined) updates.bonusInviteeCredits = bonusInviteeCredits;
      if (startsAt !== undefined) updates.startsAt = new Date(startsAt);
      if (endsAt !== undefined) updates.endsAt = new Date(endsAt);
      if (enabled !== undefined) updates.enabled = enabled;
      
      const bounty = await storage.updateReferralBounty(bountyId, updates);
      if (!bounty) {
        return res.status(404).json({ error: "Bounty not found" });
      }
      res.json({ bounty });
    } catch (error: any) {
      console.error("Update referral bounty error:", error);
      res.status(500).json({ error: "Failed to update referral bounty" });
    }
  });

  // Admin: Delete referral bounty
  app.delete("/api/admin/referral-bounties/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const bountyId = parseInt(req.params.id as string);
      const deleted = await storage.deleteReferralBounty(bountyId);
      if (!deleted) {
        return res.status(404).json({ error: "Bounty not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete referral bounty error:", error);
      res.status(500).json({ error: "Failed to delete referral bounty" });
    }
  });

  // Admin: Get referral history
  app.get("/api/admin/referral-history", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const { history, total } = await storage.getReferralHistory({ limit, offset });
      res.json({ history, total });
    } catch (error: any) {
      console.error("Get referral history error:", error);
      res.status(500).json({ error: "Failed to get referral history" });
    }
  });

  // Admin: Get referral stats
  app.get("/api/admin/referral-stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getReferralStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });

  // =============== USER CHARACTERS API ===============
  // Get all user's characters
  app.get("/api/characters", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const characters = await storage.getUserCharacters(userId);
      res.json({ characters });
    } catch (error: any) {
      console.error("Get characters error:", error);
      res.status(500).json({ error: "Failed to get characters" });
    }
  });

  // Create a new character
  app.post("/api/characters", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name, photoUri } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const imgSize = getBase64ImageSize(photoUri);
      if (imgSize !== null && imgSize > MAX_CHARACTER_IMAGE_BYTES) {
        return res.status(400).json({ error: "Character image too large. Maximum size is 5MB." });
      }
      
      const character = await storage.createUserCharacter(userId, name, photoUri);
      res.json({ character });
    } catch (error: any) {
      console.error("Create character error:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });

  // Update a character
  app.put("/api/characters/:id", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const characterId = parseInt(req.params.id as string);
      const { name, photoUri } = req.body;
      const imgSize = getBase64ImageSize(photoUri);
      if (imgSize !== null && imgSize > MAX_CHARACTER_IMAGE_BYTES) {
        return res.status(400).json({ error: "Character image too large. Maximum size is 5MB." });
      }
      
      const character = await storage.updateUserCharacter(characterId, userId, { name, photoUri });
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ character });
    } catch (error: any) {
      console.error("Update character error:", error);
      res.status(500).json({ error: "Failed to update character" });
    }
  });

  // Delete a character
  app.delete("/api/characters/:id", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const characterId = parseInt(req.params.id as string);
      
      const deleted = await storage.deleteUserCharacter(characterId, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete character error:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });

  // =============== USER COMICS API ===============
  /** Quick S3 check (curl): `POST` with `Authorization: Bearer <jwt>`. Pings `{prefix}/_s3_test/...` */
  app.post("/api/test-s3", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const result = await uploadTestPngToS3(userId);
      res.json({ ok: true, ...result });
    } catch (error: any) {
      if (error instanceof ComicS3Error) {
        return res
          .status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422)
          .json(comicS3ErrorPayload(error));
      }
      console.error("Test S3 error:", error);
      res.status(500).json({ error: "S3 test failed" });
    }
  });

  // Get all user's saved comics (lightweight - no pages data)
  app.get("/api/comics", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const comics = await storage.getUserComicsLightweight(userId);
      res.json({ comics });
    } catch (error: any) {
      console.error("Get comics error:", error);
      res.status(500).json({ error: "Failed to get comics" });
    }
  });

  /**
   * Redirect to the first non-empty page image in storage order (skips a blank page 0).
   * For history thumbnails; do not hard-code `/page/0/...` only.
   */
  app.get("/api/comics/:id/first-image", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const id = parseInt(req.params.id as string, 10);
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
        // Proxy the image instead of redirecting to avoid CORS issues
        console.log(`[PROXY] Fetching first-image from S3: ${trimmed}`);
        const imageResponse = await fetch(trimmed);
        if (!imageResponse.ok) {
          console.error(`[PROXY] Failed to fetch from S3: ${imageResponse.status}`);
          return res.status(404).json({ error: "Image not found on S3" });
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';

        console.log(`[PROXY] Successfully proxying image, size: ${imageBuffer.byteLength} bytes, type: ${contentType}`);
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        const origin = req.headers.origin || 'http://localhost:8081';
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.send(Buffer.from(imageBuffer));
      }
      return res.status(400).json({ error: "Invalid comic image URL" });
    } catch (error: any) {
      console.error("Get first comic image error:", error);
      res.status(500).json({ error: "Failed to get image" });
    }
  });

  // Get a single comic with full data (including pages)
  app.get("/api/comics/:id/page/:pageNum/panel/:panelNum/image", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const comicId = parseInt(req.params.id as string);
      const pageNum = parseInt(req.params.pageNum as string);
      const panelNum = parseInt(req.params.panelNum as string);

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
        // Proxy the image instead of redirecting to avoid CORS issues
        console.log(`[PROXY] Fetching panel image from S3: ${trimmed}`);
        const imageResponse = await fetch(trimmed);
        if (!imageResponse.ok) {
          console.error(`[PROXY] Failed to fetch from S3: ${imageResponse.status}`);
          return res.status(404).json({ error: "Image not found on S3" });
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';

        console.log(`[PROXY] Successfully proxying image, size: ${imageBuffer.byteLength} bytes, type: ${contentType}`);
        res.set("Content-Type", contentType);
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        const origin = req.headers.origin || 'http://localhost:8081';
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Access-Control-Allow-Credentials", "true");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return res.send(Buffer.from(imageBuffer));
      }

      return res.status(400).json({ error: "Invalid comic image URL" });
    } catch (error: any) {
      console.error("Get panel image error:", error);
      res.status(500).json({ error: "Failed to get image" });
    }
  });

  app.get("/api/comics/:id", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const idParam = req.params.id as string;
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid comic ID" });
      }
      const comic = await storage.getUserComicMetadata(id, userId);
      if (!comic) {
        return res.status(404).json({ error: "Comic not found" });
      }
      
      const lightweightPages = (comic.pagesMetadata || []).map((page: any, pageIndex: number) => ({
        pageNumber: page.pageNumber,
        pageType: page.pageType,
        panelCount: page.panelCount || 0,
        hasImageUrl: page.hasImageUrl,
        panels: page.panels,
        scenes: page.scenes,
        generationMode: page.generationMode,
        _pageIndex: pageIndex,
      }));
      
      const lightweightComic = {
        id: comic.id,
        userId: comic.userId,
        title: comic.title,
        style: comic.style,
        characterNames: comic.characterNames,
        pages: lightweightPages,
        createdAt: comic.createdAt,
      };
      
      res.json({ comic: lightweightComic });
    } catch (error: any) {
      console.error("Get comic error:", error);
      res.status(500).json({ error: "Failed to get comic" });
    }
  });

  // Save a comic to history
  app.post("/api/comics", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { title, style, characterNames, pages } = req.body;
      
      if (!title || !style || !pages) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const comic = await createUserComicS3Only(userId, {
        title,
        style,
        characterNames: characterNames || [],
        pages,
      });
      res.json({ comic });
    } catch (error: any) {
      if (error instanceof ComicS3Error) {
        return res
          .status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422)
          .json(comicS3ErrorPayload(error));
      }
      console.error("Save comic error:", error);
      res.status(500).json({ error: "Failed to save comic" });
    }
  });

  // Update a comic
  app.put("/api/comics/:id", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const comicId = parseInt(req.params.id as string);
      const { title, pages } = req.body;

      if (isNaN(comicId)) {
        return res.status(400).json({ error: "Invalid comic ID" });
      }

      const existing = await storage.getUserComicById(comicId, userId);
      if (!existing) {
        return res.status(404).json({ error: "Comic not found" });
      }

      if (pages !== undefined) {
        const ingested = await ingestComicPagesToS3(userId, comicId, pages);
        const { pages: normalizedPages } = normalizeComicPagesOrder(ingested);
        const comic = await storage.updateUserComic(comicId, userId, { title, pages: normalizedPages });
        if (!comic) {
          return res.status(404).json({ error: "Comic not found" });
        }
        return res.json({ comic });
      }

      const comic = await storage.updateUserComic(comicId, userId, { title });
      if (!comic) {
        return res.status(404).json({ error: "Comic not found" });
      }
      return res.json({ comic });
    } catch (error: any) {
      if (error instanceof ComicS3Error) {
        return res
          .status(error.code === "S3_NOT_CONFIGURED" ? 503 : 422)
          .json(comicS3ErrorPayload(error));
      }
      console.error("Update comic error:", error);
      res.status(500).json({ error: "Failed to update comic" });
    }
  });

  // Delete a comic
  app.delete("/api/comics/:id", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const comicId = parseInt(req.params.id as string);
      
      const deleted = await storage.deleteUserComic(comicId, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Comic not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete comic error:", error);
      res.status(500).json({ error: "Failed to delete comic" });
    }
  });

  // =============== COMIC GENERATION ===============
  app.post("/api/generate-comic", requireUserAuth, requireEmailVerified, async (req: Request, res: Response) => {
    console.log("=== generate-comic endpoint called ===");
    const userId = (req as any).userId;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const body = req.body as GenerateComicRequest;
    const storyPrompt = sanitizeStoryPrompt(body.storyPrompt);
    const { style, characters, pagesCount, scenesPerPage, title, language } = body;

    if (!storyPrompt || !style) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check user credits before starting generation
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check rate limits
    const rateLimit = await storage.checkUserRateLimit(userId);
    if (!rateLimit.allowed) {
      console.log(`User ${userId} rate limited: ${rateLimit.reason}`);
      
      // Log rate limit event
      await storage.createAuditLog({
        userId,
        userEmail: user.email,
        action: "rate_limited",
        status: "blocked",
        pagesCount: pagesCount || 6,
        style,
        ipAddress,
        userAgent,
        errorMessage: rateLimit.reason,
        metadata: { 
          hourlyCount: rateLimit.hourlyCount, 
          dailyCount: rateLimit.dailyCount,
          title 
        },
      });

      return res.status(429).json({ 
        error: "Rate limit exceeded",
        code: "RATE_LIMITED",
        reason: rateLimit.reason,
        hourlyCount: rateLimit.hourlyCount,
        dailyCount: rateLimit.dailyCount
      });
    }

    // Calculate credit cost
    const settings = await storage.getCreditSettings();
    const numPages = pagesCount || 6;
    const additionalPages = Math.max(0, numPages - 1);
    const totalCost = settings.baseCost + (additionalPages * settings.costPerPage);

    // Check if user has enough credits
    if (user.credits < totalCost) {
      console.log(`User ${userId} has insufficient credits: ${user.credits} < ${totalCost}`);
      
      // Log insufficient credits event
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
        metadata: { required: totalCost, available: user.credits, title },
      });

      return res.status(402).json({ 
        error: "Insufficient credits",
        code: "INSUFFICIENT_CREDITS",
        required: totalCost,
        available: user.credits,
        shortfall: totalCost - user.credits
      });
    }

    // Deduct credits BEFORE starting generation
    const updatedUser = await storage.updateUserCredits(userId, -totalCost);
    await storage.recordTransaction(userId, -totalCost, "comic_generation", `Generated ${numPages}-page ${style} comic: ${title || 'Untitled'}`);
    console.log(`Deducted ${totalCost} credits from user ${userId}. New balance: ${updatedUser?.credits}`);

    const jobId = crypto.randomUUID();
    const job: ComicJob = {
      id: jobId,
      userId,
      status: "pending",
      progress: 0,
      title,
      style,
      pagesCount: numPages,
      pages: [],
      createdAt: Date.now(),
    };

    // Save job to database for persistence across server restarts
    await saveJobToDb(job);
    console.log(`Job ${jobId} created for user ${userId} and stored in database`);

    // Log generation started
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
      metadata: { jobId, title, language, charactersCount: characters?.length || 0 },
    });

    processComicJob(jobId, { storyPrompt, style, characters, pagesCount, scenesPerPage, title, language });

    res.json({ jobId, creditsDeducted: totalCost, newBalance: updatedUser?.credits || 0 });
  });

  // Job status handler - supports both GET and POST (POST for browser compatibility)
  const handleJobStatus = async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    console.log(`=== Job status check for ${jobId} from ${clientIP} (${userAgent.substring(0, 50)}) ===`);
    const job = await getJobFromDb(jobId);

    if (!job) {
      console.log(`Job ${jobId} not found in database or cache`);
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status === "completed" || job.status === "failed") {
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        title: job.title,
        pages: job.pages,
        error: job.error,
        savedToLibrary: job.savedToLibrary || false,
        libraryComicId: job.libraryComicId,
      });
    } else {
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        title: job.title,
        pagesCompleted: job.pages?.length || 0,
        error: job.error,
      });
    }
  };
  
  app.get("/api/job/:jobId", handleJobStatus);
  app.post("/api/job/:jobId", handleJobStatus);

  app.post("/api/generate-comic-sse", async (req: Request, res: Response) => {
    res.status(410).json({ error: "This endpoint is deprecated. Use /api/generate-comic instead." });
  });

  app.post("/api/inspire-me", async (req: Request, res: Response) => {
    try {
      const { genre, characters } = req.body;

      const inspireSystemPrompt = "You are a creative story idea generator. Generate 3 short, engaging story prompts suitable for comic creation. Each prompt should be 2-3 sentences. Respond with JSON: { \"ideas\": [\"idea1\", \"idea2\", \"idea3\"] }";
      const inspireUserPrompt = `Generate 3 unique comic story ideas${genre ? ` in the ${genre} genre` : ""}${characters ? ` featuring ${characters}` : ""}. Make them fun, creative, and suitable for all ages.`;
      
      const content = await generateTextWithProvider(inspireSystemPrompt, inspireUserPrompt, { type: "json_object" });
      if (content) {
        res.json(JSON.parse(content));
      } else {
        res.json({ ideas: [] });
      }
    } catch (error: any) {
      console.error("Inspire me error:", error);
      res.status(500).json({ error: "Failed to generate ideas" });
    }
  });

  // ===== Internal Ads Management =====

  // Admin: Get ad settings
  app.get("/api/admin/ad-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAdSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Get ad settings error:", error);
      res.status(500).json({ error: "Failed to get ad settings" });
    }
  });

  // Admin: Update ad settings
  app.post("/api/admin/ad-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { maxImpressionsPerHour, maxImpressionsPerDay, enabled, exemptSubscribers } = req.body;
      const updates: any = {};
      if (maxImpressionsPerHour !== undefined) updates.maxImpressionsPerHour = maxImpressionsPerHour;
      if (maxImpressionsPerDay !== undefined) updates.maxImpressionsPerDay = maxImpressionsPerDay;
      if (enabled !== undefined) updates.enabled = enabled;
      if (exemptSubscribers !== undefined) updates.exemptSubscribers = exemptSubscribers;
      
      const settings = await storage.updateAdSettings(updates);
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Update ad settings error:", error);
      res.status(500).json({ error: "Failed to update ad settings" });
    }
  });

  // Admin: Get all ads
  app.get("/api/admin/ads", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const ads = await storage.getAllAds();
      res.json({ ads });
    } catch (error: any) {
      console.error("Get ads error:", error);
      res.status(500).json({ error: "Failed to get ads" });
    }
  });

  // Admin: Create ad
  app.post("/api/admin/ads", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { type, title, content, imageUrl, linkUrl, isActive } = req.body;
      
      if (!type || !title) {
        return res.status(400).json({ error: "Type and title are required" });
      }
      
      if (type === 'text' && !content) {
        return res.status(400).json({ error: "Content is required for text ads" });
      }
      
      if (type === 'banner' && !imageUrl) {
        return res.status(400).json({ error: "Image URL is required for banner ads" });
      }
      
      const ad = await storage.createAd({
        type,
        title,
        content,
        imageUrl,
        linkUrl,
        isActive,
      });
      res.json({ ad });
    } catch (error: any) {
      console.error("Create ad error:", error);
      res.status(500).json({ error: "Failed to create ad" });
    }
  });

  // Admin: Update ad
  app.put("/api/admin/ads/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const adId = parseInt(req.params.id as string);
      const { type, title, content, imageUrl, linkUrl, isActive } = req.body;
      
      const updates: any = {};
      if (type !== undefined) updates.type = type;
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (linkUrl !== undefined) updates.linkUrl = linkUrl;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const ad = await storage.updateAd(adId, updates);
      if (!ad) {
        return res.status(404).json({ error: "Ad not found" });
      }
      res.json({ ad });
    } catch (error: any) {
      console.error("Update ad error:", error);
      res.status(500).json({ error: "Failed to update ad" });
    }
  });

  // Admin: Delete ad
  app.delete("/api/admin/ads/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const adId = parseInt(req.params.id as string);
      const deleted = await storage.deleteAd(adId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete ad error:", error);
      res.status(500).json({ error: "Failed to delete ad" });
    }
  });

  // Public: Get ads for display (with frequency limiting)
  app.get("/api/ads", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const type = req.query.type as 'text' | 'banner' | undefined;
      
      // Get user to check subscription status
      const user = await storage.getUser(userId);
      const isSubscriber = user?.subscriptionStatus === 'active';
      
      // Check if user can see ads
      const canShow = await storage.canShowAd(userId, isSubscriber);
      if (!canShow.allowed) {
        return res.json({ ad: null, reason: canShow.reason });
      }
      
      // Get a random ad of the requested type
      const adType = type || 'text';
      const ad = await storage.getRandomAd(adType);
      
      if (!ad) {
        return res.json({ ad: null, reason: "No active ads available" });
      }
      
      res.json({ ad });
    } catch (error: any) {
      console.error("Get ad error:", error);
      res.status(500).json({ error: "Failed to get ad" });
    }
  });

  // Public: Record ad impression
  app.post("/api/ads/impression", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { adId } = req.body;
      
      if (!adId) {
        return res.status(400).json({ error: "Ad ID is required" });
      }
      
      await storage.recordAdImpression(userId, adId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Record impression error:", error);
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  // =====================
  // PUSH NOTIFICATIONS
  // =====================

  // Register push token
  app.post("/api/notifications/register", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { token, platform, deviceName } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ error: "Token and platform are required" });
      }
      
      const result = await storage.registerPushToken(userId, token, platform, deviceName);
      res.json({ success: true, token: result });
    } catch (error: any) {
      console.error("Register push token error:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  // Unregister push token
  app.delete("/api/notifications/register", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      await storage.unregisterPushToken(token);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unregister push token error:", error);
      res.status(500).json({ error: "Failed to unregister push token" });
    }
  });

  // Get notification preferences
  app.get("/api/notifications/preferences", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      let prefs = await storage.getNotificationPreferences(userId);
      
      if (!prefs) {
        prefs = await storage.updateNotificationPreferences(userId, {});
      }
      
      res.json(prefs);
    } catch (error: any) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });

  // Update notification preferences
  app.post("/api/notifications/preferences", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { comicComplete, lowCredits, referralSuccess, promotions } = req.body;
      
      const updates: Record<string, boolean> = {};
      if (typeof comicComplete === "boolean") updates.comicComplete = comicComplete;
      if (typeof lowCredits === "boolean") updates.lowCredits = lowCredits;
      if (typeof referralSuccess === "boolean") updates.referralSuccess = referralSuccess;
      if (typeof promotions === "boolean") updates.promotions = promotions;
      
      const prefs = await storage.updateNotificationPreferences(userId, updates);
      res.json(prefs);
    } catch (error: any) {
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // Admin: Get notification settings
  app.get("/api/admin/notification-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getNotificationSettings();
      const tokenCount = await storage.getActiveTokenCount();
      res.json({ ...settings, activeDevices: tokenCount });
    } catch (error: any) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });

  // Admin: Update notification settings
  app.post("/api/admin/notification-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { enabled, lowCreditsThreshold } = req.body;
      
      const updates: Record<string, unknown> = {};
      if (typeof enabled === "boolean") updates.enabled = enabled;
      if (typeof lowCreditsThreshold === "number") updates.lowCreditsThreshold = lowCreditsThreshold;
      
      const settings = await storage.updateNotificationSettings(updates);
      res.json(settings);
    } catch (error: any) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // Admin: Send broadcast notification
  app.post("/api/admin/notifications/broadcast", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { title, body, data } = req.body;
      
      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }
      
      const result = await sendBroadcastNotification({ title, body, data });
      res.json(result);
    } catch (error: any) {
      console.error("Broadcast notification error:", error);
      res.status(500).json({ error: "Failed to send broadcast notification" });
    }
  });

  // Admin: Get notification history
  app.get("/api/admin/notification-history", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const history = await storage.getNotificationHistory(limit, offset);
      res.json({ history });
    } catch (error: any) {
      console.error("Get notification history error:", error);
      res.status(500).json({ error: "Failed to get notification history" });
    }
  });

  // =====================
  // ART STYLES
  // =====================

  app.get("/api/art-styles", requireUserAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const styles = await storage.getArtStyles();
      const settings = await storage.getArtStyleSettings();
      const userUnlocks = await storage.getUserUnlockedStyles(userId);
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      
      const stylesWithStatus = styles.filter(s => s.isActive).map(s => ({
        ...s,
        isUnlocked: !s.isPremium || hasAll || userUnlocks.some(u => u.styleId === s.id),
      }));
      
      res.json({ styles: stylesWithStatus, unlockAllCost: settings.unlockAllCost, allUnlocked: hasAll });
    } catch (error: any) {
      console.error("Get art styles error:", error);
      res.status(500).json({ error: "Failed to get art styles" });
    }
  });

  app.post("/api/art-styles/:id/unlock", requireUserAuth, requireEmailVerified, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const styleId = parseInt(req.params.id as string);
      
      const styles = await storage.getArtStyles();
      const style = styles.find(s => s.id === styleId);
      if (!style) return res.status(404).json({ error: "Style not found" });
      if (!style.isPremium) return res.status(400).json({ error: "Style is already free" });
      
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      if (hasAll) return res.status(400).json({ error: "All styles already unlocked" });
      
      const userUnlocks = await storage.getUserUnlockedStyles(userId);
      if (userUnlocks.some(u => u.styleId === styleId)) {
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
    } catch (error: any) {
      console.error("Unlock style error:", error);
      res.status(500).json({ error: "Failed to unlock style" });
    }
  });

  app.post("/api/art-styles/unlock-all", requireUserAuth, requireEmailVerified, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      
      const hasAll = await storage.hasUserUnlockedAllStyles(userId);
      if (hasAll) return res.status(400).json({ error: "All styles already unlocked" });
      
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
    } catch (error: any) {
      console.error("Unlock all styles error:", error);
      res.status(500).json({ error: "Failed to unlock all styles" });
    }
  });

  app.get("/api/admin/art-styles", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const styles = await storage.getArtStyles();
      const settings = await storage.getArtStyleSettings();
      res.json({ styles, settings });
    } catch (error: any) {
      console.error("Admin get art styles error:", error);
      res.status(500).json({ error: "Failed to get art styles" });
    }
  });

  app.post("/api/admin/art-styles", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { name, isPremium, unlockCost, displayOrder } = req.body;
      const style = await storage.createArtStyle({ name, isPremium: isPremium ?? true, unlockCost: unlockCost ?? 100, displayOrder: displayOrder ?? 99 });
      res.json({ success: true, style });
    } catch (error: any) {
      console.error("Admin create art style error:", error);
      res.status(500).json({ error: "Failed to create art style" });
    }
  });

  app.put("/api/admin/art-styles/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const updates = req.body;
      const style = await storage.updateArtStyle(id, updates);
      res.json({ success: true, style });
    } catch (error: any) {
      console.error("Admin update art style error:", error);
      res.status(500).json({ error: "Failed to update art style" });
    }
  });

  app.delete("/api/admin/art-styles/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteArtStyle(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin delete art style error:", error);
      res.status(500).json({ error: "Failed to delete art style" });
    }
  });

  app.post("/api/admin/art-style-settings", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { unlockAllCost } = req.body;
      const settings = await storage.updateArtStyleSettings({ unlockAllCost });
      res.json({ success: true, settings });
    } catch (error: any) {
      console.error("Admin update art style settings error:", error);
      res.status(500).json({ error: "Failed to update art style settings" });
    }
  });

  app.get("/api/admin/users/:userId/unlocked-styles", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      const unlocked = await storage.getUserUnlockedStyles(userId);
      const allUnlocked = await storage.hasUserUnlockedAllStyles(userId);
      const allStyles = await storage.getArtStyles();
      res.json({ unlocked, allUnlocked, allStyles });
    } catch (error: any) {
      console.error("Admin get user styles error:", error);
      res.status(500).json({ error: "Failed to get user unlocked styles" });
    }
  });

  app.post("/api/admin/users/:userId/revoke-style", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      const { styleId } = req.body;
      if (!styleId) {
        res.status(400).json({ error: "styleId is required" });
        return;
      }
      await storage.revokeUserStyle(userId, styleId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin revoke user style error:", error);
      res.status(500).json({ error: "Failed to revoke style" });
    }
  });

  app.post("/api/admin/users/:userId/revoke-all-styles", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      await storage.revokeAllUserStyles(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Admin revoke all user styles error:", error);
      res.status(500).json({ error: "Failed to revoke all styles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Export job recovery function for use on server startup
export { recoverStuckJobs };
