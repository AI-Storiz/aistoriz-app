/** A platform kill mid-step requeues the job. After this many kills, the job is failed and refunded once. */
export const MAX_COMIC_JOB_STALLS = 12;

type StallPayload = {
  storyPrompt: string;
  style: string;
  _checkpoint?: { v: 1; stalls?: number };
};

/** `null` means the worker should fail the job and refund credits once. */
export function requeuePayloadAfterStall(payload: unknown): StallPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as StallPayload;
  if (typeof row.storyPrompt !== "string" || typeof row.style !== "string") return null;
  const raw = row._checkpoint;
  const checkpoint = raw && raw.v === 1 ? raw : { v: 1 as const };
  const stalls = (checkpoint.stalls ?? 0) + 1;
  if (stalls > MAX_COMIC_JOB_STALLS) return null;
  checkpoint.stalls = stalls;
  return { ...row, _checkpoint: checkpoint };
}
