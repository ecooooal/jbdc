import type { MaterialUse } from './records';

/**
 * The uses the row holds now that the visit did not start with, in the order
 * they were added. A use is only ever added in this slice, so a removal cannot
 * appear here. Pure, and typed without the database, so the Edit reducer can
 * read it.
 */
export function materialUsesAdded(
  before: readonly MaterialUse[],
  after: readonly MaterialUse[]
): MaterialUse[] {
  const known = new Set(before.map((use) => use.id));

  return after.filter((use) => !known.has(use.id));
}
