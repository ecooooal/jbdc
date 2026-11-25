import type { ImageKind } from "@/features/database";
import type { ImagePickResult } from "./image-picker";
import type {
  ImageAddNoteChange,
  ImageAddNoteResult,
  ImageAttachResult,
  ImageRemoveNoteChange,
  ImageRemoveNoteResult,
} from "./records";

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
export type ImageNoteComposer = {
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
  /** The Design this gallery shows; every effect names it. */
  designId: string;
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
  imageNoteComposer: ImageNoteComposer | null;
  /**
   * Whether the note block shows every note rather than its first two. It
   * closes again when the owner moves to another image.
   */
  imageNotesExpanded: boolean;
};

/**
 * The writes the gallery asks for, as data for its thin runner. A note is
 * declared where the state that names it lives: the composer holds its image
 * and words, and a note row holds its id. The Design and the change ride the
 * effect, so the runner calls the write path without building anything itself.
 * The plus press declares a pick-and-attach instead of a change: the files are
 * unknown until the picker answers, so the effect names the Design and the
 * stage, and the runner builds the attach from what the picker returned.
 */
export type GalleryEffect =
  | { type: "attach-images"; designId: string; kind: ImageKind }
  | { type: "add-image-note"; designId: string; change: ImageAddNoteChange }
  | { type: "remove-image-note"; designId: string; change: ImageRemoveNoteChange };

/** What one gallery event settled and the writes it asked for. */
export type GalleryResult = {
  state: GalleryState;
  effects: GalleryEffect[];
};

/** What the owner did to the gallery. */
export type GalleryGesture =
  | { type: "stage-pressed"; kind: ImageKind }
  | { type: "image-pressed"; imageId: string }
  | { type: "hero-swiped"; direction: SwipeDirection };

/**
 * Every fact the gallery handles, in three parts: the facts a component sends,
 * stated once in `GalleryFact`; the facts only the runner reports; and a
 * gesture carrying the live journey. The bare gesture arm is excluded from the
 * facts because the reducer's gesture cases read the stages the rule needs —
 * the reducer is pure and cannot read the catalog — the way `now` rides on an
 * event that must time itself.
 */
export type GalleryEvent =
  | Exclude<GalleryFact, GalleryGesture>
  | { type: "images-read"; stages: readonly GalleryStage[]; cover: string | null }
  | { type: "attach-failed" }
  | { type: "image-note-added"; imageId: string }
  | (GalleryGesture & { stages: readonly GalleryStage[] });

/**
 * Every fact a component can send the gallery. A gesture names what the owner
 * did; the door attaches the live journey the reducer needs. The facts only the
 * runner reports — a read, a failed attach, a stored note — are absent, so a
 * component cannot forge one.
 */
export type GalleryFact =
  | GalleryGesture
  | { type: "attach-pressed"; kind: ImageKind }
  | { type: "image-note-composer-opened" }
  | { type: "image-note-composer-closed" }
  | { type: "image-note-draft-changed"; draft: string }
  | { type: "image-note-save-pressed" }
  | { type: "image-note-delete-pressed"; noteId: string }
  | { type: "image-notes-more-pressed" };

/** The picker's answer that picked no file: a change of mind, or a refused permission. */
type PickEnding = Extract<ImagePickResult, { kind: "cancelled" } | { kind: "denied" }>;

/** One attempt to attach: the picker's answer, or the write's own answer for an attach. */
type GalleryAttachAttempt = {
  type: "attach";
  ending: PickEnding | ImageAttachResult;
};

/** One declared note, bound to the image it belongs to. */
type GalleryAddNoteAttempt = {
  type: "add-note";
  change: ImageAddNoteChange;
  ending: ImageAddNoteResult;
};

/** One declared note removal. */
type GalleryRemoveNoteAttempt = {
  type: "remove-note";
  change: ImageRemoveNoteChange;
  ending: ImageRemoveNoteResult;
};

/**
 * One gallery write attempt: the change the gallery declared where its fold
 * reads it, and the ending it observed. Each write's ending is the write path's
 * own answer for that change kind, plus the picker's answer for an attach,
 * because the write path narrows the rest at its interface and answers a failed
 * store instead of throwing. The fold is therefore total and has no branch for
 * an ending its write cannot produce, and needs no guard to tell the writes
 * apart.
 */
export type GalleryWriteAttempt =
  GalleryAttachAttempt | GalleryAddNoteAttempt | GalleryRemoveNoteAttempt;

