import {
  useLiveRead,
  type LiveReadFields,
} from '@/features/database/react';
import { taxonomyRead, type TaxonomyRows } from './records';

/** The Taxonomy a picker reads: one declared row plus the shared status. */
export type Taxonomy = TaxonomyRows & LiveReadFields;

/**
 * Subscribes to the owner's Categories and Collections through the one live
 * read. An entry created inline lands in the returned lists without a manual
 * reload, so the picker that created it can show it immediately.
 */
export function useTaxonomy(): Taxonomy {
  const { data, error, status } = useLiveRead(taxonomyRead);

  return { ...(data ?? taxonomyRead.empty), error, status };
}
