import { notesIndexView, notesMenuView, type GalleryState } from "../lib/gallery-reducer";
import { DESIGN_ID, journey, noNoteUI, onImage, send, stage } from "./gallery-reducer-fixtures";

const NOTES = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** A gallery on one image with the notes menu open. */
function menuOpen(): GalleryState {
  return send(onImage("s1"), { type: "notes-button-pressed" }).state;
}

/** A gallery on one image with see-all open and its first row armed. */
function armed(): GalleryState {
  return send(
    { ...onImage("s1"), allNotesOpen: true },
    { type: "image-note-delete-pressed", noteId: "n1" },
  ).state;
}

describe("the notes menu", () => {
  test("opens from the notes button", () => {
    const opened = send(onImage("s1"), { type: "notes-button-pressed" });

    expect(opened.state.notesMenuOpen).toBe(true);
    expect(opened.effects).toEqual([]);
  });

  test("closes when the notes button is pressed again", () => {
    const closed = send(menuOpen(), { type: "notes-button-pressed" });

    expect(closed.state.notesMenuOpen).toBe(false);
    expect(closed.effects).toEqual([]);
  });

  test("offers Add note and See all notes", () => {
    expect(notesMenuView(NOTES)).toEqual({
      count: 6,
      actions: ["add-note", "see-all"],
    });
  });

  test("has no action that only hides the notes", () => {
    expect(notesMenuView(NOTES).actions).not.toContain("hide");
  });

  test("Add note opens the composer and closes the menu", () => {
    const composer = send(menuOpen(), { type: "image-note-composer-opened" });

    expect(composer.state.imageNoteComposer).toEqual({ imageId: "s1", draft: "" });
    expect(composer.state.notesMenuOpen).toBe(false);
    expect(composer.effects).toEqual([]);
  });

  test("See all notes opens see-all and closes the menu", () => {
    const seeAll = send(menuOpen(), { type: "see-all-notes-opened" });

    expect(seeAll.state.allNotesOpen).toBe(true);
    expect(seeAll.state.notesMenuOpen).toBe(false);
    expect(seeAll.effects).toEqual([]);
  });

  test("a marker press opens that note's sheet and closes the menu", () => {
    const sheet = send(menuOpen(), { type: "note-marker-pressed", noteId: "n2" });

    expect(sheet.state.noteSheetId).toBe("n2");
    expect(sheet.state.notesMenuOpen).toBe(false);
    expect(sheet.effects).toEqual([]);
  });

  test("closing the note sheet leaves the note UI as it was", () => {
    const closed = send({ ...onImage("s1"), noteSheetId: "n2" }, { type: "note-sheet-closed" });

    expect(closed.state).toEqual({ ...onImage("s1"), ...noNoteUI });
    expect(closed.effects).toEqual([]);
  });

  test("opening the image detail closes the menu", () => {
    const detail = send(menuOpen(), { type: "image-detail-opened" });

    expect(detail.state.notesMenuOpen).toBe(false);
    expect(detail.effects).toEqual([]);
  });
});

describe("the two-step delete", () => {
  test("the first press only arms one row", () => {
    const first = send(
      { ...onImage("s1"), allNotesOpen: true },
      { type: "image-note-delete-pressed", noteId: "n1" },
    );

    expect(first.state.armedNoteId).toBe("n1");
    expect(first.effects).toEqual([]);
  });

  test("the second press declares exactly one removal and disarms the row", () => {
    const second = send(armed(), { type: "image-note-delete-pressed", noteId: "n1" });

    expect(second.state.armedNoteId).toBeNull();
    expect(second.effects).toEqual([
      {
        type: "remove-image-note",
        designId: DESIGN_ID,
        change: { kind: "remove-note", noteId: "n1" },
      },
    ]);
  });

  test("arming another row disarms the first", () => {
    const another = send(armed(), { type: "image-note-delete-pressed", noteId: "n2" });

    expect(another.state.armedNoteId).toBe("n2");
    expect(another.effects).toEqual([]);
  });

  test("closing see-all disarms the row", () => {
    const closed = send(armed(), { type: "see-all-notes-closed" });

    expect(closed.state).toEqual({ ...onImage("s1"), ...noNoteUI });
    expect(closed.effects).toEqual([]);
  });

  test("an image change clears the armed note", () => {
    const changed = send(armed(), {
      type: "hero-swiped",
      direction: "next",
      stages: journey(),
    });

    expect(changed.state.armedNoteId).toBeNull();
    expect(changed.effects).toEqual([]);
  });

  test("an image change closes the note sheet", () => {
    const changed = send(send(onImage("s1"), { type: "note-marker-pressed", noteId: "n1" }).state, {
      type: "hero-swiped",
      direction: "next",
      stages: journey(),
    });

    expect(changed.state).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(changed.effects).toEqual([]);
  });

  test("a read that keeps the selection keeps the note UI and one that moves it resets it", () => {
    const open: GalleryState = {
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
      notesMenuOpen: true,
      noteSheetId: "n1",
      allNotesOpen: true,
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

    const moved = send(kept.state, {
      type: "images-read",
      stages: [stage("inspiration"), stage("sketch", "s2"), stage("prototype"), stage("final")],
      cover: "s2",
    });

    expect(moved.state).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(moved.effects).toEqual([]);
  });
});

describe("the notes index", () => {
  test("numbers the markers oldest first", () => {
    expect(notesIndexView(NOTES.slice(0, 3)).markers).toEqual([
      { kind: "note", note: "first", number: 1 },
      { kind: "note", note: "second", number: 2 },
      { kind: "note", note: "third", number: 3 },
    ]);
  });

  test("shows four markers and folds the rest into one overflow marker", () => {
    const view = notesIndexView(NOTES);

    expect(view.count).toBe(6);
    expect(view.markers).toEqual([
      { kind: "note", note: "first", number: 1 },
      { kind: "note", note: "second", number: 2 },
      { kind: "note", note: "third", number: 3 },
      { kind: "note", note: "fourth", number: 4 },
      { kind: "overflow", count: 2 },
    ]);
  });

  test("a removal renumbers the remaining markers", () => {
    const remaining = notesIndexView(["first", "third"]);

    expect(remaining.markers).toEqual([
      { kind: "note", note: "first", number: 1 },
      { kind: "note", note: "third", number: 2 },
    ]);
  });
});
