import { asc, isNull } from 'drizzle-orm';
import type { Database } from '@/features/database';
import { categories, collections } from '@/features/database';

/** A name is trimmed and must survive trimming; this is the only cap. */
export const TAXONOMY_NAME_MAX_LENGTH = 120;

/** A Collection year is a whole calendar year, or absent. */
export const COLLECTION_YEAR_MIN = 1;
export const COLLECTION_YEAR_MAX = 9999;

/** A Category as a picker needs it: enough to show and to select. */
export type Category = {
  id: string;
  name: string;
};

/** A Collection as a picker needs it: a name and its optional year. */
export type Collection = {
  id: string;
  name: string;
  year: number | null;
};

export type CreateCategoryInput = {
  name: string;
};

export type CreateCollectionInput = {
  name: string;
  year?: number | null;
};

export class InvalidTaxonomyNameError extends Error {
  constructor(
    readonly kind: 'category' | 'collection',
    readonly reason: 'empty' | 'too_long'
  ) {
    super(
      reason === 'empty'
        ? `A ${kind} needs a name.`
        : `A ${kind} name can be at most ${TAXONOMY_NAME_MAX_LENGTH} characters.`
    );
    this.name = 'InvalidTaxonomyNameError';
  }
}

export class InvalidCollectionYearError extends Error {
  constructor(readonly year: number) {
    super(
      `A collection year must be a whole number between ${COLLECTION_YEAR_MIN} and ${COLLECTION_YEAR_MAX}.`
    );
    this.name = 'InvalidCollectionYearError';
  }
}

function normalizeName(kind: 'category' | 'collection', raw: string): string {
  const name = raw.trim();

  if (name.length === 0) throw new InvalidTaxonomyNameError(kind, 'empty');
  if (name.length > TAXONOMY_NAME_MAX_LENGTH) {
    throw new InvalidTaxonomyNameError(kind, 'too_long');
  }

  return name;
}

function normalizeYear(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;

  if (!Number.isInteger(raw) || raw < COLLECTION_YEAR_MIN || raw > COLLECTION_YEAR_MAX) {
    throw new InvalidCollectionYearError(raw);
  }

  return raw;
}

/**
 * The owner's Categories, alphabetical, without any she has removed. The live
 * hook uses this same builder, so a picker and a direct read never disagree.
 */
export function categoriesQuery(database: Database) {
  return database.db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.name));
}

/** The owner's Collections, alphabetical, without any she has removed. */
export function collectionsQuery(database: Database) {
  return database.db
    .select({ id: collections.id, name: collections.name, year: collections.year })
    .from(collections)
    .where(isNull(collections.deletedAt))
    .orderBy(asc(collections.name));
}

/** Runs the Category list once. A screen uses the live hook instead. */
export function listCategories(database: Database): Category[] {
  return categoriesQuery(database).all();
}

/** Runs the Collection list once. A screen uses the live hook instead. */
export function listCollections(database: Database): Collection[] {
  return collectionsQuery(database).all();
}

/**
 * Writes one Category and returns it in the shape a picker selects. Inline
 * creation is the same call as any other, so the form never waits on a reload.
 */
export function createCategory(
  database: Database,
  input: CreateCategoryInput,
  now: number = Date.now()
): Category {
  const name = normalizeName('category', input.name);
  const category: Category = { id: database.newId(), name };

  database.db
    .insert(categories)
    .values({ ...category, createdAt: now })
    .run();

  return category;
}

/**
 * Writes one Collection and returns it in the shape a picker selects. The year
 * is optional; when present it must be a real four-digit year.
 */
export function createCollection(
  database: Database,
  input: CreateCollectionInput,
  now: number = Date.now()
): Collection {
  const name = normalizeName('collection', input.name);
  const year = normalizeYear(input.year);
  const collection: Collection = { id: database.newId(), name, year };

  database.db
    .insert(collections)
    .values({ ...collection, createdAt: now })
    .run();

  return collection;
}
