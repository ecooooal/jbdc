import { and, count, eq, isNull } from "drizzle-orm";
import {
  declareLiveRead,
  designs,
  imageNotes,
  images,
  IMAGE_KINDS,
  type Database,
  type DatabaseHandle,
  type ImageKind,
  type LiveReadDeclaration,
} from "@/features/database";
import { recordImageChange, type DesignEvent, type RecordedImage } from "@/features/history";
import { imageNoteProblem, imageNoteProblemMessage } from "./image-notes";
import type { Image, ImageNote } from "./images";
import type { ImageFile, ImageStore } from "./image-store";

/** The image kinds, for the runtime check a caller outside TypeScript can reach. */
const KINDS: readonly string[] = IMAGE_KINDS;

const EMPTY_ATTACH_MESSAGE = "Choose at least one image.";
const UNKNOWN_KIND_MESSAGE = "An image needs one of the four kinds.";

/** One file to attach, with the kind the owner chose for it. */
export type ImageAttach = {
  /** A file on disk, before it is copied into the catalog's image directory. */
  sourcePath: string;
  kind: ImageKind;
};

/**
 * One change to a Design's images: attach one or more files, change one image's
 * kind, remove one image, or add or remove one Image note. Attaching several
 * files at once is one action and records one Event; a note write records none,
 * because History records the image's life, not the note's.
 */
export type ImageChange =
  | { kind: "attach"; images: readonly ImageAttach[] }
  | { kind: "reclassify"; imageId: string; to: ImageKind }
  | { kind: "remove"; imageId: string }
  | { kind: "add-note"; imageId: string; text: string }
  | { kind: "remove-note"; noteId: string };

/**
 * What one image write produced: the Design's images after a structural change
 * and the one Event it recorded (null when the write changed nothing), the note
 * it stored or removed, the rule that refused it, or the row it could not find.
 */
export type ImageWriteResult =
  | { kind: "stored"; images: Image[]; event: DesignEvent | null }
  | { kind: "note-stored"; note: ImageNote }
  | { kind: "note-removed"; note: ImageNote }
  | { kind: "refused"; field: "images" | "kind" | "note"; message: string }
  | { kind: "design-missing" }
  | { kind: "image-missing"; imageId: string }
  | { kind: "note-missing"; noteId: string };

/** The one image record History keeps in an Event's diff. */
function recorded(image: Image): RecordedImage {
  return {
    id: image.id,
    kind: image.kind,
    contentHash: image.contentHash,
    extension: image.extension,
  };
}

/** One Design's images, oldest first, so a stage reads as a chronicle. */
function imagesFrom(db: DatabaseHandle, designId: string): Image[] {
  return db
    .select()
    .from(images)
    .where(eq(images.designId, designId))
    .orderBy(images.createdAt, images.id)
    .all();
}

/** Whether a live Design row is there to write to. */
function designExists(db: DatabaseHandle, designId: string): boolean {
  return (
    db
      .select({ id: designs.id })
      .from(designs)
      .where(and(eq(designs.id, designId), isNull(designs.deletedAt)))
      .get() !== undefined
  );
}

/** One Design's image by id, or null when it is not that Design's. */
function imageFrom(db: DatabaseHandle, designId: string, imageId: string): Image | null {
  return (
    db
      .select()
      .from(images)
      .where(and(eq(images.id, imageId), eq(images.designId, designId)))
      .get() ?? null
  );
}

/** The note columns, selected explicitly so a joined read answers an ImageNote. */
const NOTE_COLUMNS = {
  id: imageNotes.id,
  imageId: imageNotes.imageId,
  text: imageNotes.text,
  createdAt: imageNotes.createdAt,
};

/** Every note on one Design's images, oldest first, so a list reads as it was written. */
function notesFrom(db: DatabaseHandle, designId: string): ImageNote[] {
  return db
    .select(NOTE_COLUMNS)
    .from(imageNotes)
    .innerJoin(images, eq(images.id, imageNotes.imageId))
    .where(eq(images.designId, designId))
    .orderBy(imageNotes.createdAt, imageNotes.id)
    .all();
}

