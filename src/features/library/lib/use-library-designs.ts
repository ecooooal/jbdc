import { useMemo } from 'react';
import { useDatabase, useLiveQuery } from '@/features/database/react';
import { libraryDesignsQuery, type LibraryDesign } from './query';

export type LibraryDesigns = {
  designs: LibraryDesign[];
  error: Error | undefined;
  /** False until the first read resolves, so an empty catalog is not shown early. */
  isLoaded: boolean;
};

/**
 * Subscribes to the Library's default query. Creates and edits land in the
 * returned designs without a manual refresh. The query builder stays
 * module-private; callers never wire `useLiveQuery` themselves.
 */
export function useLibraryDesigns(): LibraryDesigns {
  const database = useDatabase();
  const query = useMemo(() => libraryDesignsQuery(database), [database]);
  const { data, error, updatedAt } = useLiveQuery(query, [query]);

  return { designs: data, error, isLoaded: updatedAt !== undefined };
}
