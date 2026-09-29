import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pLimit from "p-limit";

const BUCKET = (process.env.COMIC_STORAGE_BUCKET || "").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const PREFIX = (process.env.COMIC_S3_KEY_PREFIX || "comic-assets").replace(/^\/+|\/+$/g, "");

const UPLOAD_CONCURRENCY = (() => {
  const n = parseInt(process.env.COMIC_S3_CONCURRENCY || "16", 10);
  if (Number.isNaN(n) || n < 1) return 16;
  return Math.min(32, n);
})();

const FETCH_TIMEOUT_MS = 120_000;
const REMOTE_SOURCE_FETCH_ATTEMPTS = 3;
const REMOTE_SOURCE_FETCH_RETRY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetches a provider image URL with short retries (transient CDN / TLS / 5xx). */
async function fetchRemoteImageForIngest(url: string): Promise<Response> {
  let lastErr: unknown;
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

/** Public base used in newly stored URLs — Supabase public object URL, fixed at process start. */
const PUBLIC_BASE: string = SUPABASE_URL && BUCKET
  ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
  : "";

function addOrigin(set: Set<string>, raw: string | undefined): void {
  const t = (raw ?? "").trim();
  if (!t) return;
  try {
    set.add(new URL(t).origin);
  } catch {
    /* invalid URL ignored */
  }
}

const ALLOWED_ORIGINS: ReadonlySet<string> = (() => {
  const s = new Set<string>();
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

let supabase: SupabaseClient | null = null;

function storageHost(): string {
  if (!SUPABASE_URL) return "";
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return "";
  }
}

function getClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

export class ComicS3Error extends Error {
  constructor(
    message: string,
    public readonly code: "S3_NOT_CONFIGURED" | "INGEST_FAILED" = "INGEST_FAILED",
    /** Filled for PutObject failures; shown in API only when not production or COMIC_S3_DEBUG=1 */
    public readonly details?: string
  ) {
    super(message);
    this.name = "ComicS3Error";
  }
}

/**
 * JSON for API responses. Includes `details` in development or when COMIC_S3_DEBUG=1
 * (never in production by default) so you can see real AWS error names/messages in the app console.
 */
export function comicS3ErrorPayload(
  err: ComicS3Error
): { error: string; code: string; details?: string } {
  const out: { error: string; code: string; details?: string } = {
    error: err.message,
    code: err.code,
  };
  const expose =
    err.details &&
    (process.env.COMIC_S3_DEBUG === "1" || process.env.NODE_ENV !== "production");
  if (expose) {
    out.details = err.details;
  }
  return out;
}

export function assertComicS3Configured(): void {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !BUCKET) {
    throw new ComicS3Error(
      "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and COMIC_STORAGE_BUCKET are required",
      "S3_NOT_CONFIGURED",
    );
  }
}

function publicObjectUrl(key: string): string {
  return `${PUBLIC_BASE}/${key}`;
}

/**
 * True if empty (no asset). Non-empty: must be `https` and its origin in `ALLOWED_ORIGINS`.
 * Uses cached set — safe for the hot path on image redirects.
 */
export function isComicAssetUrl(url: string): boolean {
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

/**
 * Deep copy of comic `pages` JSON where any image field that is not an app S3/CDN https URL
 * is replaced with `""` so we never persist or return `data:` URIs or untrusted remote URLs.
 */
export function stripNonAssetImagesFromComicPagesJson(pages: unknown): unknown[] {
  if (!Array.isArray(pages)) {
    return [];
  }
  return pages.map((raw) => {
    if (raw == null || typeof raw !== "object") {
      return raw;
    }
    const src = raw as Record<string, unknown>;
    const p = { ...src };
    for (const key of ["imageUrl", "imageUri"] as const) {
      const v = p[key];
      if (typeof v === "string" && v.trim() && !isComicAssetUrl(v)) {
        p[key] = "";
      }
    }
    const pan = p.panelImages;
    if (Array.isArray(pan)) {
      p.panelImages = pan.map((cell) =>
        typeof cell === "string" && cell.trim() && !isComicAssetUrl(cell) ? "" : cell
      );
    }
    return p;
  });
}

/**
 * Upload a character profile / reference photo (data URI or http(s) URL) to the comic assets bucket.
 * Returns a public asset URL, or `""` for empty input. Existing app asset URLs are returned unchanged.
 */
export async function uploadCharacterPhotoToS3OrThrow(userId: string, imageData: string): Promise<string> {
  assertComicS3Configured();
  const t = (imageData ?? "").trim();
  if (t.length === 0) {
    return "";
  }
  if (isOnOurStorageHttps(t)) {
    return t;
  }

  const subPath = `photo-${randomBytes(10).toString("hex")}`;

  let body: Buffer;
  let contentType: string;
  let ext: string;

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

function isOnOurStorageHttps(url: string): boolean {
  const t = url.trim();
  if (t.length === 0) {
    return true;
  }
  if (!t.startsWith("https://")) {
    return false;
  }
  for (const origin of ALLOWED_ORIGINS) {
    if (t === origin || t.startsWith(origin + "/")) {
      return true;
    }
  }
  return false;
}

function mediaReferenceNeedsS3Upload(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !isOnOurStorageHttps(value);
}

/**
 * True when any non-empty image field is not already stored on this app’s S3 / CDN
 * (still inline `data:`, `http:`, or third-party `https:`).
 */
export function comicPagesNeedS3Ingest(pages: unknown): boolean {
  if (!Array.isArray(pages)) {
    return false;
  }
  for (const raw of pages) {
    if (raw == null || typeof raw !== "object") {
      continue;
    }
    const o = raw as Record<string, unknown>;
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

function extFromContentType(contentType: string | undefined, fallback: string): string {
  if (!contentType) return fallback;
  const c = contentType.toLowerCase().split(";")[0]!.trim();
  if (c === "image/jpeg" || c === "image/jpg") return "jpg";
  if (c === "image/png") return "png";
  if (c === "image/webp") return "webp";
  if (c === "image/gif") return "gif";
  return fallback;
}

function bufferFromDataUri(
  dataUri: string
): { buffer: Buffer; contentType: string; ext: string } {
  const m = dataUri.trim().match(/^data:image\/([\w.+-]+);base64,([\s\S]*)$/i);
  if (!m) {
    throw new ComicS3Error("Invalid data URI (expected data:image/...;base64,)");
  }
  const subtype = m[1]!.toLowerCase();
  const b64 = m[2]!.replace(/\s/g, "");
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
    ext: extFromContentType(contentType, "png"),
  };
}

type ComicPageRecord = Record<string, unknown> & {
  imageUrl?: string;
  imageUri?: string;
  panelImages?: string[];
};

async function uploadComicFieldToS3OrThrow(
  userId: string,
  comicId: number,
  pageIndex: number,
  fieldKey: string,
  imageData: string
): Promise<string> {
  const t = imageData.trim();
  if (t.length === 0) {
    return "";
  }
  if (isOnOurStorageHttps(t)) {
    return t;
  }

  const subPath = `p${pageIndex}-${fieldKey}-${randomBytes(8).toString("hex")}`;

  let body: Buffer;
  let contentType: string;
  let ext: string;

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

async function putS3ObjectOrThrow(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl: string
): Promise<void> {
  const { error } = await getClient().storage.from(BUCKET).upload(key, body, {
    contentType,
    cacheControl,
    upsert: false,
  });
  if (!error) return;
  const detail = `${error.name || "StorageError"}: ${error.message}`.trim();
  console.error(`[comicS3] Storage upload failed`, {
    bucket: BUCKET,
    key,
    name: error.name,
    message: error.message,
  });
  throw new ComicS3Error("S3 upload failed", "INGEST_FAILED", detail);
}

const PING_PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8l8kAAAAASUVORK5CYII=",
  "base64"
);

/** 1×1 PNG to `{COMIC_S3_KEY_PREFIX}/_s3_test/{userId}/ping-*.png` — used by `POST /api/test-s3` only. */
export async function uploadTestPngToS3(userId: string): Promise<{
  key: string;
  url: string;
  durationMs: number;
  bucket: string;
  region: string;
}> {
  assertComicS3Configured();
  const t0 = Date.now();
  const key = `${PREFIX}/_s3_test/${userId}/ping-${t0}.png`;
  await putS3ObjectOrThrow(key, PING_PNG_1X1, "image/png", "public, max-age=60");
  return {
    key,
    url: publicObjectUrl(key),
    durationMs: Date.now() - t0,
    bucket: BUCKET,
    region: storageHost(),
  };
}

function assertPageFieldsAreAssetUrls(page: ComicPageRecord, pageIndex: number): void {
  const requireUrl = (field: string, val: unknown) => {
    if (val == null || val === "") return;
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
    if (cell == null) continue;
    if (typeof cell !== "string") {
      throw new ComicS3Error(`Page ${pageIndex} panelImages[${i}]: string URL required`);
    }
    if (cell.trim() && !isComicAssetUrl(cell)) {
      throw new ComicS3Error(`Page ${pageIndex} panelImages[${i}]: S3/ CDN https URL required`);
    }
  }
}

/**
 * Enforces that persisted comic JSON never stores `data:` URIs or arbitrary HTTPS URLs —
 * only empty strings or HTTPS URLs on this app’s configured S3 / CDN origin.
 * Call immediately before writing `user_comics.pages` or `comic_jobs.pages`.
 */
export function assertPersistedComicPagesAreAssetUrlsOnly(pages: unknown, context: string): void {
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
    assertPageFieldsAreAssetUrls(raw as ComicPageRecord, i);
  }
}

/**
 * True when the page has no usable image URL (S3) or panel cells — often a failed cover
 * that was still persisted as the first array element, shifting all real art to [1], [2], …
 */
function comicPageIsImageEmpty(p: unknown): boolean {
  if (p == null || typeof p !== "object") {
    return true;
  }
  const o = p as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (str(o.imageUrl) || str(o.imageUri)) {
    return false;
  }
  const pan = o.panelImages;
  if (!Array.isArray(pan)) {
    return true;
  }
  return !pan.some((c) => typeof c === "string" && c.trim().length > 0);
}

/**
 * Remove leading empty pages and renumber `pageNumber` 1..n. Safe to call on save and on read
 * to repair old rows.
 */
export function normalizeComicPagesOrder(pages: unknown[]): { pages: unknown[]; changed: boolean } {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { pages, changed: false };
  }
  const out: unknown[] = [...pages];
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
    return { ...(p as object), pageNumber: idx + 1 };
  });
  return { pages: renumbered, changed: true };
}

