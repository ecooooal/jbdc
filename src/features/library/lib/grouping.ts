import type { Grouping } from "@/features/settings";
import type { LibraryDesign } from "./query";

/** One section of a grouped Library: a Collection's designs, or the unfiled ones. */
export type LibrarySection<T extends LibraryDesign = LibraryDesign> = {
  /** The Collection's label, or null for designs in no Collection. */
  collection: string | null;
  /** The section's designs, most recently updated first like the flat stream. */
  designs: T[];
};

/**
 * The Library's arrangement: the chosen grouping applied to the rows its live
 * read produced. The Design grouping is the flat stream, so its designs carry
 * no Collection label a section would claim; the Collection grouping gathers
 * them under their Collection instead.
 */
export type LibraryArrangement<T extends LibraryDesign = LibraryDesign> =
  { kind: "flat"; designs: T[] } | { kind: "grouped"; sections: LibrarySection<T>[] };

/** The most recent update among a Collection's designs, which orders the sections. */
function newest(designs: readonly LibraryDesign[]): number {
  return Math.max(...designs.map((design) => design.updatedAt));
}

/**
 * The Library's grouping rule, over the rows its live read already produces.
 * The Design grouping is the flat, most recently updated first stream,
 * untouched. The Collection grouping gathers the designs under their
 * Collection label, groups ordered by whichever of their designs is freshest,
 * with "No collection" last; an empty Library has no sections at all. The rule
 * is pure, so the screen can render either grouping without the read changing.
 */
export function groupLibraryDesigns<T extends LibraryDesign>(
  designs: readonly T[],
  grouping: Grouping,
): LibraryArrangement<T> {
  if (grouping === "per-design") return { kind: "flat", designs: [...designs] };

  const byCollection = new Map<string, T[]>();
  const unfiled: T[] = [];

  for (const design of designs) {
    if (design.collection === null) {
      unfiled.push(design);
      continue;
    }

    const members = byCollection.get(design.collection);

    if (members) members.push(design);
    else byCollection.set(design.collection, [design]);
  }

  const sections: LibrarySection<T>[] = [...byCollection.entries()]
    .sort(([, left], [, right]) => newest(right) - newest(left))
    .map(([collection, members]) => ({ collection, designs: members }));

  if (unfiled.length > 0) sections.push({ collection: null, designs: unfiled });

  return { kind: "grouped", sections };
}

/**
 * The arrangement's designs in the order the Library shows them: the flat
 * stream, or each Collection section in turn. The single view pages this list,
 * so swiping between designs never disagrees with the grids.
 */
export function orderedLibraryDesigns<T extends LibraryDesign>(
  arrangement: LibraryArrangement<T>,
): T[] {
  return arrangement.kind === "flat"
    ? arrangement.designs
    : arrangement.sections.flatMap((section) => section.designs);
}
