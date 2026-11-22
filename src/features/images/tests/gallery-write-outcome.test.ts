import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { writeImages } from "@/features/images";
import { createTempImageStore } from "@/features/images/testing";
import { writeOutcome, type GalleryEvent, type GalleryWriteAttempt } from "../lib/gallery-reducer";
import type { ImagePickResult } from "../lib/image-picker";
import type { ImageStore } from "../lib/image-store";
import type {
  ImageAddNoteChange,
  ImageAddNoteResult,
  ImageAttachChange,
  ImageAttachResult,
  ImageRemoveNoteChange,
  ImageRemoveNoteResult,
} from "../lib/records";

const NOW = 1_700_000_000_000;
const NOTE_TEXT = "The collar sits high.";
/** An id that is no row, so the write path answers the row-missing ending. */
const MISSING_ID = "not-a-row";

/** The picker's endings, which answer a press that never reached a write. */
type PickEnding = Extract<ImagePickResult, { kind: "cancelled" } | { kind: "denied" }>;

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let disposeStore: () => void;
let designId: string;
let imageId: string;
let noteId: string;

/** A source file on disk, the way a picked image arrives. */
function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, contents);

  return path;
}

/** The one event a failed attach owes: the rail says the images did not land. */
const FAILED: GalleryEvent = { type: "attach-failed" };

beforeEach(async () => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-outcome-sources-"));
  ({ store, dispose: disposeStore } = createTempImageStore());
  designId = createDesign(database, { name: "Silk slip" }, NOW).id;

  const attached = await writeImages(
    database,
    store,
    designId,
    {
      kind: "attach",
      images: [{ sourcePath: sourceFile("sketch.jpg", "sketch bytes"), kind: "sketch" }],
    },
    NOW,
  );

  if (attached.kind !== "stored") throw new Error("The fixture image did not land.");
  imageId = attached.images[0].id;

  const noted = await writeImages(
    database,
    null,
    designId,
    { kind: "add-note", imageId, text: NOTE_TEXT },
    NOW,
  );

  if (noted.kind !== "image-note-stored") throw new Error("The fixture note did not land.");
  noteId = noted.note.id;
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

/** An attach whose ending came before any write: the picker answered. */
function attachPicked(ending: PickEnding): GalleryWriteAttempt {
  return { type: "attach", ending };
}

/** One attach performed by the write path, ending read from its own attach result. */
async function attachWritten(
  change: ImageAttachChange,
  design = designId,
  imageStore: ImageStore | null = store,
): Promise<GalleryWriteAttempt> {
  const ending: ImageAttachResult = await writeImages(database, imageStore, design, change, NOW);

  return { type: "attach", ending };
}

/** A store that cannot read a picked file, so the write path answers store-failed. */
function failingStore(): ImageStore {
  return {
    ...store,
    async copy() {
      throw new Error("unreadable picked file");
    },
  };
}

/** One declared note whose write landed, or answered a refusal. */
async function addNoteWritten(
  change: ImageAddNoteChange,
  design = designId,
): Promise<GalleryWriteAttempt> {
  const ending: ImageAddNoteResult = await writeImages(database, null, design, change, NOW);

  return { type: "add-note", change, ending };
}

/** One note removal performed by the write path, ending read from its own remove-note result. */
async function removeNoteWritten(
  change: ImageRemoveNoteChange,
  design = designId,
): Promise<GalleryWriteAttempt> {
  const ending: ImageRemoveNoteResult = await writeImages(database, null, design, change, NOW);

  return { type: "remove-note", change, ending };
}

/**
 * Every ending of every gallery write, each against exactly the events it owes.
 * The write path produces every ending it can reach, against a real temp
 * database and image store; only the picker's two answers are hand-built,
 * because no write produces them. The stored images and the Event ride the live
 * read, so only the notes' own landing and the attach's failure have anything
 * to say.
 */
const ROWS: readonly {
  name: string;
  attempt: () => Promise<GalleryWriteAttempt>;
  events: () => GalleryEvent[];
}[] = [
  // Attach: a cancel and a stored write say nothing; the other four say the
  // images did not land.
  {
    name: "a cancelled pick owes nothing",
    attempt: async () => attachPicked({ kind: "cancelled" }),
    events: () => [],
  },
  {
    name: "a denied pick owes one failed attach",
    attempt: async () => attachPicked({ kind: "denied" }),
    events: () => [FAILED],
  },
  {
    name: "a stored attach owes nothing: the live read carries the landing",
    attempt: () =>
      attachWritten({
        kind: "attach",
        images: [{ sourcePath: sourceFile("stored.jpg", "stored bytes"), kind: "sketch" }],
      }),
    events: () => [],
  },
  {
    name: "a refused attach owes one failed attach",
    attempt: () => attachWritten({ kind: "attach", images: [] }),
    events: () => [FAILED],
  },
  {
    name: "an attach whose Design row vanished owes one failed attach",
    attempt: () =>
      attachWritten(
        {
          kind: "attach",
          images: [{ sourcePath: sourceFile("vanished.jpg", "vanished bytes"), kind: "sketch" }],
        },
        MISSING_ID,
      ),
    events: () => [FAILED],
  },
  {
    name: "an attach whose copy failed owes one failed attach",
    attempt: () =>
      attachWritten(
        {
          kind: "attach",
          images: [
            { sourcePath: sourceFile("unreadable.jpg", "unreadable bytes"), kind: "sketch" },
          ],
        },
        designId,
        failingStore(),
      ),
    events: () => [FAILED],
  },
  {
    name: "an attach with no store owes one failed attach",
    attempt: () =>
      attachWritten(
        {
          kind: "attach",
          images: [{ sourcePath: sourceFile("stray.jpg", "stray bytes"), kind: "sketch" }],
        },
        designId,
        null,
      ),
    events: () => [FAILED],
  },

  // Add-note: only the stored note is an event; every other ending leaves the
  // composer open, so the owner's words are never lost to a refusal.
  {
    name: "a stored note adds the note",
    attempt: () => addNoteWritten({ kind: "add-note", imageId, text: NOTE_TEXT }),
    events: () => [{ type: "image-note-added", imageId }],
  },
  {
    name: "a refused note owes nothing: the composer keeps its words",
    attempt: () => addNoteWritten({ kind: "add-note", imageId, text: "   " }),
    events: () => [],
  },
  {
    name: "a note for a vanished image owes nothing",
    attempt: () => addNoteWritten({ kind: "add-note", imageId: MISSING_ID, text: NOTE_TEXT }),
    events: () => [],
  },
  {
    name: "a note whose Design row vanished owes nothing",
    attempt: () => addNoteWritten({ kind: "add-note", imageId, text: NOTE_TEXT }, MISSING_ID),
    events: () => [],
  },

  // Remove-note: every ending owes nothing. The live read is the only answer.
  {
    name: "a removed note owes nothing: the live read drops the row",
    attempt: () => removeNoteWritten({ kind: "remove-note", noteId }),
    events: () => [],
  },
  {
    name: "a note that was already gone owes nothing",
    attempt: () => removeNoteWritten({ kind: "remove-note", noteId: MISSING_ID }),
    events: () => [],
  },
  {
    name: "a removal whose Design row vanished owes nothing",
    attempt: () => removeNoteWritten({ kind: "remove-note", noteId }, MISSING_ID),
    events: () => [],
  },
];

describe("a gallery write's ending", () => {
  test.each(ROWS)("$name", async ({ attempt, events }) => {
    expect(writeOutcome(await attempt())).toEqual(events());
  });
});
