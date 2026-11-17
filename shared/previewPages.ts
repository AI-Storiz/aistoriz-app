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
