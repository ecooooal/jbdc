import { useMemo } from 'react';
import { useLiveRead, type LiveReadFields } from '@/features/database/react';
import { designHistoryRead, type DesignHistoryRows } from './events';

/** One Design's History plus the shared status. */
export type DesignHistory = DesignHistoryRows & LiveReadFields;

/**
 * Subscribes to one Design's History through the one live read, newest first,
 * with the names its stored taxonomy ids resolve to. Events, Categories and
 * Collections are read together, so an edit or a taxonomy rename refreshes
 * both parts at once.
 */
export function useDesignHistory(designId: string): DesignHistory {
  const declaration = useMemo(() => designHistoryRead(designId), [designId]);
  const { data, error, status } = useLiveRead(declaration);

  return { ...data, error, status };
}
