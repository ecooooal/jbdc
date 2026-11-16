import { useMemo } from 'react';
import { categories, collections } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import {
  categoriesQuery,
  collectionsQuery,
  type Category,
  type Collection,
} from './records';

export type Taxonomy = {
  categories: Category[];
  collections: Collection[];
  error: Error | undefined;
  /** `loading` until both lists resolve, so a picker never opens on stale emptiness. */
  status: LiveReadStatus;
};

/**
 * Subscribes to the owner's Categories and Collections with one read. An entry
 * created inline lands in the returned lists without a manual reload, so the
 * picker that created it can show it immediately.
 */
export function useTaxonomy(): Taxonomy {
  const database = useDatabase();
  const run = useMemo(
    () => () => ({
      categories: categoriesQuery(database).all(),
      collections: collectionsQuery(database).all(),
    }),
    [database]
  );
  const { data, error, status } = useLiveRead({
    tables: [categories, collections],
    run,
  });

  return {
    categories: data?.categories ?? [],
    collections: data?.collections ?? [],
    error,
    status,
  };
}
