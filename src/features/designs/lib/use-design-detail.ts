import { useMemo } from 'react';
import { useDatabase, useLiveQuery } from '@/features/database/react';
import { designDetailQuery, type DesignDetail } from './records';

export type DesignDetailResult = {
  design: DesignDetail | null;
  error: Error | undefined;
  /** False until the first read resolves, so "not found" is not shown early. */
  isLoaded: boolean;
};

/**
 * Subscribes to one Design's Detail read. An edit made elsewhere lands in the
 * returned design without a manual refresh. The query builder stays private to
 * the feature; callers never wire `useLiveQuery` themselves.
 */
export function useDesignDetail(id: string): DesignDetailResult {
  const database = useDatabase();
  const query = useMemo(() => designDetailQuery(database, id), [database, id]);
  const { data, error, updatedAt } = useLiveQuery(query, [query]);

  return { design: data[0] ?? null, error, isLoaded: updatedAt !== undefined };
}
