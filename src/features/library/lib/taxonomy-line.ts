import type { LibraryDesign } from "./query";

/**
 * The one line the single view gives a Design's taxonomy: the names it has,
 * joined as data. An unfiled Design gets no line rather than a pair of
 * placeholders. The grid leaves taxonomy to this page.
 */
export function taxonomyLine(
  design: Pick<LibraryDesign, "category" | "collection">,
): string | null {
  const parts = [design.category, design.collection].filter((part): part is string =>
    Boolean(part),
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}
