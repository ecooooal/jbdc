import type { LibraryDesign } from "./query";

/**
 * The one line a Library tile or page gives a Design's taxonomy: the names it
 * has, joined as data. A Collection section already names its own Collection,
 * so a tile inside it carries the Category alone. An unfiled Design gets no
 * line rather than a pair of placeholders.
 */
export function taxonomyLine(
  design: Pick<LibraryDesign, "category" | "collection">,
  { omitCollection = false }: { omitCollection?: boolean } = {},
): string | null {
  const parts = [design.category, omitCollection ? null : design.collection].filter(
    (part): part is string => Boolean(part),
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}
