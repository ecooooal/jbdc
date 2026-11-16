import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database, DesignStatus } from '@/features/database';
import { designs } from '@/features/database';
import { readTaxonomyNames } from '@/features/taxonomy';
import { CREATIVE_DIRECTION_FIELDS } from './creative-direction-fields';
import { designFieldsChanged, type DesignEditableField } from './fields';
import { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';
import { normalizeOptionalText } from './optional-text';
import type { DesignSectionField } from './sections';
import { SPECIFICATION_FIELDS } from './specification-fields';

export { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';

/** A design as it is stored. Statuses and timestamps are never caller-supplied. */
export type Design = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
  silhouette: string | null;
  neckline: string | null;
  sleeveType: string | null;
  garmentDetails: string | null;
  sizeRange: string | null;
  measurements: string | null;
  constructionNotes: string | null;
  concept: string | null;
  mood: string | null;
  inspiration: string | null;
  intendedFeeling: string | null;
  audience: string | null;
  styling: string | null;
  palette: string | null;
  status: DesignStatus;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** The editable fields of a stored Design, from the one field list. Null means empty. */
export type DesignFields = Pick<Design, DesignEditableField>;

/** A new Design: a name is required, every other editable field is optional. */
export type CreateDesignInput = { name: string } & Partial<Omit<DesignFields, 'name'>>;

/**
 * A partial write: an absent field is left alone, while an explicit null
 * clears an optional one. A Specifications field clears just like description.
 * Status is never editable.
 */
export type UpdateDesignInput = Partial<DesignFields>;

/** A Design with the names Detail displays in place of its foreign keys. */
export type DesignDetail = Design & {
  category: string | null;
  collection: string | null;
};

export class InvalidDesignNameError extends Error {
  constructor(readonly reason: 'empty' | 'too_long') {
    super(
      reason === 'empty'
        ? 'A design needs a name.'
        : `A design name can be at most ${DESIGN_NAME_MAX_LENGTH} characters.`
    );
    this.name = 'InvalidDesignNameError';
  }
}

const designColumns = {
  id: designs.id,
  name: designs.name,
  description: designs.description,
  categoryId: designs.categoryId,
  collectionId: designs.collectionId,
  silhouette: designs.silhouette,
  neckline: designs.neckline,
  sleeveType: designs.sleeveType,
  garmentDetails: designs.garmentDetails,
  sizeRange: designs.sizeRange,
  measurements: designs.measurements,
  constructionNotes: designs.constructionNotes,
  concept: designs.concept,
  mood: designs.mood,
  inspiration: designs.inspiration,
  intendedFeeling: designs.intendedFeeling,
  audience: designs.audience,
  styling: designs.styling,
  palette: designs.palette,
  status: designs.status,
  createdAt: designs.createdAt,
  updatedAt: designs.updatedAt,
  deletedAt: designs.deletedAt,
};

/**
 * The values of one optional-text section a write would store, each trimmed;
 * whitespace alone is null. An absent field keeps the current value.
 */
function optionalTextValues<Field extends DesignSectionField>(
  fields: readonly { field: Field }[],
  current: Design | null,
  input: Partial<Record<Field, string | null | undefined>>
): Record<Field, string | null> {
  const values = {} as Record<Field, string | null>;

  for (const { field } of fields) {
    values[field] =
      input[field] === undefined
        ? (current?.[field] ?? null)
        : normalizeOptionalText(input[field]);
  }

  return values;
}

function normalizeName(raw: string): string {
  const name = raw.trim();
  const problem = designNameProblem(name);

  if (problem) throw new InvalidDesignNameError(problem);

  return name;
}

/**
 * Lowercased name, description, Specification, Creative direction, Category,
 * and Collection, rebuilt on every write. The taxonomy names are read from
 * their tables, so a rename lands in the search text the next time the design
 * is written.
 */
function buildSearchText(
  design: DesignFields,
  category: string | null,
  collection: string | null
): string {
  return [
    design.name,
    design.description,
    ...SPECIFICATION_FIELDS.map(({ field }) => design[field]),
    ...CREATIVE_DIRECTION_FIELDS.map(({ field }) => design[field]),
    category,
    collection,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** The names a Design's stored Category and Collection ids resolve to, or null. */
function designTaxonomyNames(
  database: Database,
  categoryId: string | null,
  collectionId: string | null
): { category: string | null; collection: string | null } {
  const names = readTaxonomyNames(database);

  return {
    category: categoryId ? (names.categories.get(categoryId) ?? null) : null,
    collection: collectionId ? (names.collections.get(collectionId)?.name ?? null) : null,
  };
}

/**
 * Writes one Design and returns it. A name is the only required input; a blank,
 * whitespace-only, or over-long name throws before anything is written. The
 * Category and Collection are optional and arrive as the ids the pickers chose;
 * the Specification and Creative direction fields are optional text.
 */
export function createDesign(
  database: Database,
  input: CreateDesignInput,
  now: number = Date.now()
): Design {
  const name = normalizeName(input.name);
  const description = normalizeOptionalText(input.description);
  const categoryId = input.categoryId ?? null;
  const collectionId = input.collectionId ?? null;
  const taxonomy = designTaxonomyNames(database, categoryId, collectionId);
  const design: Design = {
    id: database.newId(),
    name,
    description,
    categoryId,
    collectionId,
    ...optionalTextValues(SPECIFICATION_FIELDS, null, input),
    ...optionalTextValues(CREATIVE_DIRECTION_FIELDS, null, input),
    status: 'concept',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  database.db
    .insert(designs)
    .values({
      ...design,
      searchText: buildSearchText(design, taxonomy.category, taxonomy.collection),
    })
    .run();

  return design;
}

/**
 * Writes the fields the owner changed and returns the stored Design. An
 * absent field is untouched; null clears an optional one. A blank or
 * over-long name throws before anything is written, so the previous name
 * survives a refused save. A patch that changes nothing skips the write, so
 * the Updated timestamp only moves when the row does.
 */
export function updateDesign(
  database: Database,
  id: string,
  input: UpdateDesignInput,
  now: number = Date.now()
): Design | null {
  const current = getDesign(database, id);
  if (!current) return null;

  const specification = optionalTextValues(SPECIFICATION_FIELDS, current, input);
  const creativeDirection = optionalTextValues(CREATIVE_DIRECTION_FIELDS, current, input);
  const next: Design = {
    ...current,
    name: input.name === undefined ? current.name : normalizeName(input.name),
    description:
      input.description === undefined
        ? current.description
        : normalizeOptionalText(input.description),
    categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
    collectionId: input.collectionId === undefined ? current.collectionId : input.collectionId,
    ...specification,
    ...creativeDirection,
  };

  if (!designFieldsChanged(next, current)) return current;

  const taxonomy = designTaxonomyNames(database, next.categoryId, next.collectionId);

  next.updatedAt = now;
  database.db
    .update(designs)
    .set({
      name: next.name,
      description: next.description,
      categoryId: next.categoryId,
      collectionId: next.collectionId,
      ...specification,
      ...creativeDirection,
      updatedAt: next.updatedAt,
      searchText: buildSearchText(next, taxonomy.category, taxonomy.collection),
    })
    .where(eq(designs.id, id))
    .run();

  return next;
}

/** Reads one live Design; a soft-deleted row is gone as far as readers are concerned. */
export function getDesign(database: Database, id: string): Design | null {
  return (
    database.db
      .select(designColumns)
      .from(designs)
      .where(and(eq(designs.id, id), isNull(designs.deletedAt)))
      .get() ?? null
  );
}

/**
 * The Detail read: one live Design, without taxonomy names. Detail shows a
 * Design in any status, so unlike the Library it never filters by status.
 * Private to the feature, like the Library's query builder.
 */
export function designDetailQuery(database: Database, id: string) {
  return database.db
    .select(designColumns)
    .from(designs)
    .where(and(eq(designs.id, id), isNull(designs.deletedAt)));
}

/**
 * Reads one live Design for Detail, resolving its Category and Collection
 * through the taxonomy name read; null when it is unknown or soft-deleted.
 */
export function getDesignDetail(database: Database, id: string): DesignDetail | null {
  const design = designDetailQuery(database, id).get();

  if (!design) return null;

  return {
    ...design,
    ...designTaxonomyNames(database, design.categoryId, design.collectionId),
  };
}

/** All live Designs, most recently updated first. */
export function listDesigns(database: Database): Design[] {
  return database.db
    .select(designColumns)
    .from(designs)
    .where(isNull(designs.deletedAt))
    .orderBy(desc(designs.updatedAt))
    .all();
}
