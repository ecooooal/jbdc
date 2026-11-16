import type { DesignFields } from './records';

/**
 * The fields Edit can change, in the order History lists them. Status,
 * timestamps, and Images are not editable here. This is the one declaration:
 * `DesignFields` is a `Pick` of `Design`, so a listed field must be a stored
 * one, and the patch types and the History diff are both derived from it.
 *
 * The module has no runtime import, so a reducer can read the list: importing
 * `./records` would drag the database into the reducer's import graph.
 */
export const DESIGN_EDITABLE_FIELDS = [
  'name',
  'description',
  'categoryId',
  'collectionId',
] as const;

export type DesignEditableField = (typeof DESIGN_EDITABLE_FIELDS)[number];

/** Whether the editable fields differ between two sets of values. */
export function designFieldsChanged(before: DesignFields, after: DesignFields): boolean {
  return DESIGN_EDITABLE_FIELDS.some((field) => before[field] !== after[field]);
}
