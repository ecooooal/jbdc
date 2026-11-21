import type { ImageKind } from "@/features/database";
import {
  createInitialGalleryState,
  galleryReducer,
  imageNoteBlockView,
  type GalleryEvent,
  type GalleryStage,
  type GalleryState,
} from "../lib/gallery-reducer";

/** One stage, its images oldest first. */
function stage(kind: ImageKind, ...ids: string[]): GalleryStage {
  return { kind, images: ids.map((id) => ({ id, kind })) };
}

/** The journey a design usually has: an empty stage between two filled ones. */
function journey(): GalleryStage[] {
  return [
    stage("inspiration", "i1", "i2"),
    stage("sketch", "s1", "s2"),
    stage("prototype"),
    stage("final", "f1", "f2"),
  ];
}

/** Drives the reducer with the sequence of events and answers the state it settled on. */
function send(state: GalleryState, ...events: GalleryEvent[]): GalleryState {
  return events.reduce(galleryReducer, state);
}

/** A gallery state's note UI before the owner opens anything. */
const noNoteUI = { imageNoteComposer: null, imageNotesExpanded: false };

/** A gallery looking at one image, with nothing else settled yet. */
function onImage(imageId: string, kind: ImageKind = "sketch"): GalleryState {
  return { ...createInitialGalleryState(), kind, imageId };
}

describe("opening the gallery", () => {
  test("opens on the Cover", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });

    expect(opened).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("a Design with no images opens on the rail with no image", () => {
    const stages = [stage("inspiration"), stage("sketch"), stage("prototype"), stage("final")];

    expect(send(createInitialGalleryState(), { type: "images-read", stages, cover: null })).toEqual(
      { kind: "final", imageId: null, awaitingKind: null, attachFailed: false, ...noNoteUI },
    );
  });
});

describe("an images change", () => {
  test("keeps the selected image, even when the Cover moves to a new one", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const changed = send(opened, {
      type: "images-read",
      stages: [
        stage("inspiration"),
        stage("sketch"),
        stage("prototype"),
        stage("final", "f1", "f2", "f3"),
      ],
      cover: "f3",
    });

    expect(changed).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("falls back to the Cover when the selected image is gone", () => {
    const selected = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const removed = send(selected, { type: "stage-pressed", kind: "sketch", stages: journey() });

    const changed = send(removed, {
      type: "images-read",
      stages: [
        stage("inspiration", "i1", "i2"),
        stage("sketch"),
        stage("prototype"),
        stage("final", "f1", "f2"),
      ],
      cover: "f2",
    });

    expect(changed).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("keeps a chosen empty stage until its first image arrives", () => {
    const openedOnFinal = [
      stage("inspiration"),
      stage("sketch"),
      stage("prototype"),
      stage("final", "f1", "f2"),
    ];
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: openedOnFinal,
      cover: "f2",
    });
    const chosen = send(opened, { type: "stage-pressed", kind: "sketch", stages: openedOnFinal });

    // The attach re-runs the read with the new Sketch image while the Cover is
    // still Final — the rail must stay on Sketch, not jump back to Final.
    const arrived = send(chosen, {
      type: "images-read",
      stages: [
        stage("inspiration"),
        stage("sketch", "s1"),
        stage("prototype"),
        stage("final", "f1", "f2"),
      ],
      cover: "f2",
    });

    expect(arrived).toEqual({
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("follows the first Cover to arrive after opening on no images", () => {
    const empty = [stage("inspiration"), stage("sketch"), stage("prototype"), stage("final")];
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: empty,
      cover: null,
    });
    const arrived = send(opened, { type: "images-read", stages: journey(), cover: "f2" });

    expect(arrived).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("follows a reclassified image into its new stage", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const selected = send(opened, { type: "stage-pressed", kind: "sketch", stages: journey() });

    const changed = send(selected, {
      type: "images-read",
      stages: [
        stage("inspiration", "i1", "i2"),
        stage("sketch", "s2"),
        stage("prototype", "s1"),
        stage("final", "f1", "f2"),
      ],
      cover: "f2",
    });

    expect(changed).toEqual({
      kind: "prototype",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

describe("the journey rail", () => {
  test("pressing a stage activates it at its oldest image", () => {
    expect(
      send(createInitialGalleryState(), {
        type: "stage-pressed",
        kind: "sketch",
        stages: journey(),
      }),
    ).toEqual({
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("pressing an empty stage activates it with no image", () => {
    expect(
      send(createInitialGalleryState(), {
        type: "stage-pressed",
        kind: "prototype",
        stages: journey(),
      }),
    ).toEqual({
      kind: "prototype",
      imageId: null,
      awaitingKind: "prototype",
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("pressing a thumbnail selects that image", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });

    expect(send(opened, { type: "image-pressed", imageId: "i2", stages: journey() })).toEqual({
      kind: "inspiration",
      imageId: "i2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

describe("a failed attach", () => {
  test("is reported until the owner tries again", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const failed = send(opened, { type: "attach-failed" });

    expect(failed).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: true,
      ...noNoteUI,
    });
    expect(send(failed, { type: "attach-pressed" }).attachFailed).toBe(false);
  });

  test("clears when the owner presses a stage", () => {
    const failed = send(createInitialGalleryState(), { type: "attach-failed" });

    expect(send(failed, { type: "stage-pressed", kind: "sketch", stages: journey() })).toEqual({
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

describe("swiping the hero", () => {
  function selected(imageId: string): GalleryState {
    return { kind: "sketch", imageId, awaitingKind: null, attachFailed: false, ...noNoteUI };
  }

  test("moves within the stage first", () => {
    expect(
      send(selected("s1"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({
      kind: "sketch",
      imageId: "s2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      send(selected("s2"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("moves on into the next stage, skipping an empty one", () => {
    expect(
      send(selected("s2"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({
      kind: "final",
      imageId: "f1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      send(selected("s1"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({
      kind: "inspiration",
      imageId: "i2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("stays put at either end of the journey", () => {
    expect(
      send(
        { kind: "final", imageId: "f2", awaitingKind: null, attachFailed: false, ...noNoteUI },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      send(
        {
          kind: "inspiration",
          imageId: "i1",
          awaitingKind: null,
          attachFailed: false,
          ...noNoteUI,
        },
        {
          type: "hero-swiped",
          direction: "previous",
          stages: journey(),
        },
      ),
    ).toEqual({
      kind: "inspiration",
      imageId: "i1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("a hero with no image has nowhere to move", () => {
    expect(
      send(
        { kind: "prototype", imageId: null, awaitingKind: null, attachFailed: false, ...noNoteUI },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({
      kind: "prototype",
      imageId: null,
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

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

    expect(send(typed, { type: "image-note-added", imageId: "s1" })).toEqual({
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

    expect(send(typed, { type: "image-note-added", imageId: "s1" })).toEqual({
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
