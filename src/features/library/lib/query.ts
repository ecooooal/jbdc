import { and, desc, inArray, isNull } from 'drizzle-orm';
import type { Database, DesignStatus } from '@/features/database';
import { designs } from '@/features/database';
import { readTaxonomyNames } from '@/features/taxonomy';

/** The statuses the Library shows before any filter is chosen. */
export const DEFAULT_LIBRARY_STATUSES: readonly DesignStatus[] = [
  'concept',
  'in_development',
  'approved',
  'produced',
];

export type LibraryDesign = {
  id: string;
  name: string;
  category: string | null;
  collection: string | null;
  status: DesignStatus;
  updatedAt: number;
};

type LibraryDesignRow = {
  id: string;
  name: string;
  categoryId: string | null;
  collectionId: string | null;
  status: DesignStatus;
  updatedAt: number;
};

/**
 * The Library's default query: active statuses, no soft-deleted rows, most
 * recently updated first. Taxonomy names are resolved separately, through the
 * one name read, so a rename or a delete is never stale beside the row.
 *
 * Module-private: it is the live-query adapter's builder, so only the React
 * entry (`useLibraryDesigns`) names it. The package entry exposes the hook.
 */
export function libraryDesignsQuery(database: Database) {
  return database.db
    .select({
      id: designs.id,
      name: designs.name,
      categoryId: designs.categoryId,
      collectionId: designs.collectionId,
      status: designs.status,
      updatedAt: designs.updatedAt,
    })
    .from(designs)
    .where(
      and(inArray(designs.status, [...DEFAULT_LIBRARY_STATUSES]), isNull(designs.deletedAt))
    )
    .orderBy(desc(designs.updatedAt));
}

function withTaxonomyNames(database: Database, rows: LibraryDesignRow[]): LibraryDesign[] {
  const names = readTaxonomyNames(database);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.categoryId ? (names.categories.get(row.categoryId) ?? null) : null,
    collection: row.collectionId ? (names.collections.get(row.collectionId)?.name ?? null) : null,
    status: row.status,
    updatedAt: row.updatedAt,
  }));
}

/** Runs the default query once. The screen uses the live hook instead. */
export function listLibraryDesigns(database: Database): LibraryDesign[] {
  return withTaxonomyNames(database, libraryDesignsQuery(database).all());
}
