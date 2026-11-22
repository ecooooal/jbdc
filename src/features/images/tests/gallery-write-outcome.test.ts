import {
  noteAttempt,
  writeOutcome,
  type GalleryEvent,
  type GalleryWriteAttempt,
} from "../lib/gallery-reducer";
import type { Image, ImageNote } from "../lib/images";

const DESIGN_ID = "design-silk-slip";
const IMAGE_ID = "image-sketch-one";
const NOTE_ID = "note-collar";
const NOW = 1_700_000_000_000;

const IMAGE: Image = {
  id: IMAGE_ID,
  designId: DESIGN_ID,
  contentHash: "hash-silk-sketch",
  extension: "jpg",
  kind: "sketch",
  createdAt: NOW,
};

const NOTE: ImageNote = {
  id: NOTE_ID,
  imageId: IMAGE_ID,
  text: "The collar sits high.",
  createdAt: NOW,
};

/** The endings each write can reach, read off the attempt union itself. */
type AttachEnding = Extract<GalleryWriteAttempt, { type: "attach" }>["ending"];
type AddNoteEnding = Extract<GalleryWriteAttempt, { type: "add-note" }>["ending"];
type RemoveNoteEnding = Extract<GalleryWriteAttempt, { type: "remove-note" }>["ending"];

/** One attach of one file to the stage the gallery shows. */
function attach(ending: AttachEnding): GalleryWriteAttempt {
  return {
    type: "attach",
    change: {
      kind: "attach",
      images: [{ sourcePath: "/tmp/opencode/sketch.jpg", kind: "sketch" }],
    },
    ending,
  };
}

/** One note declared for the image the composer was opened on. */
function addNote(ending: AddNoteEnding): GalleryWriteAttempt {
  return {
    type: "add-note",
    change: { kind: "add-note", imageId: IMAGE_ID, text: NOTE.text },
    ending,
  };
}

/** One note declared for removal. */
function removeNote(ending: RemoveNoteEnding): GalleryWriteAttempt {
  return {
    type: "remove-note",
    change: { kind: "remove-note", noteId: NOTE_ID },
    ending,
  };
}

/** The one event a failed attach owes: the rail says the images did not land. */
const FAILED: GalleryEvent = { type: "attach-failed" };

/** The one event a stored note owes: the composer it was written in closes. */
const ADDED: GalleryEvent = { type: "image-note-added", imageId: IMAGE_ID };

/**
 * Every ending of every gallery write, each against exactly the events it owes.
 * The stored images and the Event ride the live read, so only the notes' own
 * landing and the attach's failure have anything to say.
 */
const ROWS: readonly { name: string; attempt: GalleryWriteAttempt; events: GalleryEvent[] }[] = [
  // Attach: a cancel and a stored write say nothing; the other four say the
  // images did not land.
  { name: "a cancelled pick owes nothing", attempt: attach({ kind: "cancelled" }), events: [] },
  {
    name: "a denied pick owes one failed attach",
    attempt: attach({ kind: "denied" }),
    events: [FAILED],
  },
  {
    name: "a stored attach owes nothing: the live read carries the landing",
    attempt: attach({ kind: "stored", images: [IMAGE], event: null }),
    events: [],
  },
  {
    name: "a refused attach owes one failed attach",
    attempt: attach({ kind: "refused", field: "images", message: "Choose at least one image." }),
    events: [FAILED],
  },
  {
    name: "an attach whose Design row vanished owes one failed attach",
    attempt: attach({ kind: "design-missing" }),
    events: [FAILED],
  },
  {
    name: "an attach whose write threw owes one failed attach",
    attempt: attach({ kind: "thrown" }),
    events: [FAILED],
  },

  // Add-note: only the stored note is an event; every other ending leaves the
  // composer open, so the owner's words are never lost to a refusal.
  {
    name: "a stored note adds the note",
    attempt: addNote({ kind: "image-note-stored", note: NOTE }),
    events: [ADDED],
  },
  {
    name: "a refused note owes nothing: the composer keeps its words",
    attempt: addNote({ kind: "refused", field: "image-note", message: "A note has a cap." }),
    events: [],
  },
  {
    name: "a note for a vanished image owes nothing",
    attempt: addNote({ kind: "image-missing", imageId: IMAGE_ID }),
    events: [],
  },
  {
    name: "a note whose Design row vanished owes nothing",
    attempt: addNote({ kind: "design-missing" }),
    events: [],
  },
  {
    name: "a note whose write threw owes nothing",
    attempt: addNote({ kind: "thrown" }),
    events: [],
  },

  // Remove-note: every ending owes nothing. The live read is the only answer.
  {
    name: "a removed note owes nothing: the live read drops the row",
    attempt: removeNote({ kind: "image-note-removed", note: NOTE }),
    events: [],
  },
  {
    name: "a note that was already gone owes nothing",
    attempt: removeNote({ kind: "image-note-missing", noteId: NOTE_ID }),
    events: [],
  },
  {
    name: "a removal whose Design row vanished owes nothing",
    attempt: removeNote({ kind: "design-missing" }),
    events: [],
  },
  {
    name: "a removal whose write threw owes nothing",
    attempt: removeNote({ kind: "thrown" }),
    events: [],
  },
];

