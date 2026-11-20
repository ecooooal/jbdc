import { IMAGE_KINDS, images, type ImageKind } from '@/features/database';

/** An image as the catalog stores it: one file, labelled by its kind. */
export type Image = typeof images.$inferSelect;

/**
 * The Cover's order: the most developed kind first. The journey reads
 * `IMAGE_KINDS` from inspiration to final, so the Cover ranks it in reverse.
 */
const COVER_KIND_ORDER: readonly ImageKind[] = [...IMAGE_KINDS].reverse();

/** One stage of a Design's journey: the kind and its images, oldest first. */
export type ImageStage = {
  kind: ImageKind;
  images: Image[];
};

function newestFirst(left: Image, right: Image): number {
  // Equal timestamps fall back to the id, so a Cover never depends on the
  // order a read happened to return.
  return right.createdAt - left.createdAt || right.id.localeCompare(left.id);
}

/**
 * The Cover: the newest image of the highest kind the Design has, in the order
 * `final` → `prototype` → `sketch` → `inspiration`. Derived on every read and
 * never stored, so reclassifying an image changes it with no other act; a
 * Design with no images has none (GLOSSARY: Cover).
 */
export function coverOf(stored: readonly Image[]): Image | null {
  const highestKind = COVER_KIND_ORDER.find((kind) =>
    stored.some((image) => image.kind === kind)
  );

  if (!highestKind) return null;

  return stored.filter((image) => image.kind === highestKind).sort(newestFirst)[0];
}

/**
 * The Design's images grouped by kind, as the journey rail reads them: all four
 * stages always present, in inspiration → sketch → prototype → final order, and
 * each stage's images oldest to newest so it reads as a chronicle.
 */
export function imageStages(stored: readonly Image[]): ImageStage[] {
  return IMAGE_KINDS.map((kind) => ({
    kind,
    images: stored
      .filter((image) => image.kind === kind)
      .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)),
  }));
}
