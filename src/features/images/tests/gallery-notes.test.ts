import {
  createInitialGalleryState,
  galleryReducer,
  imageNoteBlockView,
} from "../lib/gallery-reducer";
import { journey, noNoteUI, onImage, send, stage } from "./gallery-reducer-fixtures";

describe("the note composer", () => {
  test("opens on the current image with nothing written yet", () => {
    expect(send(onImage("s1"), { type: "image-note-composer-opened" })).toEqual({
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "" },
    });
  });

  test("does not open when there is no image to explain", () => {
    const gallery = createInitialGalleryState();

    expect(send(gallery, { type: "image-note-composer-opened" })).toEqual(gallery);
  });

  test("keeps what the owner types", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(typed.imageNoteComposer).toEqual({ imageId: "s1", draft: "Widened the shoulder." });
  });

  test("drops a half-written note when the current image changes", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    const swiped = send(typed, { type: "hero-swiped", direction: "next", stages: journey() });

    expect(swiped).toEqual({ ...onImage("s2"), ...noNoteUI });
  });

  test("keeps the draft through a stage press that lands on the same image", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    const pressed = send(typed, { type: "stage-pressed", kind: "sketch", stages: journey() });

    expect(pressed.imageNoteComposer).toEqual({ imageId: "s1", draft: "Widened the shoulder." });
  });

  test("a read that keeps the image keeps the draft; one that moves it drops it", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    const sameImage = send(typed, {
      type: "images-read",
      stages: [
        stage("inspiration"),
        stage("sketch", "s1", "s2"),
        stage("prototype"),
        stage("final"),
      ],
      cover: "s2",
    });

    expect(sameImage.imageNoteComposer).toEqual({ imageId: "s1", draft: "Widened the shoulder." });

    const otherImage = send(sameImage, {
      type: "images-read",
      stages: [stage("inspiration"), stage("sketch", "s2"), stage("prototype"), stage("final")],
      cover: "s2",
    });

    expect(otherImage).toEqual({ ...onImage("s2"), ...noNoteUI });
  });

  test("closes once the note lands, leaving a collapsed list collapsed", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(
      send(typed, { type: "image-note-save-pressed" }, { type: "image-note-added", imageId: "s1" }),
    ).toEqual({
      ...onImage("s1"),
      ...noNoteUI,
    });
  });

  test("leaves a list the owner expanded open when a note lands", () => {
    const typed = send(
      { ...onImage("s1"), imageNotesExpanded: true },
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(
      send(typed, { type: "image-note-save-pressed" }, { type: "image-note-added", imageId: "s1" }),
    ).toEqual({
      ...onImage("s1"),
      imageNoteComposer: null,
      imageNotesExpanded: true,
    });
  });

  test("a note landing for another image leaves the draft alone", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(send(typed, { type: "image-note-added", imageId: "s2" })).toEqual(typed);
  });

  test("cancelling closes it and keeps the image as it was", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(send(typed, { type: "image-note-composer-closed" })).toEqual({
      ...onImage("s1"),
      ...noNoteUI,
    });
  });
});

describe("declaring a note write", () => {
  test("the save press declares the composer's note and leaves the composer open", () => {
    const typed = send(
      onImage("s1"),
      { type: "image-note-composer-opened" },
      { type: "image-note-draft-changed", draft: "Widened the shoulder." },
    );

    expect(galleryReducer(typed, { type: "image-note-save-pressed" })).toEqual({
      state: typed,
      effects: [{ type: "add-image-note", imageId: "s1", text: "Widened the shoulder." }],
    });
  });

  test("a save with no composer open declares nothing", () => {
    const gallery = onImage("s1");

    expect(galleryReducer(gallery, { type: "image-note-save-pressed" })).toEqual({
      state: gallery,
      effects: [],
    });
  });

  test("the delete press forwards the row's id and leaves the list as it was", () => {
    const gallery = { ...onImage("s1"), imageNotesExpanded: true };

    expect(galleryReducer(gallery, { type: "image-note-delete-pressed", noteId: "n1" })).toEqual({
      state: gallery,
      effects: [{ type: "remove-image-note", noteId: "n1" }],
    });
  });
});

describe("the note block", () => {
  const notes = ["first", "second", "third", "fourth"];

  test("shows its first two notes while there is more to see", () => {
    expect(imageNoteBlockView(notes, createInitialGalleryState())).toEqual({
      total: 4,
      shown: ["first", "second"],
      collapsible: true,
      expanded: false,
    });
  });

  test("shows every note once the owner asks", () => {
    const expanded = { ...createInitialGalleryState(), imageNotesExpanded: true };

    expect(imageNoteBlockView(notes, expanded)).toEqual({
      total: 4,
      shown: notes,
      collapsible: true,
      expanded: true,
    });
  });

  test("a list of two has nothing hidden and no control to offer", () => {
    const expanded = { ...createInitialGalleryState(), imageNotesExpanded: true };

    expect(imageNoteBlockView(["first", "second"], expanded)).toEqual({
      total: 2,
      shown: ["first", "second"],
      collapsible: false,
      expanded: false,
    });
  });

  test("collapses again when the owner moves to another image", () => {
    const expanded = send(
      { ...onImage("s1"), imageNotesExpanded: true },
      { type: "hero-swiped", direction: "next", stages: journey() },
    );

    expect(imageNoteBlockView(notes, expanded)).toMatchObject({
      shown: notes.slice(0, 2),
      expanded: false,
    });
  });

  test("pressing the more control toggles the list and back", () => {
    const collapsed = createInitialGalleryState();
    const opened = send(collapsed, { type: "image-notes-more-pressed" });

    expect(imageNoteBlockView(notes, opened).expanded).toBe(true);
    expect(
      imageNoteBlockView(notes, send(opened, { type: "image-notes-more-pressed" })).expanded,
    ).toBe(false);
  });
});