describe("a gallery write's ending", () => {
  test.each(ROWS)("$name", ({ attempt, events }) => {
    expect(writeOutcome(attempt)).toEqual(events);
  });
});

describe("a note attempt's ending", () => {
  const ADD_CHANGE = { kind: "add-note", imageId: IMAGE_ID, text: NOTE.text } as const;
  const REMOVE_CHANGE = { kind: "remove-note", noteId: NOTE_ID } as const;

  test("an ending its write cannot reach folds to nothing", () => {
    expect(noteAttempt(ADD_CHANGE, { kind: "image-note-removed", note: NOTE })).toBeNull();
    expect(noteAttempt(ADD_CHANGE, { kind: "image-note-missing", noteId: NOTE_ID })).toBeNull();
    expect(noteAttempt(REMOVE_CHANGE, { kind: "image-note-stored", note: NOTE })).toBeNull();
    expect(noteAttempt(REMOVE_CHANGE, { kind: "image-missing", imageId: IMAGE_ID })).toBeNull();
  });

  test("a refusal folds only when it names a field that write decides", () => {
    expect(
      noteAttempt(ADD_CHANGE, {
        kind: "refused",
        field: "images",
        message: "Choose at least one image.",
      }),
    ).toBeNull();
    expect(
      noteAttempt(REMOVE_CHANGE, {
        kind: "refused",
        field: "image-note",
        message: "A note has a cap.",
      }),
    ).toBeNull();
  });

  test("an ending its union lists gives the attempt to fold", () => {
    expect(noteAttempt(ADD_CHANGE, { kind: "image-note-stored", note: NOTE })).toEqual({
      type: "add-note",
      change: ADD_CHANGE,
      ending: { kind: "image-note-stored", note: NOTE },
    });
    expect(noteAttempt(REMOVE_CHANGE, { kind: "thrown" })).toEqual({
      type: "remove-note",
      change: REMOVE_CHANGE,
      ending: { kind: "thrown" },
    });
  });
});

describe("a gallery write's refusal", () => {
  test("neither write admits the other's refusal", () => {
    // The compile is the assertion: each directive fails `pnpm typecheck` the
    // moment its write admits the refusal, so a widened arm cannot slip past
    // the table above, which only exercises endings a write can really reach.
    // @ts-expect-error an attach cannot answer with a note's refusal
    const attachWithNoteRefusal: GalleryWriteAttempt = {
      type: "attach",
      change: {
        kind: "attach",
        images: [{ sourcePath: "/tmp/opencode/sketch.jpg", kind: "sketch" }],
      },
      ending: { kind: "refused", field: "image-note", message: "A note has a cap." },
    };
    // @ts-expect-error a note cannot answer with a structural refusal
    const noteWithImagesRefusal: GalleryWriteAttempt = {
      type: "add-note",
      change: { kind: "add-note", imageId: IMAGE_ID, text: NOTE.text },
      ending: { kind: "refused", field: "images", message: "Choose at least one image." },
    };

    // Read only so both names count as used; the assertion is the compile.
    expect([attachWithNoteRefusal.ending.kind, noteWithImagesRefusal.ending.kind]).toEqual([
      "refused",
      "refused",
    ]);
  });
});
