import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign, getDesign } from "@/features/designs";
import { writeImages } from "@/features/images";
import type { ImageStore } from "../lib/image-store";
import { createTempImageStore } from "@/features/images/testing";
import { listDesignEvents } from "@/features/history";
import { IMAGE_NOTE_MAX_LENGTH } from "../lib/image-notes";
import { listDesignImageNotes, listDesignImages } from "../lib/records";

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-note-sources-"));
  ({ store, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

/** A source file on disk, the way a picked image arrives. */
function sourceFile(name: string, contents: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, contents);

  return path;
}

function createWoolCoat(now = 500): string {
  return createDesign(database, { name: "Wool coat" }, now).id;
}

/** One Design with one attached image, and that image's id. */
async function designWithImage(now = 1000): Promise<{ designId: string; imageId: string }> {
  const designId = createWoolCoat();

  await writeImages(
    database,
    store,
    designId,
    {
      kind: "attach",
      images: [{ sourcePath: sourceFile("sketch.jpg", "sketch bytes"), kind: "sketch" }],
    },
    now,
  );

  return { designId, imageId: listDesignImages(database, designId)[0].id };
}

describe("adding a note", () => {
  test("stores it beside its image and moves the design's updatedAt, with no Event", async () => {
    const { designId, imageId } = await designWithImage(1000);
    const events = listDesignEvents(database, designId).length;

    const result = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "Widened the shoulder." },
      2000,
    );

    expect(result).toEqual({
      kind: "image-note-stored",
      note: {
        id: expect.any(String),
        imageId,
        text: "Widened the shoulder.",
        createdAt: 2000,
      },
    });
    expect(listDesignImageNotes(database, designId)).toEqual([
      expect.objectContaining({ imageId, text: "Widened the shoulder." }),
    ]);
    expect(getDesign(database, designId)?.updatedAt).toBe(2000);
    // History records the image's life, not the note's.
    expect(listDesignEvents(database, designId)).toHaveLength(events);
  });

  test("a note is trimmed, so whitespace around it is not stored", async () => {
    const { designId, imageId } = await designWithImage();

    const result = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "  Kept the collar high.  " },
      2000,
    );

    expect(result.kind === "image-note-stored" && result.note.text).toBe("Kept the collar high.");
  });

  test(`a ${IMAGE_NOTE_MAX_LENGTH}-character note is the most that is stored`, async () => {
    const { designId, imageId } = await designWithImage();
    const boundary = "a".repeat(IMAGE_NOTE_MAX_LENGTH);

    const result = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: boundary },
      2000,
    );

    expect(result.kind === "image-note-stored" && result.note.text).toHaveLength(
      IMAGE_NOTE_MAX_LENGTH,
    );
  });

  test("a note over the cap is refused quietly and nothing moves", async () => {
    const { designId, imageId } = await designWithImage(1000);
    const events = listDesignEvents(database, designId).length;

    const result = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "a".repeat(IMAGE_NOTE_MAX_LENGTH + 1) },
      2000,
    );

    expect(result).toEqual({
      kind: "refused",
      field: "image-note",
      message: `A note can be at most ${IMAGE_NOTE_MAX_LENGTH} characters.`,
    });
    expect(listDesignImageNotes(database, designId)).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);
    expect(listDesignEvents(database, designId)).toHaveLength(events);
  });

  test("a note write needs no Image store, because it copies and releases nothing", async () => {
    const { designId, imageId } = await designWithImage(1000);

    const stored = await writeImages(
      database,
      null,
      designId,
      { kind: "add-note", imageId, text: "Kept the collar high." },
      2000,
    );

    expect(stored).toMatchObject({ kind: "image-note-stored", note: { imageId } });

    const noteId = stored.kind === "image-note-stored" ? stored.note.id : "";

    expect(
      await writeImages(database, null, designId, { kind: "remove-note", noteId }, 3000),
    ).toMatchObject({ kind: "image-note-removed", note: { id: noteId } });
  });

  test("a note with no words is refused, so an empty line is never stored", async () => {
    const { designId, imageId } = await designWithImage(1000);

    expect(
      await writeImages(
        database,
        store,
        designId,
        { kind: "add-note", imageId, text: "   " },
        2000,
      ),
    ).toEqual({ kind: "refused", field: "image-note", message: "A note needs words." });
    expect(listDesignImageNotes(database, designId)).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);
  });
});

