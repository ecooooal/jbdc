import {
  createInitialGalleryState,
  type GalleryEvent,
  type GalleryState,
} from "../lib/gallery-reducer";
import { DESIGN_ID, journey, noNoteUI, send, stage } from "./gallery-reducer-fixtures";

/** The state the events settle on; these scenarios declare no write of their own. */
function settle(state: GalleryState, ...events: GalleryEvent[]): GalleryState {
  return send(state, ...events).state;
}

describe("opening the gallery", () => {
  test("opens on the Cover", () => {
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });

    expect(opened).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("a Design with no images opens on the rail with no image", () => {
    const stages = [stage("inspiration"), stage("sketch"), stage("prototype"), stage("final")];

    expect(
      settle(createInitialGalleryState(DESIGN_ID), { type: "images-read", stages, cover: null }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: null,
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

describe("an images change", () => {
  test("keeps the selected image, even when the Cover moves to a new one", () => {
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const changed = settle(opened, {
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
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("falls back to the Cover when the selected image is gone", () => {
    const selected = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const removed = settle(selected, { type: "stage-pressed", kind: "sketch", stages: journey() });

    const changed = settle(removed, {
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
      designId: DESIGN_ID,
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
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: openedOnFinal,
      cover: "f2",
    });
    const chosen = settle(opened, { type: "stage-pressed", kind: "sketch", stages: openedOnFinal });

    // The attach re-runs the read with the new Sketch image while the Cover is
    // still Final — the rail must stay on Sketch, not jump back to Final.
    const arrived = settle(chosen, {
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
      designId: DESIGN_ID,
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("follows the first Cover to arrive after opening on no images", () => {
    const empty = [stage("inspiration"), stage("sketch"), stage("prototype"), stage("final")];
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: empty,
      cover: null,
    });
    const arrived = settle(opened, { type: "images-read", stages: journey(), cover: "f2" });

    expect(arrived).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("follows a reclassified image into its new stage", () => {
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const selected = settle(opened, { type: "stage-pressed", kind: "sketch", stages: journey() });

    const changed = settle(selected, {
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
      designId: DESIGN_ID,
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
      settle(createInitialGalleryState(DESIGN_ID), {
        type: "stage-pressed",
        kind: "sketch",
        stages: journey(),
      }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("pressing an empty stage activates it with no image", () => {
    expect(
      settle(createInitialGalleryState(DESIGN_ID), {
        type: "stage-pressed",
        kind: "prototype",
        stages: journey(),
      }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "prototype",
      imageId: null,
      awaitingKind: "prototype",
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("pressing a thumbnail selects that image", () => {
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });

    expect(settle(opened, { type: "image-pressed", imageId: "i2", stages: journey() })).toEqual({
      designId: DESIGN_ID,
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
    const opened = settle(createInitialGalleryState(DESIGN_ID), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });
    const failed = settle(opened, { type: "attach-failed" });

    expect(failed).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: true,
      ...noNoteUI,
    });
    expect(settle(failed, { type: "attach-pressed" }).attachFailed).toBe(false);
  });

  test("clears when the owner presses a stage", () => {
    const failed = settle(createInitialGalleryState(DESIGN_ID), { type: "attach-failed" });

    expect(settle(failed, { type: "stage-pressed", kind: "sketch", stages: journey() })).toEqual({
      designId: DESIGN_ID,
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});

describe("the plus press", () => {
  test("clears a stale failure and declares the pick to the stage on the rail", () => {
    const failed = settle(
      createInitialGalleryState(DESIGN_ID),
      { type: "stage-pressed", kind: "sketch", stages: journey() },
      { type: "attach-failed" },
    );

    expect(send(failed, { type: "attach-pressed" })).toEqual({
      state: {
        designId: DESIGN_ID,
        kind: "sketch",
        imageId: "s1",
        awaitingKind: null,
        attachFailed: false,
        ...noNoteUI,
      },
      effects: [{ type: "attach-images", designId: DESIGN_ID, kind: "sketch" }],
    });
  });
});

describe("swiping the hero", () => {
  function selected(imageId: string): GalleryState {
    return {
      designId: DESIGN_ID,
      kind: "sketch",
      imageId,
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    };
  }

  test("moves within the stage first", () => {
    expect(
      settle(selected("s1"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "sketch",
      imageId: "s2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      settle(selected("s2"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "sketch",
      imageId: "s1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("moves on into the next stage, skipping an empty one", () => {
    expect(
      settle(selected("s2"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      settle(selected("s1"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "inspiration",
      imageId: "i2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("stays put at either end of the journey", () => {
    expect(
      settle(
        {
          designId: DESIGN_ID,
          kind: "final",
          imageId: "f2",
          awaitingKind: null,
          attachFailed: false,
          ...noNoteUI,
        },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "final",
      imageId: "f2",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
    expect(
      settle(
        {
          designId: DESIGN_ID,
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
      designId: DESIGN_ID,
      kind: "inspiration",
      imageId: "i1",
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });

  test("a hero with no image has nowhere to move", () => {
    expect(
      settle(
        {
          designId: DESIGN_ID,
          kind: "prototype",
          imageId: null,
          awaitingKind: null,
          attachFailed: false,
          ...noNoteUI,
        },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({
      designId: DESIGN_ID,
      kind: "prototype",
      imageId: null,
      awaitingKind: null,
      attachFailed: false,
      ...noNoteUI,
    });
  });
});
