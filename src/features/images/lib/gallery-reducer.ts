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

/** Which way the pager moved. */
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
 * the pager shows, whether the last attach failed, the note composer, and the
 * notes chrome — the menu, the note sheet, see-all, and the armed delete row.
 * The selections are ids; the live list derives the rows.
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
  /** Whether the notes button's menu is expanded. */
  notesMenuOpen: boolean;
  /** The note the read-only note sheet shows; null when the sheet is closed. */
  noteSheetId: string | null;
  /** Whether the see-all sheet lists the current image's notes. */
  allNotesOpen: boolean;
  /** The note row whose first delete press armed it; null when none is armed. */
  armedNoteId: string | null;
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
  | { type: "page-settled"; imageId: string }
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
  | { type: "notes-button-pressed" }
  | { type: "note-marker-pressed"; noteId: string }
  | { type: "note-sheet-closed" }
  | { type: "see-all-notes-opened" }
  | { type: "see-all-notes-closed" }
  | { type: "image-detail-opened" }
  | { type: "image-detail-closed" };

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
    notesMenuOpen: false,
    noteSheetId: null,
    allNotesOpen: false,
    armedNoteId: null,
  };
}

/** The stage the gallery is on, derived from the live list. */
export type GalleryView<Stage extends GalleryStage = GalleryStage> = {
  stage: Stage | null;
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
 * The stage the rail shows: the live stage for the gallery's chosen kind. The
 * pager's stage is not this one — it derives from the selected image through
 * `journeyView`. A pure derivation, so the component never repeats the
 * selection rule.
 */
export function galleryView<Stage extends GalleryStage>(
  stages: readonly Stage[],
  state: GalleryState,
): GalleryView<Stage> {
  return { stage: stages.find((candidate) => candidate.kind === state.kind) ?? null };
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

/** One card in the stage block: its stage, its image count, and whether it is active. */
export type StageCard = {
  kind: ImageKind;
  count: number;
  active: boolean;
};

/** The stage block's four cards, in journey order. */
export type StageCardsView = {
  cards: StageCard[];
};

/**
 * The four stage cards: every stage with the number of images it holds, and the
 * one the gallery is on marked active. The active card follows the current
 * image and holds the empty stage the owner chose; it never reads the Cover.
 */
export function stageCardsView(
  stages: readonly GalleryStage[],
  state: GalleryState,
): StageCardsView {
  const active = galleryView(stages, state).stage;

  return {
    cards: stages.map((stage) => ({
      kind: stage.kind,
      count: stage.images.length,
      active: stage.kind === active?.kind,
    })),
  };
}

/**
 * The notes menu as the button expands it: the count it carries and the two
 * rows it offers. There is no row that only hides the notes; pressing the
 * notes button again is the way the menu closes.
 */
export type NotesMenuAction = "add-note" | "see-all";

export type NotesMenuView = {
  count: number;
  actions: readonly NotesMenuAction[];
};

/** The menu's derivation: Add note and See all notes, oldest-first count included. */
export function notesMenuView<Note>(notes: readonly Note[]): NotesMenuView {
  return { count: notes.length, actions: ["add-note", "see-all"] };
}

/** The most numbered markers an image shows before it folds the rest into `+N`. */
export const NOTE_MARKER_LIMIT = 4;

/** One marker on the image's right edge: a numbered note, or the `+N` overflow. */
export type NoteMarker<Note> =
  { kind: "note"; note: Note; number: number } | { kind: "overflow"; count: number };

export type NotesIndexView<Note> = {
  count: number;
  markers: readonly NoteMarker<Note>[];
};

/**
 * The notes index on the current image's right edge: one numbered marker per
 * note, oldest first, capped at four with a `+N` marker for the rest. The
 * numbers derive from each note's position on every read, so a removal
 * renumbers the rest with nothing stored.
 */
export function notesIndexView<Note>(notes: readonly Note[]): NotesIndexView<Note> {
  const shown = notes.slice(0, NOTE_MARKER_LIMIT);
  const overflow = notes.length - shown.length;
  const markers: NoteMarker<Note>[] = shown.map((note, index) => ({
    kind: "note",
    note,
    number: index + 1,
  }));

  if (overflow > 0) markers.push({ kind: "overflow", count: overflow });

  return { count: notes.length, markers };
}

/**
 * The state after a selection. The notes belong to one image, so a half written
 * note, the menu, the note sheet, see-all, and the armed delete all drop as
 * soon as the current image changes; staying on the same image — a
 * reclassification, say — keeps them.
 */
function selected(state: GalleryState, kind: ImageKind, imageId: string | null): GalleryState {
  if (imageId === state.imageId) return { ...state, kind, imageId };

  return {
    ...state,
    kind,
    imageId,
    imageNoteComposer: null,
    notesMenuOpen: false,
    noteSheetId: null,
    allNotesOpen: false,
    armedNoteId: null,
  };
}

/** A result that asks for no write. */
function only(state: GalleryState): GalleryResult {
  return { state, effects: [] };
}

/**
 * The state after naming an image in the journey. A filmstrip press and a page
 * settle share this rule: the live list says which stage holds the image, so a
 * reclassification cannot leave the selection and the counter disagreeing.
 */
function imageSelected(
  state: GalleryState,
  stages: readonly GalleryStage[],
  imageId: string,
): GalleryState {
  const located = locationOf(stages, imageId);

  return located
    ? { ...selected(state, located.kind, located.imageId), awaitingKind: null }
    : state;
}

/**
 * The gallery's decisions. It opens on the Cover; a later read keeps the
 * selected image while it exists — moving it to the stage its reclassification
 * gave it — and falls back to the Cover when it is gone. An empty stage the
 * owner chose stays chosen until its first image arrives. A stage press starts
 * that stage at its oldest image; a swipe walks the journey in order, within a
 * stage and then across the next filled one, stopping at either end. A pager
 * settle selects the image it landed on, by the same rule as a thumb press. An
 * attach that failed is a flag the rail reads until the owner tries again or
 * presses a stage, and it never moves the selection. The note composer opens on
 * the current image, closes when the note lands, and is dropped when the owner
 * moves on. The notes button expands a menu with Add note and See all; a marker
 * opens one note's read-only sheet and closes the menu; see-all opens the list
 * and closes it too. A delete press only arms its row, and a second press on
 * the same row declares exactly one removal; closing the image detail disarms
 * it, so a return visit never deletes on its first press. The result carries
 * the writes the event declares: the plus press declares its pick, the notes'
 * own presses declare their writes, and every other event declares none.
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

    case "image-pressed":
    case "page-settled":
      return only(imageSelected(state, event.stages, event.imageId));

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
      // to open the composer on. Add note is a menu row, so opening the composer
      // closes the menu it was chosen from.
      return only(
        state.imageId
          ? {
              ...state,
              imageNoteComposer: { imageId: state.imageId, draft: "" },
              notesMenuOpen: false,
            }
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
      // The first press only arms its row; a second press on the same row
      // declares exactly one removal and disarms it. The live read drops the row
      // once the write lands, and arming another id replaces this one.
      if (state.armedNoteId !== event.noteId) {
        return only({ ...state, armedNoteId: event.noteId });
      }

      return {
        state: { ...state, armedNoteId: null },
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

    case "notes-button-pressed":
      return only({ ...state, notesMenuOpen: !state.notesMenuOpen });

    case "note-marker-pressed":
      // A marker is the note's own door: it opens that note's sheet and closes
      // the menu it was reached past.
      return only({ ...state, notesMenuOpen: false, noteSheetId: event.noteId });

    case "note-sheet-closed":
      return only({ ...state, noteSheetId: null });

    case "see-all-notes-opened":
      return only({
        ...state,
        noteSheetId: null,
        notesMenuOpen: false,
        allNotesOpen: true,
      });

    case "see-all-notes-closed":
      // One row is armed at a time, and closing the sheet ends the arming: a
      // return visit must never delete on its first press.
      return only({ ...state, allNotesOpen: false, armedNoteId: null });

    case "image-detail-opened":
      // The detail is the whole screen, so the in-screen menu closes behind it.
      return only({ ...state, notesMenuOpen: false });

    case "image-detail-closed":
      // One row is armed at a time, and closing the detail ends the arming: a
      // return visit must never delete on its first press.
      return only({ ...state, armedNoteId: null });
  }
}
