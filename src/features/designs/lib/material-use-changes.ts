import type { MaterialUse } from './records';

/**
 * Whether the visit changed any Material use: one added, one removed, or one
 * corrected. A use is identified by its id and compared by Material, colour,
 * and role; the order of the arrays does not matter. Pure, and typed without
 * the database, so the Edit reducer can read it.
 */
export function materialUsesChanged(
  before: readonly MaterialUse[],
  after: readonly MaterialUse[]
): boolean {
  if (before.length !== after.length) return true;

  const beforeById = new Map(before.map((use) => [use.id, use]));

  return after.some((use) => {
    const previous = beforeById.get(use.id);

    return (
      !previous ||
      previous.materialId !== use.materialId ||
      previous.colour !== use.colour ||
      previous.role !== use.role
    );
  });
}
