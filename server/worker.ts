import "dotenv/config";

/**
 * Always-on comic generation worker.
 * Set before the database module loads so the pg pool uses max=5.
 * `npm run worker` also sets COMIC_WORKER via cross-env.
 */
process.env.COMIC_WORKER = "1";

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

async function main(): Promise<void> {
  const { and, eq, isNull, lt, or, sql } = await import("drizzle-orm");
  const { db, waitForDatabase } = await import("./db");
  const { comicJobs } = await import("../shared/schema");
  const { storage } = await import("./storage");
  const { ensureAiSettingsLoaded, processComicJob, refundCreditsForFailedJob } = await import(
    "./routes"
  );

  const ready = await waitForDatabase();
  if (!ready) {
    console.error("[worker] Database unavailable. Exiting.");
    process.exit(1);
  }

  try {
    await ensureAiSettingsLoaded();
  } catch (error) {
    console.error("[worker] Failed to load AI settings:", error);
    process.exit(1);
  }

  console.log("[worker] Comic generation worker started");

  async function abandonProcessingJob(
    jobId: string,
    message: string,
    staleCutoff?: Date,
  ): Promise<void> {
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

  async function failStaleJobs(): Promise<void> {
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
      await abandonProcessingJob(job.id, "Generation stalled. Please try again.", cutoff);
    }
  }

  async function claimPendingJob(): Promise<ClaimedJob | null> {
    const result = await db.execute(sql`
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

  for (;;) {
    try {
      await failStaleJobs();
      const claimed = await claimPendingJob();
      if (!claimed) {
        await sleep(pollMs());
        continue;
      }

      if (!isGeneratePayload(claimed.request_payload)) {
        console.error(`[worker] Job ${claimed.id} has no generation payload`);
        await abandonProcessingJob(claimed.id, "Generation request was missing. Please try again.");
        continue;
      }

      const beat = setInterval(() => {
        void db
          .update(comicJobs)
          .set({ heartbeatAt: new Date() })
          .where(eq(comicJobs.id, claimed.id))
          .catch((error) => {
            console.error(`[worker] Heartbeat failed for ${claimed.id}:`, error);
          });
      }, HEARTBEAT_MS);

      try {
        await processComicJob(claimed.id, claimed.request_payload);
      } catch (error) {
        console.error(`[worker] Job ${claimed.id} crashed:`, error);
        await abandonProcessingJob(
          claimed.id,
          "Generation failed. Please try again.",
        );
      } finally {
        clearInterval(beat);
      }
    } catch (error) {
      console.error("[worker] Loop error:", error);
      await sleep(pollMs());
    }
  }
}

void main().catch((error) => {
  console.error("[worker] Fatal:", error);
  process.exit(1);
});
