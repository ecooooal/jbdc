import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Database, DesignStatus } from '@/features/database';
import { categories, collections, designs } from '@/features/database';
import { normalizeDescription } from './description';
import type { DesignEditableField } from './fields';
import { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';

export { DESIGN_NAME_MAX_LENGTH, designNameProblem } from './limits';

/** A design as it is stored. Statuses and timestamps are never caller-supplied. */
export type Design = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  collectionId: string | null;
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
 * clears the description, Category, or Collection. Status is never editable.
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
  status: designs.status,
  createdAt: designs.createdAt,
  updatedAt: designs.updatedAt,
  deletedAt: designs.deletedAt,
};

function normalizeName(raw: string): string {
  const name = raw.trim();
  const problem = designNameProblem(name);

  if (problem) throw new InvalidDesignNameError(problem);

  return name;
}

/**
 * Lowercased name, description, Category, and Collection, rebuilt on every
 * write. The taxonomy names are read from their tables, so a rename lands in
 * the search text the next time the design is written.
 */
function buildSearchText(
  name: string,
  description: string | null,
  category: string | null,
  collection: string | null
): string {
  return [name, description, category, collection].filter(Boolean).join(' ').toLowerCase();
}

/** The name of a Category or Collection the form selected, or null for none. */
function taxonomyName(
  database: Database,
  table: typeof categories | typeof collections,
  id: string | null
): string | null {
  if (!id) return null;

  return (
    database.db
      .select({ name: table.name })
      .from(table)
      .where(eq(table.id, id))
      .get()?.name ?? null
  );
}

/**
 * Writes one Design and returns it. A name is the only required input; a blank,
 * whitespace-only, or over-long name throws before anything is written. The
 * Category and Collection are optional and arrive as the ids the pickers chose.
 */
export function createDesign(
  database: Database,
  input: CreateDesignInput,
  now: number = Date.now()
): Design {
  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description);
  const categoryId = input.categoryId ?? null;
  const collectionId = input.collectionId ?? null;
  const design: Design = {
    id: database.newId(),
    name,
    description,
    categoryId,
    collectionId,
    status: 'concept',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  database.db
    .insert(designs)
    .values({
      ...design,
      searchText: buildSearchText(
        name,
        description,
        taxonomyName(database, categories, categoryId),
        taxonomyName(database, collections, collectionId)
      ),
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

  const next: Design = {
    ...current,
    name: input.name === undefined ? current.name : normalizeName(input.name),
    description:
      input.description === undefined
        ? current.description
        : normalizeDescription(input.description),
    categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
    collectionId: input.collectionId === undefined ? current.collectionId : input.collectionId,
  };

  const changed =
    next.name !== current.name ||
    next.description !== current.description ||
    next.categoryId !== current.categoryId ||
    next.collectionId !== current.collectionId;

  if (!changed) return current;

  next.updatedAt = now;
  database.db
    .update(designs)
    .set({
      name: next.name,
      description: next.description,
      categoryId: next.categoryId,
      collectionId: next.collectionId,
      updatedAt: next.updatedAt,
      searchText: buildSearchText(
        next.name,
        next.description,
        taxonomyName(database, categories, next.categoryId),
        taxonomyName(database, collections, next.collectionId)
      ),
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

const designDetailColumns = {
  ...designColumns,
  category: categories.name,
  collection: collections.name,
};

/**
 * The Detail read: one live Design with its Category and Collection names.
 * Detail shows a Design in any status, so unlike the Library it never filters
 * by status. Private to the feature, like the Library's query builder.
 */
export function designDetailQuery(database: Database, id: string) {
  return database.db
    .select(designDetailColumns)
    .from(designs)
    .leftJoin(categories, eq(designs.categoryId, categories.id))
    .leftJoin(collections, eq(designs.collectionId, collections.id))
    .where(and(eq(designs.id, id), isNull(designs.deletedAt)));
}

/** Reads one live Design for Detail; null when it is unknown or soft-deleted. */
export function getDesignDetail(database: Database, id: string): DesignDetail | null {
  return designDetailQuery(database, id).get() ?? null;
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
