import type { Grouping } from "@/features/settings";
import type { LibraryDesign } from "./query";

/** One section of the Library: a Collection's designs, or the unfiled ones. */
export type LibrarySection = {
  /** The Collection's label, or null for designs in no Collection. */
  collection: string | null;
  /** The section's designs, most recently updated first like the flat stream. */
  designs: LibraryDesign[];
};

/**
 * The Library's grouping rule, over the rows its live read already produces.
 * Per design is the flat, most recently updated first stream, untouched. Per
 * collection gathers the designs under their Collection label, groups ordered
 * by whichever of their designs is freshest, with "No collection" last; an
 * empty Library has no sections at all. The rule is pure, so the screen can
 * render either grouping without the read changing.
 */
export function groupLibraryDesigns(
  designs: readonly LibraryDesign[],
  grouping: Grouping,
): LibrarySection[] {
  if (designs.length === 0) return [];
  if (grouping === "per-design") return [{ collection: null, designs: [...designs] }];

  const byCollection = new Map<string, LibraryDesign[]>();
  const unfiled: LibraryDesign[] = [];

  for (const design of designs) {
    if (design.collection === null) {
      unfiled.push(design);
      continue;
    }

    const members = byCollection.get(design.collection);

    if (members) members.push(design);
    else byCollection.set(design.collection, [design]);
  }

  const ranked: (LibrarySection & { freshest: number })[] = [...byCollection.entries()].map(
    ([collection, members]) => ({
      collection,
      designs: members,
      freshest: Math.max(...members.map((design) => design.updatedAt)),
    }),
  );

  ranked.sort((left, right) => right.freshest - left.freshest);

  const sections: LibrarySection[] = ranked.map(({ collection, designs }) => ({
    collection,
    designs,
  }));

  if (unfiled.length > 0) sections.push({ collection: null, designs: unfiled });

  return sections;
}