/**
 * One note by id, or null when it does not belong to an image of this Design —
 * a note is reached only through the image it explains.
 */
function noteFrom(db: DatabaseHandle, designId: string, noteId: string): ImageNote | null {
  return (
    db
      .select(NOTE_COLUMNS)
      .from(imageNotes)
      .innerJoin(images, eq(images.id, imageNotes.imageId))
      .where(and(eq(imageNotes.id, noteId), eq(images.designId, designId)))
      .get() ?? null
  );
}

/**
 * How many images, in the whole catalog, still reference one stored file. The
 * store keys a file by its bytes and its extension, so both must match.
 */
function references(db: DatabaseHandle, file: ImageFile): number {
  return (
    db
      .select({ count: count() })
      .from(images)
      .where(and(eq(images.contentHash, file.contentHash), eq(images.extension, file.extension)))
      .get()?.count ?? 0
  );
}

/** Deletes a stored file only when no image row, on any Design, still holds it. */
function releaseIfUnreferenced(db: DatabaseHandle, store: ImageStore, file: ImageFile): void {
  if (references(db, file) === 0) store.remove(file);
}

/**
 * The one write path for a Design's images. A caller declares one change; this
 * function copies the files it needs into the catalog's image directory, stores
 * the image rows or the note row, moves the Design's `updatedAt`, and — for a
 * structural action only — hands History the facts for one `image_change`
 * Event, in one transaction. The file of an image whose last reference goes is
 * deleted, and a removed image takes its notes with it. It answers once: what
 * it stored, the rule that refused it, or the row it could not find.
 */
