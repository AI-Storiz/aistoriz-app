/** Saved library rows shown in History. Drafts and other users' rows stay. */
export function savedHistoryDeleteMatch(
  comicUserId: string,
  isDraft: boolean,
  requesterId: string,
): boolean {
  return comicUserId === requesterId && isDraft === false;
}

export function partitionSavedHistory<T extends { userId: string; isDraft: boolean }>(
  rows: T[],
  requesterId: string,
): { removed: T[]; kept: T[] } {
  const removed: T[] = [];
  const kept: T[] = [];
  for (const row of rows) {
    if (savedHistoryDeleteMatch(row.userId, row.isDraft, requesterId)) removed.push(row);
    else kept.push(row);
  }
  return { removed, kept };
}

/** A fetch that started before Clear History must not write those comics back. */
export function shouldApplyHistoryFetch(currentRevision: number, startedRevision: number): boolean {
  return currentRevision === startedRevision;
}
