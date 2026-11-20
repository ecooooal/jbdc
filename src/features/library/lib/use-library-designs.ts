import { useLiveRead, type LiveReadFields } from "@/features/database/react";
import { libraryDesignsRead, type LibraryRows } from "./query";

/** The Library's designs plus the shared status. */
export type LibraryDesigns = LibraryRows & LiveReadFields;

/**
 * Subscribes to the Library's default query through the one live read.
 * Creates, edits, and taxonomy renames land without a manual refresh.
 */
export function useLibraryDesigns(): LibraryDesigns {
  const { data, error, status } = useLiveRead(libraryDesignsRead);

  return { ...data, error, status };
}
