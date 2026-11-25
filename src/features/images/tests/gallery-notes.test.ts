import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
  createInitialGalleryState,
  galleryReducer,
  imageNoteBlockView,
  writeOutcome,
} from "../lib/gallery-reducer";
import { DESIGN_ID, journey, noNoteUI, onImage, send, stage } from "./gallery-reducer-fixtures";

/** A tester on a gallery already looking at one image. */
function testerAt(state = onImage("s1")) {
  return createReducerTester(galleryReducer, state);
}

describe("the note composer", () => {
  test("opens on the current image with nothing written yet", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });

    expect(tester.getState()).toEqual({
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "" },
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("does not open when there is no image to explain", () => {
    const gallery = createInitialGalleryState(DESIGN_ID);
    const tester = testerAt(gallery);

    tester.send({ type: "image-note-composer-opened" });

    expect(tester.getState()).toEqual(gallery);
    expect(tester.getEffects()).toEqual([]);
  });

  test("keeps what the owner types", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });

    expect(tester.getState().imageNoteComposer).toEqual({
      imageId: "s1",
      draft: "Widened the shoulder.",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("drops a half-written note when the current image changes", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "hero-swiped", direction: "next", stages: journey() });

    expect(tester.getState()).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(tester.getEffects()).toEqual([]);
  });

  test("keeps the draft through a stage press that lands on the same image", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "stage-pressed", kind: "sketch", stages: journey() });

    expect(tester.getState().imageNoteComposer).toEqual({
      imageId: "s1",
      draft: "Widened the shoulder.",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("a read that keeps the image keeps the draft; one that moves it drops it", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({
      type: "images-read",
      stages: [
        stage("inspiration"),
        stage("sketch", "s1", "s2"),
        stage("prototype"),
        stage("final"),
      ],
      cover: "s2",
    });

    expect(tester.getState().imageNoteComposer).toEqual({
      imageId: "s1",
      draft: "Widened the shoulder.",
    });

    tester.send({
      type: "images-read",
      stages: [stage("inspiration"), stage("sketch", "s2"), stage("prototype"), stage("final")],
      cover: "s2",
    });

    expect(tester.getState()).toEqual({ ...onImage("s2"), ...noNoteUI });
    expect(tester.getEffects()).toEqual([]);
  });

  test("closes once the note lands, leaving a collapsed list collapsed", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "image-note-save-pressed" });
    tester.send({ type: "image-note-added", imageId: "s1" });

    expect(tester.getState()).toEqual({ ...onImage("s1"), ...noNoteUI });
    expect(tester.getEffects()).toEqual([
      {
        type: "add-image-note",
        designId: DESIGN_ID,
        change: { kind: "add-note", imageId: "s1", text: "Widened the shoulder." },
      },
    ]);
  });

  test("leaves a list the owner expanded open when a note lands", () => {
    const tester = testerAt({ ...onImage("s1"), imageNotesExpanded: true });

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "image-note-save-pressed" });
    tester.send({ type: "image-note-added", imageId: "s1" });

    expect(tester.getState()).toEqual({
      ...onImage("s1"),
      imageNoteComposer: null,
      imageNotesExpanded: true,
    });
    expect(tester.getEffects()).toEqual([
      {
        type: "add-image-note",
        designId: DESIGN_ID,
        change: { kind: "add-note", imageId: "s1", text: "Widened the shoulder." },
      },
    ]);
  });

  test("a note landing for another image leaves the draft alone", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "image-note-added", imageId: "s2" });

    expect(tester.getState()).toEqual({
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("cancelling closes it and keeps the image as it was", () => {
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "image-note-composer-closed" });

    expect(tester.getState()).toEqual({ ...onImage("s1"), ...noNoteUI });
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("declaring a note write", () => {
  test("the save press declares the composer's note and leaves the composer open", () => {
    const typed = {
      ...onImage("s1"),
      imageNoteComposer: { imageId: "s1", draft: "Widened the shoulder." },
    };
    const tester = testerAt(typed);

    tester.send({ type: "image-note-save-pressed" });

    expect(tester.getState()).toEqual(typed);
    expect(tester.getEffects()).toEqual([
      {
        type: "add-image-note",
        designId: DESIGN_ID,
        change: { kind: "add-note", imageId: "s1", text: "Widened the shoulder." },
      },
    ]);
  });

  test("a save with no composer open declares nothing", () => {
    const gallery = onImage("s1");
    const tester = testerAt(gallery);

    tester.send({ type: "image-note-save-pressed" });

    expect(tester.getState()).toEqual(gallery);
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("a refused note", () => {
  test("keeps the composer's words", () => {
    const ending = { kind: "refused", field: "image-note", message: "A note has a cap." } as const;
    const tester = testerAt();

    tester.send({ type: "image-note-composer-opened" });
    tester.send({ type: "image-note-draft-changed", draft: "Widened the shoulder." });
    tester.send({ type: "image-note-save-pressed" });

    const [effect] = tester.getEffects();

    expect(effect).toEqual({
      type: "add-image-note",
      designId: DESIGN_ID,
      change: { kind: "add-note", imageId: "s1", text: "Widened the shoulder." },
    });
    if (effect.type !== "add-image-note") return;

    const events = writeOutcome({ type: "add-note", change: effect.change, ending });

    expect(events).toEqual([]);
    for (const event of events) tester.send(event);

    expect(tester.getState().imageNoteComposer).toEqual({
      imageId: "s1",
      draft: "Widened the shoulder.",
    });
    expect(tester.getEffects()).toEqual([effect]);
  });
});

describe("the note block", () => {
  const notes = ["first", "second", "third", "fourth"];

  test("shows its first two notes while there is more to see", () => {
    expect(imageNoteBlockView(notes, createInitialGalleryState(DESIGN_ID))).toEqual({
      total: 4,
      shown: ["first", "second"],
      collapsible: true,
      expanded: false,
    });
  });

  test("shows every note once the owner asks", () => {
    const expanded = { ...createInitialGalleryState(DESIGN_ID), imageNotesExpanded: true };

    expect(imageNoteBlockView(notes, expanded)).toEqual({
      total: 4,
      shown: notes,
      collapsible: true,
      expanded: true,
    });
  });

  test("a list of two has nothing hidden and no control to offer", () => {
    const expanded = { ...createInitialGalleryState(DESIGN_ID), imageNotesExpanded: true };

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
    ).state;

    expect(imageNoteBlockView(notes, expanded)).toMatchObject({
      shown: notes.slice(0, 2),
      expanded: false,
    });
  });

  test("pressing the more control toggles the list and back", () => {
    const collapsed = createInitialGalleryState(DESIGN_ID);
    const opened = send(collapsed, { type: "image-notes-more-pressed" }).state;

    expect(imageNoteBlockView(notes, opened).expanded).toBe(true);
    expect(
      imageNoteBlockView(notes, send(opened, { type: "image-notes-more-pressed" }).state).expanded,
    ).toBe(false);
  });
});
