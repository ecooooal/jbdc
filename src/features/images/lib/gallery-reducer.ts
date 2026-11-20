import type { ImageKind } from "@/features/database";

/**
 * One image as the journey reads it: what it is and the stage it belongs to.
 * The gallery never stores a row; a selection is an id and the live read
 * supplies the rest.
 */
export type GalleryImage = {
  id: string;
  kind: ImageKind;
};

/** One stage of the journey: its kind and its images, oldest first. */
export type GalleryStage = {
  kind: ImageKind;
  images: readonly GalleryImage[];
};

/** Which way the owner swiped the hero. */
export type SwipeDirection = "next" | "previous";

/**
 * The gallery's decisions: which stage the rail's second row shows, and which
 * image the hero shows. Both are ids; the live list derives the rows.
 */
export type GalleryState = {
  kind: ImageKind;
  imageId: string | null;
  /**
   * True once the first read has placed the gallery on the Cover. Before that an
   * images-read opens on the Cover; afterwards a stage the owner chose while it
   * was empty is kept until its first image arrives.
   */
  opened: boolean;
};

/** What the owner did to the gallery. */
export type GalleryGesture =
  | { type: "stage-pressed"; kind: ImageKind }
  | { type: "image-pressed"; imageId: string }
  | { type: "hero-swiped"; direction: SwipeDirection };

/**
 * A fact the gallery handles. A gesture carries the live journey beside it,
 * because the reducer is pure and cannot read the catalog: the stages are the
 * value the rule needs, the way `now` rides on an event that must time itself.
 */
export type GalleryEvent =
  | { type: "images-read"; stages: readonly GalleryStage[]; cover: string | null }
  | (GalleryGesture & { stages: readonly GalleryStage[] });

/**
 * Before the first read there is no Cover, so the rail rests on the journey's
 * strongest stage. The read replaces this at once with the Cover's stage.
 */
export function createInitialGalleryState(): GalleryState {
  return { kind: "final", imageId: null, opened: false };
}

/** The current image's stage, position and count, derived from the live list. */
export type GalleryView<Stage extends GalleryStage = GalleryStage> = {
  stage: Stage | null;
  image: Stage["images"][number] | null;
  /** 1-based position within the active stage; 0 when the stage has no image. */
  position: number;
  count: number;
};

/** The live journey grouped into stages, in journey order. */
function locationOf(
  stages: readonly GalleryStage[],
  imageId: string | null,
): { kind: ImageKind; imageId: string } | null {
  if (!imageId) return null;

  for (const stage of stages) {
    if (stage.images.some((image) => image.id === imageId)) {
      return { kind: stage.kind, imageId };
    }
  }

  return null;
}

/** Every image across the journey, oldest to newest, so a swipe crosses stages. */
function journeyOf(stages: readonly GalleryStage[]): { kind: ImageKind; imageId: string }[] {
  return stages.flatMap((stage) =>
    stage.images.map((image) => ({ kind: stage.kind, imageId: image.id })),
  );
}

/** The image one step away, or null at the end of the journey. */
function step(
  stages: readonly GalleryStage[],
  imageId: string | null,
  direction: SwipeDirection,
): { kind: ImageKind; imageId: string } | null {
  const journey = journeyOf(stages);
  const index = journey.findIndex((candidate) => candidate.imageId === imageId);

  if (index < 0) return null;

  return journey[index + (direction === "next" ? 1 : -1)] ?? null;
}

/**
 * What the gallery shows right now: the active stage and the hero's image.
 * A pure derivation, so the component never repeats the selection rule.
 */
export function galleryView<Stage extends GalleryStage>(
  stages: readonly Stage[],
  state: GalleryState,
): GalleryView<Stage> {
  const stage = stages.find((candidate) => candidate.kind === state.kind) ?? null;
  const image = stage?.images.find((candidate) => candidate.id === state.imageId) ?? null;
  const index = stage && image ? stage.images.indexOf(image) : -1;

  return {
    stage,
    image: image ?? null,
    position: index + 1,
    count: stage?.images.length ?? 0,
  };
}

/**
 * The gallery's decisions. It opens on the Cover; a later read keeps the
 * selected image while it exists — moving it to the stage its reclassification
 * gave it — and falls back to the Cover when it is gone. A stage press starts
 * that stage at its oldest image; a swipe walks the journey in order, within a
 * stage and then across the next filled one, stopping at either end.
 */
export function galleryReducer(state: GalleryState, event: GalleryEvent): GalleryState {
  switch (event.type) {
    case "images-read": {
      const kept = locationOf(event.stages, state.imageId);

      if (kept) return { ...kept, opened: true };

      // A stage the owner chose while it was empty stays chosen: take its first
      // image once one arrives, and keep the stage empty until then. Only before
      // the first read — when there is no chosen stage — does the Cover win.
      if (state.opened && state.imageId === null) {
        const chosen = event.stages.find((candidate) => candidate.kind === state.kind);

        if (chosen)
          return { kind: state.kind, imageId: chosen.images[0]?.id ?? null, opened: true };
      }

      const cover = locationOf(event.stages, event.cover);

      return { kind: cover?.kind ?? state.kind, imageId: cover?.imageId ?? null, opened: true };
    }

    case "stage-pressed": {
      const stage = event.stages.find((candidate) => candidate.kind === event.kind);

      return { kind: event.kind, imageId: stage?.images[0]?.id ?? null, opened: state.opened };
    }

    case "image-pressed": {
      const located = locationOf(event.stages, event.imageId);

      return located ? { ...located, opened: state.opened } : state;
    }

    case "hero-swiped": {
      const stepped = step(event.stages, state.imageId, event.direction);

      return stepped ? { ...stepped, opened: state.opened } : state;
    }
  }
}