describe("removing a note", () => {
  test("removes it at once and moves the design's updatedAt, with no Event", async () => {
    const { designId, imageId } = await designWithImage(1000);

    const stored = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "First pass was fitted." },
      2000,
    );
    const noteId = stored.kind === "image-note-stored" ? stored.note.id : "";
    const events = listDesignEvents(database, designId).length;

    const result = await writeImages(
      database,
      store,
      designId,
      { kind: "remove-note", noteId },
      3000,
    );

    expect(result).toMatchObject({ kind: "image-note-removed", note: { id: noteId } });
    expect(listDesignImageNotes(database, designId)).toEqual([]);
    expect(getDesign(database, designId)?.updatedAt).toBe(3000);
    expect(listDesignEvents(database, designId)).toHaveLength(events);
  });

  test("a note that is not there answers image-note-missing", async () => {
    const { designId } = await designWithImage(1000);

    expect(
      await writeImages(database, store, designId, { kind: "remove-note", noteId: "ghost" }, 2000),
    ).toEqual({ kind: "image-note-missing", noteId: "ghost" });
    expect(getDesign(database, designId)?.updatedAt).toBe(1000);
  });
});

describe("notes dying with their image", () => {
  test("removing an image removes its notes in the same write, silently", async () => {
    const { designId, imageId } = await designWithImage(1000);

    await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "Widened the shoulder." },
      2000,
    );
    expect(listDesignImageNotes(database, designId)).toHaveLength(1);

    const events = listDesignEvents(database, designId).length;
    const result = await writeImages(database, store, designId, { kind: "remove", imageId }, 3000);

    // One Event for the image's removal, none for its notes.
    expect(events + 1).toBe(listDesignEvents(database, designId).length);
    expect(result).toMatchObject({ kind: "stored", images: [] });
    expect(listDesignImageNotes(database, designId)).toEqual([]);
  });

  test("another image's notes survive the removal", async () => {
    const designId = createWoolCoat();

    await writeImages(
      database,
      store,
      designId,
      {
        kind: "attach",
        images: [
          { sourcePath: sourceFile("first.jpg", "first bytes"), kind: "sketch" },
          { sourcePath: sourceFile("second.jpg", "second bytes"), kind: "final" },
        ],
      },
      1000,
    );

    const [first, second] = listDesignImages(database, designId);

    await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId: first.id, text: "First pass." },
      2000,
    );
    await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId: second.id, text: "Landed on this." },
      2100,
    );

    await writeImages(database, store, designId, { kind: "remove", imageId: first.id }, 3000);

    expect(listDesignImageNotes(database, designId)).toEqual([
      expect.objectContaining({ imageId: second.id, text: "Landed on this." }),
    ]);
  });
});

describe("notes reached only through their Design", () => {
  test("a note cannot be added to another Design's image", async () => {
    const { imageId } = await designWithImage();
    const otherDesign = createDesign(database, { name: "Silk slip" }, 500).id;

    expect(
      await writeImages(
        database,
        store,
        otherDesign,
        { kind: "add-note", imageId, text: "Not mine." },
        2000,
      ),
    ).toEqual({ kind: "image-missing", imageId });
  });

  test("a note cannot be removed through another Design", async () => {
    const { designId, imageId } = await designWithImage();
    const otherDesign = createDesign(database, { name: "Silk slip" }, 500).id;
    const stored = await writeImages(
      database,
      store,
      designId,
      { kind: "add-note", imageId, text: "Widened the shoulder." },
      2000,
    );
    const noteId = stored.kind === "image-note-stored" ? stored.note.id : "";

    expect(
      await writeImages(database, store, otherDesign, { kind: "remove-note", noteId }, 3000),
    ).toEqual({ kind: "image-note-missing", noteId });
    expect(listDesignImageNotes(database, designId)).toHaveLength(1);
  });

  test("a note write against a Design that is gone answers design-missing", async () => {
    const { imageId } = await designWithImage();

    expect(
      await writeImages(
        database,
        store,
        "no-such-design",
        { kind: "add-note", imageId, text: "Not mine." },
        2000,
      ),
    ).toEqual({ kind: "design-missing" });
  });
});