/**
 * What an attach owes: a cancel and a stored write say nothing — the live read
 * carries the landing, and a change of mind is not a failure — while a denial,
 * a refusal, a vanished Design row, and a store that could not take the file
 * all say the images did not land.
 */
function attachOutcome({ ending }: GalleryAttachAttempt): GalleryEvent[] {
  switch (ending.kind) {
    case "cancelled":
    case "stored":
      return [];
    case "denied":
    case "refused":
    case "design-missing":
    case "store-failed":
      return [{ type: "attach-failed" }];
  }
}

/**
 * What an add-note owes: only the stored note is an event, and its rule closes
 * the composer it was written in. A refusal and a missed row owe nothing, so
 * the composer keeps the owner's words.
 */
function addNoteOutcome({ change, ending }: GalleryAddNoteAttempt): GalleryEvent[] {
  switch (ending.kind) {
    case "image-note-stored":
      return [{ type: "image-note-added", imageId: change.imageId }];
    case "refused":
    case "design-missing":
    case "image-missing":
      return [];
  }
}

/**
 * What a remove-note owes: nothing, whatever the ending. The live read drops
 * the row when the write lands, and a note still on screen simply stays, so the
 * owner is never shown an invented error.
 */
function removeNoteOutcome({ ending }: GalleryRemoveNoteAttempt): GalleryEvent[] {
  switch (ending.kind) {
    case "image-note-removed":
    case "image-note-missing":
    case "design-missing":
      return [];
  }
}

/**
 * The one place a gallery write's answer becomes the events the gallery
 * handles: the declared write plus the ending it observed, folded to the events
 * that ending owes. A runner calls this once per write and dispatches whatever
 * comes back, so each write's policy is stated and tested without React, a
 * database, or a picker.
 */
export function writeOutcome(attempt: GalleryWriteAttempt): GalleryEvent[] {
  switch (attempt.type) {
    case "attach":
      return attachOutcome(attempt);
    case "add-note":
      return addNoteOutcome(attempt);
    case "remove-note":
      return removeNoteOutcome(attempt);
  }
}

/**
 * Before the first read there is no Cover, so the rail rests on the journey's
 * strongest stage. The read replaces this at once with the Cover's stage,
 * unless the owner has chosen an empty stage in the meantime.
 */
