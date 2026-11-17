import { getApiUrl } from "@/lib/query-client";
import { dedupeIdenticalPreviewPages } from "@shared/previewPages";

export { dedupeIdenticalPreviewPages };

/** Shape passed to Preview / export after resolving panel URLs from the API. */
export interface ComicPreviewPagePayload {
  pageNumber: number;
  imageUrl: string;
  scenes?: { description: string; dialogue: string };
  panelImages: string[];
  panels?: Array<{ description: string; dialogue: string; cameraAngle?: string }>;
  pageType?: "cover" | "body" | "conclusion";
  generationMode?: string;
  /** 0-based index into stored `comic.pages` / `job.pages` (for merge after generation). */
  serverPageIndex: number;
  /** True for the extra hero cover row (first panel of the first multi-panel page). */
  syntheticCover?: boolean;
}

/** Persisted comic assets are public https URLs (S3 / CDN). Use as Image source — no base64, no proxy. */
function storedAssetHttps(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const t = url.trim();
  if (!t.startsWith("https://")) return null;
  return t;
}

/**
 * Loads comic metadata and prefers stored S3/CDN URLs for Preview.
 * Falls back to authenticated `/api/comics/.../image?token=` only when a slot has no https URL.
 */
export async function fetchComicPagesForPreview(
  comicId: string,
  token: string
): Promise<ComicPreviewPagePayload[] | null> {
  try {
    const response = await fetch(new URL(`/api/comics/${comicId}`, getApiUrl()).toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;

    const { comic: fullComic } = await response.json();
    const apiBase = getApiUrl();
    const apiPages: any[] = fullComic.pages || [];

    const panelImageHref = (pageIdx: number, panelIdx: number) => {
      const u = new URL(
        `/api/comics/${fullComic.id}/page/${pageIdx}/panel/${panelIdx}/image`,
        apiBase
      );
      u.searchParams.set("token", token);
      return u.toString();
    };

    const buildPagePayload = (page: any, index: number): ComicPreviewPagePayload => {
      const serverPageIndex = index;
      const panelCount = Number(page.panelCount) || 0;
      const rawPanels: string[] = Array.isArray(page.panelImages)
        ? page.panelImages.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
        : [];

      const mainFromPage =
        storedAssetHttps(page.imageUrl) ||
        storedAssetHttps(page.imageUri) ||
        null;

      let panelImages: string[];
      if (panelCount > 0) {
        panelImages = Array.from({ length: panelCount }, (_, panelIdx) => {
          const cell = rawPanels[panelIdx] ?? "";
          return storedAssetHttps(cell) || panelImageHref(serverPageIndex, panelIdx);
        });
      } else {
        panelImages = [];
      }

      const imageUrl =
        mainFromPage ||
        (panelImages.length > 0 ? panelImages[0]! : null) ||
        panelImageHref(serverPageIndex, -1);

      return {
        pageNumber: page.pageNumber,
        imageUrl,
        scenes: page.scenes,
        panelImages,
        panels: page.panels,
        pageType: page.pageType,
        generationMode: page.generationMode,
        serverPageIndex,
      };
    };

    const built = apiPages.map((page, index) => buildPagePayload(page, index));
    return dedupeIdenticalPreviewPages(built);
  } catch (e) {
    console.warn("fetchComicPagesForPreview failed:", e);
    return null;
  }
}
