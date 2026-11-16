import { useMemo } from 'react';
import { designEvents } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import { designEventsQuery, toDesignEvent, type DesignEvent } from './events';

export type DesignHistory = {
  events: DesignEvent[];
  error: Error | undefined;
  /** `loading` until the first read resolves, so "no history" is not shown early. */
  status: LiveReadStatus;
};

/**
 * Subscribes to one Design's History, newest first. The query builder stays
 * private to the feature; callers never wire the subscription themselves.
 */
export function useDesignHistory(designId: string): DesignHistory {
  const database = useDatabase();
  const run = useMemo(
    () => () => designEventsQuery(database, designId).all().map(toDesignEvent),
    [database, designId]
  );
  const { data, error, status } = useLiveRead({
    tables: [designEvents],
    run,
  });

  return { events: data ?? [], error, status };
}