export function createInitialGalleryState(designId: string): GalleryState {
  return {
    designId,
    kind: "final",
    imageId: null,
    awaitingKind: null,
    attachFailed: false,
    imageNoteComposer: null,
    imageNotesExpanded: false,
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
 * What the gallery shows right now: the active stage and its selected image.
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

/** The flat journey and where the gallery is in it. */
export type JourneyView<Stage extends GalleryStage = GalleryStage> = {
  /** Every image in journey order, oldest first within each stage. */
  images: Stage["images"][number][];
  /** The selected image, or null while the chosen stage has none. */
  image: Stage["images"][number] | null;
  /** 1-based position across the journey; 0 when no image is selected. */
  position: number;
  count: number;
  /** The selected image's stage, or null when no image is selected. */
  stage: ImageKind | null;
};

/**
 * The pager's view of the live list: every image flattened in journey order,
 * with the selected image's stage and its position across the whole journey.
 * The stage comes from the selected image, never from a stage's own index, so
 * a reclassification moves the counter with the image.
 */
export function journeyView<Stage extends GalleryStage>(
  stages: readonly Stage[],
  state: GalleryState,
): JourneyView<Stage> {
  const images = stages.flatMap((stage) => stage.images);
  const index = state.imageId ? images.findIndex((image) => image.id === state.imageId) : -1;
  const image = index >= 0 ? images[index] : null;

  return {
    images,
    image,
    position: index + 1,
    count: images.length,
    stage: image?.kind ?? null,
  };
}

/** How many notes the block shows before it offers the rest. */
export const IMAGE_NOTE_COLLAPSED_COUNT = 2;

/** What the note block shows: the first two notes, or all of them expanded. */
export type ImageNoteBlockView<Note> = {
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
export function imageNoteBlockView<Note>(
  notes: readonly Note[],
  state: GalleryState,
): ImageNoteBlockView<Note> {
  const collapsible = notes.length > IMAGE_NOTE_COLLAPSED_COUNT;
  const expanded = collapsible && state.imageNotesExpanded;

  return {
    total: notes.length,
    shown: expanded ? notes : notes.slice(0, IMAGE_NOTE_COLLAPSED_COUNT),
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

  return { ...state, kind, imageId, imageNoteComposer: null, imageNotesExpanded: false };
}

/** A result that asks for no write. */
function only(state: GalleryState): GalleryResult {
  return { state, effects: [] };
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
 * moves on. The result carries the writes the event declares: the plus press
 * declares its pick, the notes' own presses declare their writes, and every
 * other event declares none.
 */
export function galleryReducer(state: GalleryState, event: GalleryEvent): GalleryResult {
  switch (event.type) {
    case "images-read": {
      const kept = locationOf(event.stages, state.imageId);

      if (kept) return only({ ...selected(state, kept.kind, kept.imageId), awaitingKind: null });

      // The chosen empty stage keeps its place when a read arrives: it holds
      // the stage empty until its first image, then selects that image. Without
      // a chosen stage the Cover wins, so a gallery opened on no images still
      // follows the first Cover that appears.
      if (state.awaitingKind) {
        const chosen = event.stages.find((candidate) => candidate.kind === state.awaitingKind);
        const first = chosen?.images[0];

        return only({
          ...selected(state, state.awaitingKind, first?.id ?? null),
          awaitingKind: first ? null : state.awaitingKind,
        });
      }

      const cover = locationOf(event.stages, event.cover);

      return only({
        ...selected(state, cover?.kind ?? state.kind, cover?.imageId ?? null),
        awaitingKind: null,
      });
    }

    case "stage-pressed": {
      const stage = event.stages.find((candidate) => candidate.kind === event.kind);
      const first = stage?.images[0] ?? null;

      return only({
        ...selected(state, event.kind, first?.id ?? null),
        awaitingKind: first ? null : event.kind,
        attachFailed: false,
      });
    }

    case "image-pressed": {
      const located = locationOf(event.stages, event.imageId);

      return only(
        located ? { ...selected(state, located.kind, located.imageId), awaitingKind: null } : state,
      );
    }

    case "hero-swiped": {
      const stepped = step(event.stages, state.imageId, event.direction);

      return only(
        stepped ? { ...selected(state, stepped.kind, stepped.imageId), awaitingKind: null } : state,
      );
    }

    case "attach-pressed":
      // The plus card names the stage it sits on, so the write and the rail
      // cannot drift apart and the stage is derived once.
      return {
        state: { ...state, attachFailed: false },
        effects: [{ type: "attach-images", designId: state.designId, kind: event.kind }],
      };

    case "attach-failed":
      return only({ ...state, attachFailed: true });

    case "image-note-composer-opened":
      // A note needs the image it explains; with none selected there is nothing
      // to open the composer on.
      return only(
        state.imageId
          ? { ...state, imageNoteComposer: { imageId: state.imageId, draft: "" } }
          : state,
      );

    case "image-note-composer-closed":
      return only({ ...state, imageNoteComposer: null });

    case "image-note-draft-changed":
      return only(
        state.imageNoteComposer
          ? { ...state, imageNoteComposer: { ...state.imageNoteComposer, draft: event.draft } }
          : state,
      );

    case "image-note-save-pressed":
      // The composer stays open until the stored note's own event closes it, so
      // a refusal keeps the owner's words.
      return state.imageNoteComposer
        ? {
            state,
            effects: [
              {
                type: "add-image-note",
                designId: state.designId,
                change: {
                  kind: "add-note",
                  imageId: state.imageNoteComposer.imageId,
                  text: state.imageNoteComposer.draft,
                },
              },
            ],
          }
        : only(state);

    case "image-note-delete-pressed":
      // The row's id is the whole request; the live read is the only answer.
      return {
        state,
        effects: [
          {
            type: "remove-image-note",
            designId: state.designId,
            change: { kind: "remove-note", noteId: event.noteId },
          },
        ],
      };

    case "image-note-added": {
      // The note landed on the image the composer was opened for. A read that
      // moved the owner elsewhere has already dropped that composer, so only a
      // note for the open composer clears it. The list keeps its state: a
      // collapsed block stays collapsed, so a third note stays behind the two.
      if (state.imageNoteComposer?.imageId !== event.imageId) return only(state);

      return only({ ...state, imageNoteComposer: null });
    }

    case "image-notes-more-pressed":
      return only({ ...state, imageNotesExpanded: !state.imageNotesExpanded });
  }
}
