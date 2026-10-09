export const TRANSIENT_ATTEMPT_CAP = 3;

export type TransientAttempts = Record<string, number>;

export function pageHasDisplayImage(page: unknown): boolean {
  if (!page || typeof page !== "object") return false;
  const row = page as { imageUrl?: unknown; panelImages?: unknown };
  if (typeof row.imageUrl === "string" && row.imageUrl.trim()) return true;
  return Array.isArray(row.panelImages) &&
    row.panelImages.some((image) => typeof image === "string" && image.trim().length > 0);
}

/** A comic is complete only when every requested page has saved image data. */
export function comicPagesAreComplete(pages: unknown, requiredCount: number): boolean {
  if (!Array.isArray(pages) || requiredCount < 1 || pages.length < requiredCount) return false;
  for (let pageNumber = 1; pageNumber <= requiredCount; pageNumber += 1) {
    const page = pages.find((candidate) => {
      if (!candidate || typeof candidate !== "object") return false;
      return (candidate as { pageNumber?: unknown }).pageNumber === pageNumber;
    });
    if (!pageHasDisplayImage(page)) return false;
  }
  return true;
}

export function httpStatusFromError(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = message.match(/\b(?:HTTP\s*)?\(?\b(429|5\d\d)\b\)?/i);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

export function isTransientGenerationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNABORTED|UND_ERR|socket hang up/i.test(message)) {
    return true;
  }
  const status = httpStatusFromError(error);
  return status === 429 || (status != null && status >= 500 && status <= 504);
}

export function noteTransientAttempt(
  attempts: TransientAttempts | undefined,
  key: string,
): { attempts: TransientAttempts; count: number; retry: boolean } {
  const next = { ...(attempts ?? {}) };
  const count = (next[key] ?? 0) + 1;
  next[key] = count;
  return { attempts: next, count, retry: count < TRANSIENT_ATTEMPT_CAP };
}

export function transientFailureMessage(step: string, error: unknown, attempts: number): string {
  const status = httpStatusFromError(error);
  const statusText = status ? ` (HTTP ${status})` : "";
  return `Gemini could not finish ${step} after ${attempts} attempts${statusText}. Please try again later.`;
}

export type ViewerStoryDialogue = { character: string; text: string };

export type ViewerStoryPage = {
  pageNumber: number;
  pageType?: string;
  narration: string;
  dialogues: ViewerStoryDialogue[];
};

export type ViewerStory = {
  title?: string;
  pages: ViewerStoryPage[];
};

function storyText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Story text lives on `request_payload._checkpoint.story`, not on page image URLs.
 * Image-less pages are kept so a failed image call can still be read.
 */
export function storyTextForViewer(payload: unknown): ViewerStory | null {
  if (!payload || typeof payload !== "object") return null;
  const story = (payload as { _checkpoint?: { story?: unknown } })._checkpoint?.story;
  if (!story || typeof story !== "object") return null;
  const raw = story as { title?: unknown; pages?: unknown };
  const pagesIn = Array.isArray(raw.pages) ? raw.pages : [];
  const pages: ViewerStoryPage[] = [];
  for (const page of pagesIn) {
    if (!page || typeof page !== "object") continue;
    const row = page as { pageNumber?: unknown; pageType?: unknown; narration?: unknown; dialogues?: unknown };
    const dialogues = Array.isArray(row.dialogues)
      ? row.dialogues.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const dialogue = item as { character?: unknown; text?: unknown };
          const character = storyText(dialogue.character);
          const text = storyText(dialogue.text);
          if (!character && !text) return [];
          return [{ character, text }];
        })
      : [];
    pages.push({
      pageNumber: typeof row.pageNumber === "number" && row.pageNumber > 0 ? row.pageNumber : pages.length + 1,
      ...(typeof row.pageType === "string" && row.pageType ? { pageType: row.pageType } : {}),
      narration: storyText(row.narration),
      dialogues,
    });
  }
  const title = storyText(raw.title);
  if (!title && pages.length === 0) return null;
  return { ...(title ? { title } : {}), pages };
}