export async function writeImages(
  database: Database,
  store: ImageStore,
  designId: string,
  change: ImageChange,
  now: number = Date.now(),
): Promise<ImageWriteResult> {
  // A refusal is decided before anything is copied or written, so a refused
  // write leaves the store and the catalog exactly as they were.
  if (change.kind === "attach") {
    if (change.images.length === 0) {
      return { kind: "refused", field: "images", message: EMPTY_ATTACH_MESSAGE };
    }

    if (change.images.some((attach) => !KINDS.includes(attach.kind))) {
      return { kind: "refused", field: "kind", message: UNKNOWN_KIND_MESSAGE };
    }
  }

  if (change.kind === "reclassify" && !KINDS.includes(change.to)) {
    return { kind: "refused", field: "kind", message: UNKNOWN_KIND_MESSAGE };
  }

  if (change.kind === "add-note") {
    const problem = imageNoteProblem(change.text);

    if (problem) {
      return { kind: "refused", field: "note", message: imageNoteProblemMessage(problem) };
    }
  }

  if (change.kind === "attach") {
    // Copy before opening the transaction: a missing source fails here, so no
    // image row can point at a file the store does not have.
    const files: ImageFile[] = [];

    try {
      for (const { sourcePath } of change.images) {
        files.push(await store.copy(sourcePath));
      }
    } catch (error) {
      // A later copy failed after earlier ones landed. Release what this
      // attempt stored, keeping any file another image still references, so a
      // failed write leaves the store as it found it, and surface the failure.
      for (const file of files) releaseIfUnreferenced(database.db, store, file);

      throw error;
    }

    return database.transaction((tx) => {
      if (!designExists(tx, designId)) {
        // Nothing was written, so release whatever was just copied. A hash
        // another Design already uses stays.
        for (const file of files) releaseIfUnreferenced(tx, store, file);

        return { kind: "design-missing" };
      }

      const stored = change.images.map((attach, index): Image => {
        const file = files[index];
        const image: Image = {
          id: database.newId(),
          designId,
          contentHash: file.contentHash,
          extension: file.extension,
          kind: attach.kind,
          createdAt: now,
        };

        tx.insert(images).values(image).run();

        return image;
      });

      tx.update(designs).set({ updatedAt: now }).where(eq(designs.id, designId)).run();

      const event = recordImageChange(tx, {
        id: database.newId(),
        designId,
        changes: { attached: stored.map(recorded) },
        createdAt: now,
      });

      return { kind: "stored", images: imagesFrom(tx, designId), event };
    });
  }

  if (change.kind === "add-note") {
    return database.transaction((tx) => {
      if (!designExists(tx, designId)) return { kind: "design-missing" };

      const image = imageFrom(tx, designId, change.imageId);

      if (!image) return { kind: "image-missing", imageId: change.imageId };

      const note: ImageNote = {
        id: database.newId(),
        imageId: image.id,
        text: change.text.trim(),
        createdAt: now,
      };

      tx.insert(imageNotes).values(note).run();
      // A note is a change to the Design it explains, so the Design moves with
      // it and the Library re-sorts; no Event is recorded, because History
      // records the image's life, not the note's.
      tx.update(designs).set({ updatedAt: now }).where(eq(designs.id, designId)).run();

      return { kind: "note-stored", note };
    });
  }

  if (change.kind === "remove-note") {
    return database.transaction((tx) => {
      if (!designExists(tx, designId)) return { kind: "design-missing" };

      const note = noteFrom(tx, designId, change.noteId);

      if (!note) return { kind: "note-missing", noteId: change.noteId };

      tx.delete(imageNotes).where(eq(imageNotes.id, note.id)).run();
      tx.update(designs).set({ updatedAt: now }).where(eq(designs.id, designId)).run();

      return { kind: "note-removed", note };
    });
  }

  return database.transaction((tx) => {
    if (!designExists(tx, designId)) return { kind: "design-missing" };

    const image = imageFrom(tx, designId, change.imageId);

    if (!image) return { kind: "image-missing", imageId: change.imageId };

    if (change.kind === "reclassify") {
      // The same kind again is not a structural change: no row, no Event, and
      // no moved `updatedAt`.
      if (image.kind === change.to) {
        return { kind: "stored", images: imagesFrom(tx, designId), event: null };
      }

      const to: Image = { ...image, kind: change.to };

      tx.update(images).set({ kind: to.kind }).where(eq(images.id, image.id)).run();
      tx.update(designs).set({ updatedAt: now }).where(eq(designs.id, designId)).run();

      const event = recordImageChange(tx, {
        id: database.newId(),
        designId,
        changes: { reclassified: [{ from: recorded(image), to: recorded(to) }] },
        createdAt: now,
      });

      return { kind: "stored", images: imagesFrom(tx, designId), event };
    }

    // The image's notes go with it: the foreign key cascades inside this same
    // delete, silently, so no note outlives the picture it explains.
    tx.delete(images).where(eq(images.id, image.id)).run();
    tx.update(designs).set({ updatedAt: now }).where(eq(designs.id, designId)).run();

    const event = recordImageChange(tx, {
      id: database.newId(),
      designId,
      changes: { removed: [recorded(image)] },
      createdAt: now,
    });

    releaseIfUnreferenced(tx, store, {
      contentHash: image.contentHash,
      extension: image.extension,
    });

    return { kind: "stored", images: imagesFrom(tx, designId), event };
  });
}

/** One Design's images, oldest first. */
export function listDesignImages(database: Database, designId: string): Image[] {
  return imagesFrom(database.db, designId);
}

/** Every note on one Design's images, oldest first. */
export function listDesignImageNotes(database: Database, designId: string): ImageNote[] {
  return notesFrom(database.db, designId);
}

/** The one row shape the Design images read produces, before status. */
export type DesignImagesRows = {
  images: Image[];
  notes: ImageNote[];
};

/**
 * One Design's images and their notes as a live read. The gallery, the journey
 * rail, and the note block derive from it, so an attach, remove, reclassify, or
 * note write re-runs the screen without a manual refresh; the tables it watches
 * are declared beside the query (ADR-0005).
 */
export function designImagesRead(designId: string): LiveReadDeclaration<DesignImagesRows> {
  return declareLiveRead<DesignImagesRows>({
    tables: [images, imageNotes],
    read: (database) => ({
      images: listDesignImages(database, designId),
      notes: listDesignImageNotes(database, designId),
    }),
    empty: { images: [], notes: [] },
  });
}
