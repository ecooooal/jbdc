import { useMemo } from 'react';
import { useDatabase, useLiveQuery } from '@/features/database/react';
import { categoriesQuery, collectionsQuery, type Category, type Collection } from './records';

export type Taxonomy = {
  categories: Category[];
  collections: Collection[];
  error: Error | undefined;
  /** False until both lists resolve, so a picker never opens on stale emptiness. */
  isLoaded: boolean;
};

/**
 * Subscribes to the owner's Categories and Collections. An entry created
 * inline lands in the returned lists without a manual reload, so the picker
 * that created it can show it immediately.
 */
export function useTaxonomy(): Taxonomy {
  const database = useDatabase();
  const categoryQuery = useMemo(() => categoriesQuery(database), [database]);
  const collectionQuery = useMemo(() => collectionsQuery(database), [database]);
  const categoryResult = useLiveQuery(categoryQuery, [categoryQuery]);
  const collectionResult = useLiveQuery(collectionQuery, [collectionQuery]);

  return {
    categories: categoryResult.data,
    collections: collectionResult.data,
    error: categoryResult.error ?? collectionResult.error,
    isLoaded: categoryResult.updatedAt !== undefined && collectionResult.updatedAt !== undefined,
  };
}
