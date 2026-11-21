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
 * The note composer, bound to the image it was opened on. The draft and its
 * image travel together, so changing the image drops a half-written note rather
 * than carrying it to a picture it was not written for.
 */
export type NoteComposer = {
  imageId: string;
  draft: string;
};

/**
 * The gallery's decisions: which stage the rail's second row shows, which image
 * the hero shows, whether the last attach failed, and the state of the note
 * block beneath the hero. The selections are ids; the live list derives the
 * rows.
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
  /** The open note composer for the current image; null when it is closed. */
  noteComposer: NoteComposer | null;
  /**
   * Whether the note block shows every note rather than its first two. It
   * closes again when the owner moves to another image.
   */
  notesExpanded: boolean;
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
  | { type: "note-composer-opened" }
  | { type: "note-composer-closed" }
  | { type: "note-draft-changed"; draft: string }
  | { type: "note-added"; imageId: string }
  | { type: "notes-more-pressed" }
  | (GalleryGesture & { stages: readonly GalleryStage[] });

/**
 * Before the first read there is no Cover, so the rail rests on the journey's
 * strongest stage. The read replaces this at once with the Cover's stage,
 * unless the owner has chosen an empty stage in the meantime.
 */
export function createInitialGalleryState(): GalleryState {
  return {
    kind: "final",
    imageId: null,
    awaitingKind: null,
    attachFailed: false,
    noteComposer: null,
    notesExpanded: false,
  };
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

/** How many notes the block shows before it offers the rest. */
export const NOTE_COLLAPSED_COUNT = 2;

/** What the note block shows: the first two notes, or all of them expanded. */
export type NoteBlockView<Note> = {
  total: number;
  shown: readonly Note[];
  /** Whether there are more notes than the collapsed block shows. */
  collapsible: boolean;
  expanded: boolean;
};

/**
 * The note block's derivation: never more than two notes until the owner asks
 * for all of them, and the control that asks only when there is more to see.
 */
export function noteBlockView<Note>(
  notes: readonly Note[],
  state: GalleryState,
): NoteBlockView<Note> {
  const collapsible = notes.length > NOTE_COLLAPSED_COUNT;
  const expanded = collapsible && state.notesExpanded;

  return {
    total: notes.length,
    shown: expanded ? notes : notes.slice(0, NOTE_COLLAPSED_COUNT),
    collapsible,
    expanded,
  };
}

/**
 * The state after a selection. The note UI belongs to one image, so a half
 * written note and the expanded list drop as soon as the current image changes;
 * staying on the same image — a reclassification, say — keeps both.
 */
function selected(state: GalleryState, kind: ImageKind, imageId: string | null): GalleryState {
  if (imageId === state.imageId) return { ...state, kind, imageId };

  return { ...state, kind, imageId, noteComposer: null, notesExpanded: false };
}

/**
 * The gallery's decisions. It opens on the Cover; a later read keeps the
 * selected image while it exists — moving it to the stage its reclassification
 * gave it — and falls back to the Cover when it is gone. An empty stage the
 * owner chose stays chosen until its first image arrives. A stage press starts
 * that stage at its oldest image; a swipe walks the journey in order, within a
 * stage and then across the next filled one, stopping at either end. An attach
 * that failed is a flag the rail reads until the owner tries again or presses a
 * stage, and it never moves the selection. The note composer opens on the
 * current image, closes when the note lands, and is dropped when the owner
 * moves on.
 */
export function galleryReducer(state: GalleryState, event: GalleryEvent): GalleryState {
  switch (event.type) {
    case "images-read": {
      const kept = locationOf(event.stages, state.imageId);

      if (kept) return { ...selected(state, kept.kind, kept.imageId), awaitingKind: null };

      // The chosen empty stage keeps its place when a read arrives: it holds
      // the stage empty until its first image, then selects that image. Without
      // a chosen stage the Cover wins, so a gallery opened on no images still
      // follows the first Cover that appears.
      if (state.awaitingKind) {
        const chosen = event.stages.find((candidate) => candidate.kind === state.awaitingKind);
        const first = chosen?.images[0];

        return {
          ...selected(state, state.awaitingKind, first?.id ?? null),
          awaitingKind: first ? null : state.awaitingKind,
        };
      }

      const cover = locationOf(event.stages, event.cover);

      return {
        ...selected(state, cover?.kind ?? state.kind, cover?.imageId ?? null),
        awaitingKind: null,
      };
    }

    case "stage-pressed": {
      const stage = event.stages.find((candidate) => candidate.kind === event.kind);
      const first = stage?.images[0] ?? null;

      return {
        ...selected(state, event.kind, first?.id ?? null),
        awaitingKind: first ? null : event.kind,
        attachFailed: false,
      };
    }

    case "image-pressed": {
      const located = locationOf(event.stages, event.imageId);

      return located
        ? { ...selected(state, located.kind, located.imageId), awaitingKind: null }
        : state;
    }

    case "hero-swiped": {
      const stepped = step(event.stages, state.imageId, event.direction);

      return stepped
        ? { ...selected(state, stepped.kind, stepped.imageId), awaitingKind: null }
        : state;
    }

    case "attach-pressed":
      return { ...state, attachFailed: false };

    case "attach-failed":
      return { ...state, attachFailed: true };

    case "note-composer-opened":
      // A note needs the image it explains; with none selected there is nothing
      // to open the composer on.
      return state.imageId
        ? { ...state, noteComposer: { imageId: state.imageId, draft: "" } }
        : state;

    case "note-composer-closed":
      return { ...state, noteComposer: null };

    case "note-draft-changed":
      return state.noteComposer
        ? { ...state, noteComposer: { ...state.noteComposer, draft: event.draft } }
        : state;

    case "note-added": {
      // The note landed on the image the composer was opened for. A read that
      // moved the owner elsewhere has already dropped that composer, so only a
      // note for the open composer clears it; the list opens so the new note is
      // not hidden behind the collapsed two.
      if (state.noteComposer?.imageId !== event.imageId) return state;

      return { ...state, noteComposer: null, notesExpanded: true };
    }

    case "notes-more-pressed":
      return { ...state, notesExpanded: !state.notesExpanded };
  }
}
