import { useLiveRead, type LiveReadFields } from "@/features/database/react";
import { rejectedDesignsRead, type RejectedDesignRows } from "./query";

/** The rejected designs plus the shared status. */
export type RejectedDesigns = RejectedDesignRows & LiveReadFields;

/**
 * Subscribes to the rejected view's read through the one live read. A
 * rejection, a later Decision, a Cover, and a taxonomy rename land without a
 * manual refresh.
 */
export function useRejectedDesigns(): RejectedDesigns {
  const { data, error, status } = useLiveRead(rejectedDesignsRead);

  return { ...data, error, status };
}
