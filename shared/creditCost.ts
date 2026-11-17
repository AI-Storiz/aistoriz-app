/** Page counts the create screen can request. */
export const MAX_COMIC_PAGES = 12;

/**
 * Shared by the app and the API so the price on screen, the balance check,
 * and the deduction use one formula: first page is baseCost, each later page
 * adds costPerPage.
 */
export function parseComicPageCount(value: unknown): number | null {
  const pages =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_COMIC_PAGES) {
    return null;
  }
  return pages;
}

export function comicCreditCost(baseCost: number, costPerPage: number, pages: number): number {
  return baseCost + Math.max(0, pages - 1) * costPerPage;
}
