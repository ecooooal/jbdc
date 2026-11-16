import { useMemo } from 'react';
import { categories, collections, designs } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import { designDetailQuery, type DesignDetail } from './records';

export type DesignDetailResult = {
  design: DesignDetail | null;
  error: Error | undefined;
  /** `loading` until the first read resolves, so "not found" is not shown early. */
  status: LiveReadStatus;
};

/**
 * Subscribes to one Design's Detail read, including the Category and
 * Collection names it joins. An edit or a taxonomy rename made elsewhere lands
 * in the returned design without a manual refresh. The query builder stays
 * private to the feature; callers never wire the subscription themselves.
 */
export function useDesignDetail(id: string): DesignDetailResult {
  const database = useDatabase();
  const run = useMemo(
    () => () => designDetailQuery(database, id).all(),
    [database, id]
  );
  const { data, error, status } = useLiveRead({
    tables: [designs, categories, collections],
    run,
  });

  return { design: data?.[0] ?? null, error, status };
}
