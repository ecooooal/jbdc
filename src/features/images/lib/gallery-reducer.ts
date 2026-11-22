import type { ImageKind } from "@/features/database";
import type { ImagePickResult } from "./image-picker";
import type { ImageChange, ImageWriteResult } from "./records";

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
  | { type: "add-image-note"; designId: string; change: AddNoteChange }
  | { type: "remove-image-note"; designId: string; change: RemoveNoteChange };

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

/** The change one attempt declares, narrowed from the write path's one union. */
type AddNoteChange = Extract<ImageChange, { kind: "add-note" }>;
type RemoveNoteChange = Extract<ImageChange, { kind: "remove-note" }>;

/** The picker's answer that picked no file: a change of mind, or a refused permission. */
type PickEnding = Extract<ImagePickResult, { kind: "cancelled" } | { kind: "denied" }>;

/** The ending a write gives instead of a result: it threw. */
type ThrownEnding = { kind: "thrown" };

/**
 * The rule that refused a write, naming one of the fields that write itself
 * decides. Each write's ending narrows it, so an attach cannot answer with a
 * note's rule, nor a note with a structural one.
 */
type RefusedOn<Field> = Extract<ImageWriteResult, { kind: "refused" }> & { field: Field };

/**
 * What one attach gesture answered: the picker's answer when it picked no file,
 * the write's answer when it did, or the fact the pick or the write threw. A
 * throw is one ending either way — the images did not land — so the fold never
 * has to know which call failed.
 */
type AttachEnding =
  | PickEnding
  | Extract<ImageWriteResult, { kind: "stored" | "design-missing" }>
  | RefusedOn<"images" | "kind">
  | ThrownEnding;

/** What one add-note answered: the note it stored, the rule that refused it, a row it missed, or a throw. */
type AddNoteEnding =
  | Extract<ImageWriteResult, { kind: "image-note-stored" | "design-missing" | "image-missing" }>
  | RefusedOn<"image-note">
  | ThrownEnding;

/** What one remove-note answered: the note it removed, a row it missed, or a throw. */
type RemoveNoteEnding =
  | Extract<
      ImageWriteResult,
      { kind: "image-note-removed" | "design-missing" | "image-note-missing" }
    >
  | ThrownEnding;

/** One attempt to attach: every ending the pick or the write can give. */
type GalleryAttachAttempt = { type: "attach"; ending: AttachEnding };

/** One declared note, bound to the image it belongs to. */
type GalleryAddNoteAttempt = { type: "add-note"; change: AddNoteChange; ending: AddNoteEnding };

/** One declared note removal. */
type GalleryRemoveNoteAttempt = {
  type: "remove-note";
  change: RemoveNoteChange;
  ending: RemoveNoteEnding;
};

/**
 * One gallery write attempt: the change the gallery declared where its fold
 * reads it, and the ending it observed. Each write carries only the endings it
 * can reach plus the throw, so the fold is total over these unions and has no
 * branch for an ending its write cannot produce.
 */
export type GalleryWriteAttempt =
  GalleryAttachAttempt | GalleryAddNoteAttempt | GalleryRemoveNoteAttempt;

/** What one write answered: the write path's result, or the fact it threw. */
export type GalleryWriteEnding = ImageWriteResult | ThrownEnding;

/** Whether an ending is one an attach's own attempt union lists. */
function isAttachEnding(ending: ImagePickResult | GalleryWriteEnding): ending is AttachEnding {
  switch (ending.kind) {
    case "cancelled":
    case "denied":
    case "stored":
    case "design-missing":
    case "thrown":
      return true;
    case "refused":
      return ending.field === "images" || ending.field === "kind";
    default:
      return false;
  }
}

/** Whether an ending is one an add-note's own attempt union lists. */
function isAddNoteEnding(ending: GalleryWriteEnding): ending is AddNoteEnding {
  switch (ending.kind) {
    case "image-note-stored":
    case "design-missing":
    case "image-missing":
    case "thrown":
      return true;
    case "refused":
      return ending.field === "image-note";
    default:
      return false;
  }
}

/** Whether an ending is one a remove-note's own attempt union lists. */
function isRemoveNoteEnding(ending: GalleryWriteEnding): ending is RemoveNoteEnding {
  switch (ending.kind) {
    case "image-note-removed":
    case "image-note-missing":
    case "design-missing":
    case "thrown":
      return true;
    default:
      return false;
  }
}

/**
 * The attempt one attach gesture made: the answer the pick or the write gave.
 * The picker's answer and the write path's one return union are both inputs to
 * one gesture, and neither can say that an attach reaches a structural ending
 * and a note does not, so the answer is checked against the attach's own union:
 * a matched one folds, and an ending the gesture cannot produce folds nothing.
 */
export function attachAttempt(
  answer: ImagePickResult | GalleryWriteEnding,
): GalleryWriteAttempt | null {
  return isAttachEnding(answer) ? { type: "attach", ending: answer } : null;
}

/**
 * The attempt one note write made: the change the gallery declared, and the
 * answer the write path gave. The write path's one return union cannot say that
 * an add-note reaches a note's endings and a removal a removal's, so each write
 * checks the ending against its own union: a matched one folds, and an ending
 * its write cannot produce folds nothing.
 */
export function noteAttempt(
  change: AddNoteChange | RemoveNoteChange,
  ending: GalleryWriteEnding,
): GalleryWriteAttempt | null {
  if (change.kind === "add-note") {
    return isAddNoteEnding(ending) ? { type: "add-note", change, ending } : null;
  }

  return isRemoveNoteEnding(ending) ? { type: "remove-note", change, ending } : null;
}

/**
 * What an attach owes: a cancel and a stored write say nothing — the live read
 * carries the landing, and a change of mind is not a failure — while a denial,
 * a refusal, a vanished Design row, and a throw all say the images did not land.
 */
function attachOutcome(ending: AttachEnding): GalleryEvent[] {
  switch (ending.kind) {
    case "cancelled":
    case "stored":
      return [];
    case "denied":
    case "refused":
    case "design-missing":
    case "thrown":
      return [{ type: "attach-failed" }];
  }
}

/**
 * What an add-note owes: only the stored note is an event, and its rule closes
 * the composer it was written in. A refusal, a missed row, and a throw owe
 * nothing, so the composer keeps the owner's words.
 */
function addNoteOutcome(change: AddNoteChange, ending: AddNoteEnding): GalleryEvent[] {
  switch (ending.kind) {
    case "image-note-stored":
      return [{ type: "image-note-added", imageId: change.imageId }];
    case "refused":
    case "design-missing":
    case "image-missing":
    case "thrown":
      return [];
  }
}

/**
 * What a remove-note owes: nothing, whatever the ending. The live read drops
 * the row when the write lands, and a note still on screen simply stays, so the
 * owner is never shown an invented error.
 */
function removeNoteOutcome(ending: RemoveNoteEnding): GalleryEvent[] {
  switch (ending.kind) {
    case "image-note-removed":
    case "image-note-missing":
    case "design-missing":
    case "thrown":
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
      return attachOutcome(attempt.ending);
    case "add-note":
      return addNoteOutcome(attempt.change, attempt.ending);
    case "remove-note":
      return removeNoteOutcome(attempt.ending);
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
      // a refusal or a thrown write keeps the owner's words.
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
