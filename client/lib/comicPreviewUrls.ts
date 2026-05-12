import { getApiUrl } from "@/lib/query-client";

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

/**
 * Loads comic metadata and builds authenticated image URLs so Preview can render
 * from S3-backed `/api/comics/.../image` URLs (same mapping as History → Preview).
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
      const panelCount = page.panelCount || 0;
      const panelImages = Array.from({ length: panelCount }, (_, panelIdx) =>
        panelImageHref(serverPageIndex, panelIdx)
      );
      const imageUrl = panelImageHref(serverPageIndex, -1);
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

    const p0 = apiPages[0];
    const hasMultiPanelFirst = p0 != null && (Number(p0.panelCount) || 0) > 1;

    if (hasMultiPanelFirst) {
      const firstPanelHref = panelImageHref(0, 0);
      const firstPanel = Array.isArray(p0.panels) ? p0.panels[0] : undefined;
      const coverRow: ComicPreviewPagePayload = {
        pageNumber: 0,
        pageType: "cover",
        imageUrl: firstPanelHref,
        panelImages: [firstPanelHref],
        panels: firstPanel ? [firstPanel] : undefined,
        scenes: p0.scenes,
        generationMode: p0.generationMode,
        serverPageIndex: 0,
        syntheticCover: true,
      };
      // Avoid two "Cover" headers when the first stored page is already type "cover" but
      // the full grid is shown on the next row.
      const rest = built.map((row, i) => {
        if (i === 0 && p0.pageType === "cover") {
          return { ...row, pageType: "body" as const };
        }
        return row;
      });
      return [coverRow, ...rest];
    }

    return built;
  } catch (e) {
    console.warn("fetchComicPagesForPreview failed:", e);
    return null;
  }
}
