import { randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pLimit from "p-limit";

const BUCKET = (process.env.COMIC_S3_BUCKET || "").trim();
const REGION = (process.env.COMIC_S3_REGION || process.env.AWS_REGION || "us-east-1").trim();
const PREFIX = (process.env.COMIC_S3_KEY_PREFIX || "comic-assets").replace(/^\/+|\/+$/g, "");

const UPLOAD_CONCURRENCY = (() => {
  const n = parseInt(process.env.COMIC_S3_CONCURRENCY || "16", 10);
  if (Number.isNaN(n) || n < 1) return 16;
  return Math.min(32, n);
})();

const FETCH_TIMEOUT_MS = 120_000;

/** Public base (CDN or S3 virtual-hosted) used in stored URLs — fixed at process start. */
const PUBLIC_BASE: string = (() => {
  const cdn = process.env.COMIC_CDN_BASE_URL?.replace(/\/$/, "");
  if (cdn) {
    return cdn;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
})();

const ALLOWED_ORIGINS: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  if (process.env.COMIC_CDN_BASE_URL) {
    try {
      s.add(new URL(process.env.COMIC_CDN_BASE_URL).origin);
    } catch {
      /* invalid URL ignored */
    }
  }
  if (BUCKET) {
    s.add(`https://${BUCKET}.s3.${REGION}.amazonaws.com`);
    s.add(`https://${BUCKET}.s3.amazonaws.com`);
  }
  return s;
})();

let s3: S3Client | null = null;

/**
 * When both are set, use them explicitly (trimmed). Trailing newlines in .env often break signing.
 * Otherwise the SDK uses the default provider chain (IAM role, instance profile, etc.).
 */
function getEnvAwsCredentials(): { accessKeyId: string; secretAccessKey: string } | undefined {
  const id = process.env.AWS_ACCESS_KEY_ID?.trim();
  const sec = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (id && sec) {
    return { accessKeyId: id, secretAccessKey: sec };
  }
  return undefined;
}

function getClient(): S3Client {
  if (!s3) {
    const credentials = getEnvAwsCredentials();
    s3 = new S3Client(
      credentials
        ? { region: REGION, credentials }
        : { region: REGION }
    );
  }
  return s3;
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
  if (!BUCKET) {
    throw new ComicS3Error("COMIC_S3_BUCKET is required", "S3_NOT_CONFIGURED");
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
    const res = await fetch(t, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
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
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      })
    );
  } catch (e) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "Error";
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : String(e);
    const meta =
      e && typeof e === "object" && "$metadata" in e
        ? (e as { $metadata?: { httpStatusCode?: number; requestId?: string } }).$metadata
        : undefined;
    const reqId = meta?.requestId ? ` requestId=${meta.requestId}` : "";
    const detail = `${name}: ${msg}${reqId}`.trim();
    console.error(`[comicS3] PutObject failed`, {
      bucket: BUCKET,
      key,
      region: REGION,
      name,
      message: msg,
      httpStatus: meta?.httpStatusCode,
      requestId: meta?.requestId,
    });
    throw new ComicS3Error("S3 upload failed", "INGEST_FAILED", detail);
  }
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
    region: REGION,
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

  await Promise.all(tasks);

  for (let pIdx = 0; pIdx < out.length; pIdx++) {
    assertPageFieldsAreAssetUrls(out[pIdx]!, pIdx);
  }

  return out;
}
