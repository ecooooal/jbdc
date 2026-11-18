import { useLiveRead, type LiveReadFields } from '@/features/database/react';
import { materialsRead, type MaterialsRows } from './records';

/** The Materials a picker reads: one declared row plus the shared status. */
export type Materials = MaterialsRows & LiveReadFields;

/**
 * Subscribes to the owner's Materials through the one live read. A Material
 * created inline lands in the returned list without a manual reload, so the
 * picker that created it can show it immediately.
 */
export function useMaterials(): Materials {
  const { data, error, status } = useLiveRead(materialsRead);

  return { ...(data ?? materialsRead.empty), error, status };
}
