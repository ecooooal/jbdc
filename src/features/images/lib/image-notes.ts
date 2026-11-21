import type { ImageNote } from "./images";

/**
 * The quiet cap on one Image note. The composer lets the owner type past it and
 * the write path refuses what is over, so nothing over the cap is ever stored
 * and nothing interrupts her to say so.
 */
export const IMAGE_NOTE_MAX_LENGTH = 280;

/**
 * The one Image note rule, judged by the write path. A note is trimmed before
 * it is judged, so whitespace alone is empty.
 */
export function imageNoteProblem(body: string): "empty" | "too_long" | null {
  const trimmed = body.trim();

  if (trimmed.length === 0) return "empty";
  if (trimmed.length > IMAGE_NOTE_MAX_LENGTH) return "too_long";

  return null;
}

/**
 * The one sentence a refused note carries. A refusal is quiet on screen: the
 * composer keeps what was typed and adds nothing.
 */
export function imageNoteProblemMessage(problem: "empty" | "too_long"): string {
  return problem === "empty"
    ? "A note needs words."
    : `A note can be at most ${IMAGE_NOTE_MAX_LENGTH} characters.`;
}

/**
 * One image's notes, in the order the read returned them: oldest first, so the
 * list reads as commentary on the picture rather than a feed. A surface with no
 * image selected has no notes.
 */
export function imageNotesOf(notes: readonly ImageNote[], imageId: string | null): ImageNote[] {
  if (!imageId) return [];

  return notes.filter((note) => note.imageId === imageId);
}
