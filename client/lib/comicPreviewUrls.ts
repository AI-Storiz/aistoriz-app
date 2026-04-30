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
}

/**
 * Loads comic metadata and builds authenticated image URLs so Preview can render
 * without keeping base64 `data:` payloads in memory (same mapping as History → Preview).
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

    const panelImageHref = (pageIdx: number, panelIdx: number) => {
      const u = new URL(
        `/api/comics/${fullComic.id}/page/${pageIdx}/panel/${panelIdx}/image`,
        apiBase
      );
      u.searchParams.set("token", token);
      return u.toString();
    };

    // 0-based index into `userComics.pages` (jsonb array); must match storage.getComicPanelImage.
    return (fullComic.pages || []).map((page: any, index: number) => {
      const safePageIdx = index;
      const panelImages = Array.from({ length: page.panelCount || 0 }, (_, panelIdx) =>
        panelImageHref(safePageIdx, panelIdx)
      );
      const imageUrl = page.hasImageUrl
        ? panelImageHref(safePageIdx, -1)
        : panelImages.length > 0
          ? panelImages[0]
          : panelImageHref(safePageIdx, -1);

      return {
        pageNumber: page.pageNumber,
        imageUrl,
        scenes: page.scenes,
        panelImages,
        panels: page.panels,
        pageType: page.pageType,
        generationMode: page.generationMode,
      };
    });
  } catch (e) {
    console.warn("fetchComicPagesForPreview failed:", e);
    return null;
  }
}
