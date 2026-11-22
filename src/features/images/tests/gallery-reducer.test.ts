import { createInitialGalleryState, type GalleryState } from "../lib/gallery-reducer";
import { journey, noNoteUI, send, stage } from "./gallery-reducer-fixtures";

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
