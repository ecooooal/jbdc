import type { MaterialUse } from './records';

/**
 * The uses the row holds now that the visit did not start with, in the order
 * they appear. A use is identified by its id, so one the visit added and then
 * corrected still counts as the same addition, and one it removed is absent.
 * Pure, and typed without the database, so the Edit reducer can read it.
 */
export function materialUsesAdded(
  before: readonly MaterialUse[],
  after: readonly MaterialUse[]
): MaterialUse[] {
  const known = new Set(before.map((use) => use.id));

  return after.filter((use) => !known.has(use.id));
}
