import { useMemo } from 'react';
import { materials } from '@/features/database';
import {
  useDatabase,
  useLiveRead,
  type LiveReadStatus,
} from '@/features/database/react';
import { materialsQuery, type Material } from './records';

export type Materials = {
  materials: Material[];
  error: Error | undefined;
  /** `loading` until the list resolves, so a picker never opens on stale emptiness. */
  status: LiveReadStatus;
};

/**
 * Subscribes to the owner's Materials. A Material created inline lands in the
 * returned list without a manual reload, so the picker that created it can
 * show it immediately.
 */
export function useMaterials(): Materials {
  const database = useDatabase();
  const run = useMemo(() => () => materialsQuery(database).all(), [database]);
  const { data, error, status } = useLiveRead({ tables: [materials], run });

  return {
    materials: data ?? [],
    error,
    status,
  };
}
