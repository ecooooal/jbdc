import type { GalleryState } from "../lib/gallery-reducer";
import { DESIGN_ID, journey, noNoteUI, onImage, send, stage } from "./gallery-reducer-fixtures";

/** A gallery on one image with the notes sheet open. */
function sheetOpen(state: GalleryState = onImage("s1")): GalleryState {
  return send(state, { type: "notes-button-pressed" }).state;
}

describe("opening the notes sheet", () => {
  test("the notes button opens the notes sheet", () => {
    const opened = send(onImage("s1"), { type: "notes-button-pressed" });

    expect(opened.state.notesSheetOpen).toBe(true);
    expect(opened.effects).toEqual([]);
  });

  test("pressing the notes button again leaves the sheet open", () => {
    const opened = sheetOpen();
    const again = send(opened, { type: "notes-button-pressed" });

    expect(again.state).toEqual(opened);
    expect(again.effects).toEqual([]);
  });

  test("closing the notes sheet collapses the composer and disarms the row", () => {
    const closed = send(
      {
        ...onImage("s1"),
        notesSheetOpen: true,
        imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
        armedNoteId: "n1",
      },
      { type: "notes-sheet-closed" },
    );

    expect(closed.state).toEqual({ ...onImage("s1"), ...noNoteUI });
    expect(closed.effects).toEqual([]);
  });
});

describe("the notes sheet's composer", () => {
  test("Add note expands the composer on the current image", () => {
    const expanded = send(sheetOpen(), { type: "image-note-composer-opened" });

    expect(expanded.state.imageNoteComposer).toEqual({ imageId: "s1", draft: "" });
    expect(expanded.state.notesSheetOpen).toBe(true);
    expect(expanded.effects).toEqual([]);
  });

  test("a stored note collapses the composer and leaves the sheet open", () => {
    const typed = sheetOpen({
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
    });

    const stored = send(typed, { type: "image-note-added", imageId: "s1" });

    expect(stored.state).toEqual({ ...onImage("s1"), ...noNoteUI, notesSheetOpen: true });
    expect(stored.effects).toEqual([]);
  });
});

describe("the notes belong to their image", () => {
  test("an image change closes the sheet, drops the composer, and clears the armed note", () => {
    const changed = send(
      {
        ...onImage("s1"),
        notesSheetOpen: true,
        imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
        armedNoteId: "n1",
      },
      { type: "hero-swiped", direction: "next", stages: journey() },
    );

    expect(changed.state).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(changed.effects).toEqual([]);
  });

  test("a read that keeps the selection keeps the sheet and the composer", () => {
    const open: GalleryState = {
      ...onImage("s1"),
      notesSheetOpen: true,
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
      armedNoteId: "n1",
    };

    const kept = send(open, {
      type: "images-read",
      stages: [
        stage("inspiration"),
        stage("sketch", "s1", "s2"),
        stage("prototype"),
        stage("final"),
      ],
      cover: "s2",
    });

    expect(kept.state).toEqual(open);
    expect(kept.effects).toEqual([]);
  });

  test("a read that moves the selection resets the note UI", () => {
    const open: GalleryState = {
      ...onImage("s1"),
      notesSheetOpen: true,
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
      armedNoteId: "n1",
    };

    const moved = send(open, {
      type: "images-read",
      stages: [stage("inspiration"), stage("sketch", "s2"), stage("prototype"), stage("final")],
      cover: "s2",
    });

    expect(moved.state).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(moved.effects).toEqual([]);
  });
});

describe("the two-step delete", () => {
  test("the first press only arms one row", () => {
    const first = send(sheetOpen(), { type: "image-note-delete-pressed", noteId: "n1" });

    expect(first.state.armedNoteId).toBe("n1");
    expect(first.effects).toEqual([]);
  });

  test("the second press declares exactly one removal and disarms the row", () => {
    const armed = send(sheetOpen(), { type: "image-note-delete-pressed", noteId: "n1" }).state;
    const second = send(armed, { type: "image-note-delete-pressed", noteId: "n1" });

    expect(second.state.armedNoteId).toBeNull();
    expect(second.state.notesSheetOpen).toBe(true);
    expect(second.effects).toEqual([
      {
        type: "remove-image-note",
        designId: DESIGN_ID,
        change: { kind: "remove-note", noteId: "n1" },
      },
    ]);
  });

  test("arming another row replaces the armed one", () => {
    const armed = send(sheetOpen(), { type: "image-note-delete-pressed", noteId: "n1" }).state;
    const another = send(armed, { type: "image-note-delete-pressed", noteId: "n2" });

    expect(another.state.armedNoteId).toBe("n2");
    expect(another.effects).toEqual([]);
  });

  test("closing the image detail disarms the row and leaves the sheet open", () => {
    const armed = send(sheetOpen(), { type: "image-note-delete-pressed", noteId: "n1" }).state;
    const closed = send(armed, { type: "image-detail-closed" });

    expect(closed.state).toEqual({ ...armed, armedNoteId: null });
    expect(closed.effects).toEqual([]);
  });
});
