import { useCallback, type Dispatch } from "react";
import { useDatabase } from "@/features/database/react";
import type { GalleryEvent } from "./gallery-reducer";
import { writeImages } from "./records";

/**
 * The note block's writes: add one note to the image it belongs to, or remove
 * one at once. Both go through the images module's one write path, which moves
 * the Design's `updatedAt` and records no Event. A refused note (over its cap,
 * or empty) and a write that throws say nothing at all: the composer keeps the
 * words so a refusal never reads as an error. Removing needs no answer — the
 * live read drops the row the moment the write lands. Neither write touches a
 * stored file, so neither needs an Image store.
 */
export function useImageNoteWrites(designId: string, dispatch: Dispatch<GalleryEvent>) {
  const database = useDatabase();

  const addNote = useCallback(
    async (imageId: string, text: string) => {
      try {
        const result = await writeImages(database, null, designId, {
          kind: "add-note",
          imageId,
          text,
        });

        // A refusal leaves the draft where it is; only the stored note closes
        // the composer.
        if (result.kind === "image-note-stored") dispatch({ type: "image-note-added", imageId });
      } catch {
        // A write that throws leaves the draft on screen, so the words are not
        // lost to a failure the note block has no way to report quietly.
      }
    },
    [database, designId, dispatch],
  );

  const removeNote = useCallback(
    async (noteId: string) => {
      try {
        await writeImages(database, null, designId, { kind: "remove-note", noteId });
      } catch {
        // The live read is the truth: a note still there after a failed removal
        // simply stays on screen.
      }
    },
    [database, designId],
  );

  return { addNote, removeNote };
}
