import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Database, DesignStatus } from '@/features/database';
import { categories, collections, designs } from '@/features/database';

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

/**
 * The Library's default query: active statuses, no soft-deleted rows, most
 * recently updated first. Category and collection names come along so the grid
 * row never needs a second query.
 *
 * Module-private: it is the live-query adapter's builder, so only the React
 * entry (`useLibraryDesigns`) names it. The package entry exposes the hook.
 */
export function libraryDesignsQuery(database: Database) {
  return database.db
    .select({
      id: designs.id,
      name: designs.name,
      category: categories.name,
      collection: collections.name,
      status: designs.status,
      updatedAt: designs.updatedAt,
    })
    .from(designs)
    .leftJoin(categories, eq(designs.categoryId, categories.id))
    .leftJoin(collections, eq(designs.collectionId, collections.id))
    .where(
      and(inArray(designs.status, [...DEFAULT_LIBRARY_STATUSES]), isNull(designs.deletedAt))
    )
    .orderBy(desc(designs.updatedAt));
}

/** Runs the default query once. The screen uses the live hook instead. */
export function listLibraryDesigns(database: Database): LibraryDesign[] {
  return libraryDesignsQuery(database).all();
}
