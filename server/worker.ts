import "dotenv/config";
import { waitUntil } from "@vercel/functions";

/**
 * Comic generation worker.
 *
 * `npm run worker` is the always-on process. On Vercel that process is never
 * started, so `scheduleComicWorker()` runs the same claim/lock path inside the
 * serverless invocation after a job is queued or polled.
 *
 * Set before the database module loads when this file is the process entry,
 * so the pg pool uses max=5. `npm run worker` relies on this assignment.
 */
function isWorkerCli(): boolean {
  return process.argv.some((arg) =>
    /[/\\]server[/\\]worker\.(ts|js)$/.test(arg),
  );
}

if (isWorkerCli()) {
  process.env.COMIC_WORKER = "1";
}

const DEFAULT_POLL_MS = 2000;
const DEFAULT_STALE_MS = 180_000;
const HEARTBEAT_MS = 30_000;

function pollMs(): number {
  const n = parseInt(process.env.WORKER_POLL_MS || String(DEFAULT_POLL_MS), 10);
  return Number.isFinite(n) && n >= 250 ? n : DEFAULT_POLL_MS;
}

function staleMs(): number {
  const n = parseInt(process.env.JOB_STALE_MS || String(DEFAULT_STALE_MS), 10);
  return Number.isFinite(n) && n >= 1000 ? n : DEFAULT_STALE_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ClaimedJob = {
  id: string;
  request_payload: unknown;
};

type WorkerDeps = {
  db: typeof import("./db").db;
  comicJobs: typeof import("../shared/schema").comicJobs;
  storage: typeof import("./storage").storage;
  processComicJob: typeof import("./routes").processComicJob;
  refundCreditsForFailedJob: typeof import("./routes").refundCreditsForFailedJob;
  ensureAiSettingsLoaded: typeof import("./routes").ensureAiSettingsLoaded;
  waitForDatabase: typeof import("./db").waitForDatabase;
  and: typeof import("drizzle-orm").and;
  eq: typeof import("drizzle-orm").eq;
  isNull: typeof import("drizzle-orm").isNull;
  lt: typeof import("drizzle-orm").lt;
  or: typeof import("drizzle-orm").or;
  sql: typeof import("drizzle-orm").sql;
};

let depsPromise: Promise<WorkerDeps> | null = null;

function loadDeps(): Promise<WorkerDeps> {
  if (!depsPromise) {
    depsPromise = (async () => {
      const { and, eq, isNull, lt, or, sql } = await import("drizzle-orm");
      const { db, waitForDatabase } = await import("./db");
      const { comicJobs } = await import("../shared/schema");
      const { storage } = await import("./storage");
      const { ensureAiSettingsLoaded, processComicJob, refundCreditsForFailedJob } = await import(
        "./routes"
      );
      return {
        db,
        comicJobs,
        storage,
        processComicJob,
        refundCreditsForFailedJob,
        ensureAiSettingsLoaded,
        waitForDatabase,
        and,
        eq,
        isNull,
        lt,
        or,
        sql,
      };
    })();
  }
  return depsPromise;
}

function isGeneratePayload(
  value: unknown,
): value is {
  storyPrompt: string;
  style: string;
  characters: Array<{ name: string; type: string; imageUri?: string; description?: string }>;
  pagesCount: number;
  scenesPerPage: number;
  title?: string;
  language?: string;
} {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.storyPrompt === "string" && typeof row.style === "string";
}

async function abandonProcessingJob(
  deps: WorkerDeps,
  jobId: string,
  message: string,
  staleCutoff?: Date,
): Promise<void> {
  const { and, eq, isNull, lt, or, db, comicJobs, storage, refundCreditsForFailedJob } = deps;
  const staleClause =
    staleCutoff !== undefined
      ? or(isNull(comicJobs.heartbeatAt), lt(comicJobs.heartbeatAt, staleCutoff))
      : undefined;

  const updated = await db
    .update(comicJobs)
    .set({
      status: "failed",
      error: message,
      pages: [],
      updatedAt: new Date(),
    })
    .where(
      staleClause
        ? and(eq(comicJobs.id, jobId), eq(comicJobs.status, "processing"), staleClause)
        : and(eq(comicJobs.id, jobId), eq(comicJobs.status, "processing")),
    )
    .returning({
      id: comicJobs.id,
      userId: comicJobs.userId,
      libraryComicId: comicJobs.libraryComicId,
      progress: comicJobs.progress,
      pagesCount: comicJobs.pagesCount,
      title: comicJobs.title,
      style: comicJobs.style,
      createdAt: comicJobs.createdAt,
    });
  if (updated.length === 0) return;

  const job = updated[0]!;
  const draftId = job.libraryComicId;
  if (draftId != null) {
    await db
      .update(comicJobs)
      .set({ libraryComicId: null, updatedAt: new Date() })
      .where(eq(comicJobs.id, jobId));
  }

  if (job.userId && draftId != null) {
    await storage.deleteUserComic(draftId, job.userId).catch(() => {
      /* draft row may already be gone */
    });
  }

  await refundCreditsForFailedJob({
    id: job.id,
    userId: job.userId ?? undefined,
    status: "failed",
    progress: job.progress,
    pages: [],
    pagesCount: job.pagesCount ?? undefined,
    title: job.title ?? undefined,
    style: job.style ?? undefined,
    createdAt: new Date(job.createdAt).getTime(),
  });
}

async function failStaleJobs(deps: WorkerDeps): Promise<void> {
  const { and, eq, isNull, lt, or, db, comicJobs } = deps;
  const cutoff = new Date(Date.now() - staleMs());
  const stale = await db
    .select({ id: comicJobs.id, heartbeatAt: comicJobs.heartbeatAt })
    .from(comicJobs)
    .where(
      and(
        eq(comicJobs.status, "processing"),
        or(isNull(comicJobs.heartbeatAt), lt(comicJobs.heartbeatAt, cutoff)),
      ),
    );

  for (const job of stale) {
    console.log(`[worker] Stale job ${job.id} (heartbeat ${job.heartbeatAt?.toISOString() ?? "none"})`);
    await abandonProcessingJob(deps, job.id, "Generation stalled. Please try again.", cutoff);
  }
}

async function claimPendingJob(deps: WorkerDeps): Promise<ClaimedJob | null> {
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
  const rows = result.rows as ClaimedJob[];
  return rows[0] ?? null;
}

async function runClaimedJob(deps: WorkerDeps, claimed: ClaimedJob): Promise<void> {
  if (!isGeneratePayload(claimed.request_payload)) {
    console.error(`[worker] Job ${claimed.id} has no generation payload`);
    await abandonProcessingJob(deps, claimed.id, "Generation request was missing. Please try again.");
    return;
  }

  console.log(`[worker] Claimed job ${claimed.id}`);

  const beat = setInterval(() => {
    void deps.db
      .update(deps.comicJobs)
      .set({ heartbeatAt: new Date() })
      .where(deps.eq(deps.comicJobs.id, claimed.id))
      .catch((error) => {
        console.error(`[worker] Heartbeat failed for ${claimed.id}:`, error);
      });
  }, HEARTBEAT_MS);

  try {
    await deps.processComicJob(claimed.id, claimed.request_payload);
  } catch (error) {
    console.error(`[worker] Job ${claimed.id} crashed:`, error);
    await abandonProcessingJob(deps, claimed.id, "Generation failed. Please try again.");
  } finally {
    clearInterval(beat);
  }
}

/** Claim and finish every currently pending job, then return. */
async function drainComicJobs(): Promise<void> {
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
  for (;;) {
    const claimed = await claimPendingJob(deps);
    if (!claimed) return;
    await runClaimedJob(deps, claimed);
  }
}

let activePass: Promise<void> | null = null;

/**
 * Start one worker pass if one is not already running in this instance.
 * On Vercel the pass continues after the HTTP response, up to maxDuration.
 * Concurrent callers cannot claim the same row: the claim uses FOR UPDATE SKIP LOCKED.
 */
export function scheduleComicWorker(): void {
  if (activePass) return;
  const task = drainComicJobs()
    .catch((error) => {
      console.error("[worker] Pass failed:", error);
    })
    .finally(() => {
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

async function main(): Promise<void> {
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

  for (;;) {
    try {
      await failStaleJobs(deps);
      const claimed = await claimPendingJob(deps);
      if (!claimed) {
        await sleep(pollMs());
        continue;
      }
      await runClaimedJob(deps, claimed);
    } catch (error) {
      console.error("[worker] Loop error:", error);
      await sleep(pollMs());
    }
  }
}

if (isWorkerCli()) {
  void main().catch((error) => {
    console.error("[worker] Fatal:", error);
    process.exit(1);
  });
}
