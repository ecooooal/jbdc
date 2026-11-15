import { useMemo } from 'react';
import { useDatabase, useLiveQuery } from '@/features/database/react';
import { designEventsQuery, toDesignEvent, type DesignEvent } from './events';

export type DesignHistory = {
  events: DesignEvent[];
  error: Error | undefined;
  /** False until the first read resolves, so "no history" is not shown early. */
  isLoaded: boolean;
};

/**
 * Subscribes to one Design's History, newest first. The query builder stays
 * private to the feature; callers never wire `useLiveQuery` themselves.
 */
export function useDesignHistory(designId: string): DesignHistory {
  const database = useDatabase();
  const query = useMemo(() => designEventsQuery(database, designId), [database, designId]);
  const { data, error, updatedAt } = useLiveQuery(query, [query]);

  return { events: data.map(toDesignEvent), error, isLoaded: updatedAt !== undefined };
}
