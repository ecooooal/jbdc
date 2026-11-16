import { useMemo } from 'react';
import { categories, collections, designs } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import { listLibraryDesigns, type LibraryDesign } from './query';

export type LibraryDesigns = {
  designs: LibraryDesign[];
  error: Error | undefined;
  /** `loading` until the first read resolves, so an empty library is not shown early. */
  status: LiveReadStatus;
};

/**
 * Subscribes to the Library's default query, resolving Category and Collection
 * names through the taxonomy name read. Creates, edits, and taxonomy renames
 * land in the returned designs without a manual refresh. The query builder
 * stays module-private; callers never wire the subscription themselves.
 */
export function useLibraryDesigns(): LibraryDesigns {
  const database = useDatabase();
  const run = useMemo(() => () => listLibraryDesigns(database), [database]);
  const { data, error, status } = useLiveRead({
    tables: [designs, categories, collections],
    run,
  });

  return { designs: data ?? [], error, status };
}
