/**
 * Drop a following page only when it is the same single image already shown.
 * Multi-panel pages stay so a real multi-image comic is not collapsed.
 */
export function dedupeIdenticalPreviewPages<T extends { imageUrl?: string; panelImages?: string[] }>(
  pages: T[],
): T[] {
  const out: T[] = [];
  for (const page of pages) {
    const previous = out[out.length - 1];
    const pagePanels = (page.panelImages || []).filter((url) => url && url.trim());
    const previousPanels = (previous?.panelImages || []).filter((url) => url && url.trim());
    const sameSingleImage =
      previous != null &&
      pagePanels.length <= 1 &&
      previousPanels.length <= 1 &&
      !!page.imageUrl &&
      page.imageUrl === previous.imageUrl;
    if (sameSingleImage) continue;
    out.push(page);
  }
  return out;
}

type StoredComicPage = {
  imageUrl?: string;
  imageUri?: string;
  panelImages?: string[];
};

function firstStoredImage(page: StoredComicPage): string {
  const direct = page.imageUrl?.trim() || page.imageUri?.trim() || "";
  if (direct) return direct;
  const panel = (page.panelImages || []).find((url) => typeof url === "string" && url.trim());
  return panel?.trim() || "";
}

/**
 * A one-page comic is one stored image. Extra pages and repeated panel copies
 * are dropped here, before the row is written. Multi-page comics are unchanged.
 */
export function pagesForRequestedCount<T extends StoredComicPage>(
  pages: T[],
  requestedCount: number | null | undefined,
): T[] {
  if (requestedCount !== 1) return pages;
  const source = pages.find((page) => firstStoredImage(page)) ?? pages[0];
  if (!source) return [];
  const image = firstStoredImage(source);
  if (!image) return [source];
  return [{
    ...source,
    imageUrl: image,
    imageUri: "",
    panelImages: [image],
  }];
}
