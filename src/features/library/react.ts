import { useMemo } from 'react';
import type { Database } from '@/features/database';
import { useLiveQuery } from '@/features/database/react';
import type { LibraryDesign } from './lib/query';
import { libraryDesignsQuery } from './lib/query';

export { LibraryCard } from './components/library-card';

export type LibraryDesigns = {
  designs: LibraryDesign[];
  error: Error | undefined;
  /** False until the first read resolves, so an empty catalog is not shown early. */
  isLoaded: boolean;
};

/**
 * Subscribes to the Library's default query. Creates and edits land in the
 * returned designs without a manual refresh.
 */
export function useLibraryDesigns(database: Database): LibraryDesigns {
  const query = useMemo(() => libraryDesignsQuery(database.db), [database]);
  const { data, error, updatedAt } = useLiveQuery(query, [query]);

  return { designs: data, error, isLoaded: updatedAt !== undefined };
}