/**
 * Ingests every image field in parallel (bounded by `COMIC_S3_CONCURRENCY`, default 16).
 * Returned pages only contain `https` URLs for this app’s S3/ CDN.
 */
export async function ingestComicPagesToS3(
  userId: string,
  comicId: number,
  pages: unknown
): Promise<ComicPageRecord[]> {
  assertComicS3Configured();
  if (!Array.isArray(pages)) {
    throw new ComicS3Error("comic `pages` must be an array");
  }

  const out: ComicPageRecord[] = [];
  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const raw = pages[pIdx];
    if (raw == null || typeof raw !== "object") {
      throw new ComicS3Error(`Page ${pIdx} must be an object`);
    }
    out.push({ ...raw } as ComicPageRecord);
  }

  const limit = pLimit(UPLOAD_CONCURRENCY);
  const tasks: Promise<void>[] = [];

  for (let pIdx = 0; pIdx < out.length; pIdx++) {
    const page = out[pIdx]!;

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
        if (cell == null) continue;
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
      assertPageFieldsAreAssetUrls(out[pIdx]!, pIdx);
    }
    return out;
  }

  await Promise.all(tasks);

  for (let pIdx = 0; pIdx < out.length; pIdx++) {
    assertPageFieldsAreAssetUrls(out[pIdx]!, pIdx);
  }

  return out;
}
