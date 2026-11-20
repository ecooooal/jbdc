import { useMemo } from "react";
import { useLiveRead, type LiveReadFields } from "@/features/database/react";
import { designDetailRead, type DesignDetailRows } from "./records";

/** One Design's Detail plus the shared status. */
export type DesignDetailResult = DesignDetailRows & LiveReadFields;

/**
 * Subscribes to one Design's Detail through the one live read, resolving its
 * Category and Collection through the taxonomy name read and its Material uses
 * through the Material name read. An edit, a taxonomy rename, a Material
 * rename, or a use made elsewhere lands without a manual refresh.
 */
export function useDesignDetail(id: string): DesignDetailResult {
  const declaration = useMemo(() => designDetailRead(id), [id]);
  const { data, error, status } = useLiveRead(declaration);

  return { ...data, error, status };
}
