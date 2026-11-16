import { useMemo } from 'react';
import { categories, collections, designEvents } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import { readTaxonomyNames, type TaxonomyNames } from '@/features/taxonomy';
import { designEventsQuery, toDesignEvent, type DesignEvent } from './events';

export type DesignHistory = {
  events: DesignEvent[];
  /** Every Category and Collection name, deleted entries included (#7). */
  taxonomy: TaxonomyNames;
  error: Error | undefined;
  /** `loading` until the first read resolves, so "no history" is not shown early. */
  status: LiveReadStatus;
};

const EMPTY_TAXONOMY: TaxonomyNames = {
  categories: new Map(),
  collections: new Map(),
};

/**
 * Subscribes to one Design's History, newest first, with the names its stored
 * taxonomy ids resolve to. Events, Categories, and Collections are one read:
 * an edit or a taxonomy rename refreshes both parts together.
 */
export function useDesignHistory(designId: string): DesignHistory {
  const database = useDatabase();
  const run = useMemo(
    () => () => ({
      events: designEventsQuery(database, designId).all().map(toDesignEvent),
      taxonomy: readTaxonomyNames(database),
    }),
    [database, designId]
  );
  const { data, error, status } = useLiveRead({
    tables: [designEvents, categories, collections],
    run,
  });

  return {
    events: data?.events ?? [],
    taxonomy: data?.taxonomy ?? EMPTY_TAXONOMY,
    error,
    status,
  };
}
