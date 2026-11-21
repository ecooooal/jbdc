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
 * The gallery's decisions: which stage the rail's second row shows, which image
 * the hero shows, and whether the last attach failed. The selections are ids;
 * the live list derives the rows.
 */
export type GalleryState = {
  kind: ImageKind;
  imageId: string | null;
  /**
   * The stage the owner chose while it was empty, still waiting for its first
   * image. It keeps the rail there while the Cover would pull it elsewhere; any
   * selection, or a read that fills it, clears it.
   */
  awaitingKind: ImageKind | null;
  /**
   * The last attach did not land. The stage is exactly as it was, so the rail
   * says the images could not be added rather than a failed write reading as a
   * cancel; a new attach press or a stage press clears it.
   */
  attachFailed: boolean;
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
  | { type: "attach-pressed" }
  | { type: "attach-failed" }
  | (GalleryGesture & { stages: readonly GalleryStage[] });

/**
 * Before the first read there is no Cover, so the rail rests on the journey's
 * strongest stage. The read replaces this at once with the Cover's stage,
 * unless the owner has chosen an empty stage in the meantime.
 */
export function createInitialGalleryState(): GalleryState {
  return { kind: "final", imageId: null, awaitingKind: null, attachFailed: false };
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
 * gave it — and falls back to the Cover when it is gone. An empty stage the
 * owner chose stays chosen until its first image arrives. A stage press starts
 * that stage at its oldest image; a swipe walks the journey in order, within a
 * stage and then across the next filled one, stopping at either end. An attach
 * that failed is a flag the rail reads until the owner tries again or presses a
 * stage, and it never moves the selection.
 */
export function galleryReducer(state: GalleryState, event: GalleryEvent): GalleryState {
  switch (event.type) {
    case "images-read": {
      const kept = locationOf(event.stages, state.imageId);

      if (kept) return { ...kept, awaitingKind: null, attachFailed: state.attachFailed };

      // The chosen empty stage keeps its place when a read arrives: it holds
      // the stage empty until its first image, then selects that image. Without
      // a chosen stage the Cover wins, so a gallery opened on no images still
      // follows the first Cover that appears.
      if (state.awaitingKind) {
        const chosen = event.stages.find((candidate) => candidate.kind === state.awaitingKind);
        const first = chosen?.images[0];

        return first
          ? {
              kind: state.awaitingKind,
              imageId: first.id,
              awaitingKind: null,
              attachFailed: state.attachFailed,
            }
          : {
              kind: state.awaitingKind,
              imageId: null,
              awaitingKind: state.awaitingKind,
              attachFailed: state.attachFailed,
            };
      }

      const cover = locationOf(event.stages, event.cover);

      return {
        kind: cover?.kind ?? state.kind,
        imageId: cover?.imageId ?? null,
        awaitingKind: null,
        attachFailed: state.attachFailed,
      };
    }

    case "stage-pressed": {
      const stage = event.stages.find((candidate) => candidate.kind === event.kind);
      const first = stage?.images[0] ?? null;

      return {
        kind: event.kind,
        imageId: first?.id ?? null,
        awaitingKind: first ? null : event.kind,
        attachFailed: false,
      };
    }

    case "image-pressed": {
      const located = locationOf(event.stages, event.imageId);

      return located ? { ...located, awaitingKind: null, attachFailed: state.attachFailed } : state;
    }

    case "hero-swiped": {
      const stepped = step(event.stages, state.imageId, event.direction);

      return stepped ? { ...stepped, awaitingKind: null, attachFailed: state.attachFailed } : state;
    }

    case "attach-pressed":
      return { ...state, attachFailed: false };

    case "attach-failed":
      return { ...state, attachFailed: true };
  }
}
