import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { DatabaseHandle, DesignStatus } from '@/features/database';
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
 */
export function libraryDesignsQuery(db: DatabaseHandle) {
  return db
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
export function listLibraryDesigns(db: DatabaseHandle): LibraryDesign[] {
  return libraryDesignsQuery(db).all();
}
