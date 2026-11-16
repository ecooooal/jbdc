import type { DesignFields } from './records';
import { SPECIFICATION_FIELDS, type SpecificationField } from './specification-fields';

/**
 * The text fields Edit drafts. Every one is a string on screen, even when the
 * stored value is null, so an untouched row and a cleared one read the same.
 */
export const DESIGN_TEXT_FIELDS = [
  'name',
  'description',
  ...SPECIFICATION_FIELDS.map((specification) => specification.field),
] as const;

export type DesignTextEditableField = (typeof DESIGN_TEXT_FIELDS)[number];

/** A field picked from a list writes the moment it is chosen; it is never drafted. */
export const DESIGN_CHOICE_FIELDS = ['categoryId', 'collectionId'] as const;

export type DesignChoiceEditableField = (typeof DESIGN_CHOICE_FIELDS)[number];

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
  ...DESIGN_TEXT_FIELDS,
  ...DESIGN_CHOICE_FIELDS,
] as const;

export type DesignEditableField = (typeof DESIGN_EDITABLE_FIELDS)[number];

/** What the owner has typed, before any of it is written. */
export type DesignDrafts = Record<DesignTextEditableField, string> & {
  categoryId: string | null;
  collectionId: string | null;
};

/** Seeds the drafts from a stored Design; a null optional field reads as empty. */
export function draftsFromFields(fields: DesignFields): DesignDrafts {
  const text = {} as Record<DesignTextEditableField, string>;

  for (const field of DESIGN_TEXT_FIELDS) {
    text[field] = fields[field] ?? '';
  }

  return { ...text, categoryId: fields.categoryId, collectionId: fields.collectionId };
}

const IDENTITY_FIELD_LABELS: Record<
  'name' | 'description' | 'categoryId' | 'collectionId',
  string
> = {
  name: 'Name',
  description: 'Description',
  categoryId: 'Category',
  collectionId: 'Collection',
};

const FIELD_LABELS: Record<DesignEditableField, string> = {
  ...IDENTITY_FIELD_LABELS,
  ...(Object.fromEntries(
    SPECIFICATION_FIELDS.map(({ field, label }) => [field, label])
  ) as Record<SpecificationField, string>),
};

/** The owner-facing label for an editable field, declared beside the field. */
export function designFieldLabel(field: DesignEditableField): string {
  return FIELD_LABELS[field];
}

const emptyText = Object.fromEntries(
  DESIGN_TEXT_FIELDS.map((field) => [field, ''])
) as Record<DesignTextEditableField, string>;

/** A visit before any read has landed: every draft empty and nothing saved. */
export const EMPTY_DESIGN_DRAFTS: DesignDrafts = {
  ...emptyText,
  categoryId: null,
  collectionId: null,
};

/** Whether the editable fields differ between two sets of values. */
export function designFieldsChanged(before: DesignFields, after: DesignFields): boolean {
  return DESIGN_EDITABLE_FIELDS.some((field) => before[field] !== after[field]);
}
