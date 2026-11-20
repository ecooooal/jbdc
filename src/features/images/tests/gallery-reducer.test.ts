import type { ImageKind } from "@/features/database";
import {
  createInitialGalleryState,
  galleryReducer,
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

describe("opening the gallery", () => {
  test("opens on the Cover", () => {
    const opened = send(createInitialGalleryState(), {
      type: "images-read",
      stages: journey(),
      cover: "f2",
    });

    expect(opened).toEqual({ kind: "final", imageId: "f2" });
  });

  test("a Design with no images opens on the rail with no image", () => {
    const stages = [stage("inspiration"), stage("sketch"), stage("prototype"), stage("final")];

    expect(send(createInitialGalleryState(), { type: "images-read", stages, cover: null })).toEqual(
      { kind: "final", imageId: null },
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

    expect(changed).toEqual({ kind: "final", imageId: "f2" });
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

    expect(changed).toEqual({ kind: "final", imageId: "f2" });
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

    expect(changed).toEqual({ kind: "prototype", imageId: "s1" });
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
    ).toEqual({ kind: "sketch", imageId: "s1" });
  });

  test("pressing an empty stage activates it with no image", () => {
    expect(
      send(createInitialGalleryState(), {
        type: "stage-pressed",
        kind: "prototype",
        stages: journey(),
      }),
    ).toEqual({ kind: "prototype", imageId: null });
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
    });
  });
});

describe("swiping the hero", () => {
  function selected(imageId: string): GalleryState {
    return { kind: "sketch", imageId };
  }

  test("moves within the stage first", () => {
    expect(
      send(selected("s1"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({ kind: "sketch", imageId: "s2" });
    expect(
      send(selected("s2"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({ kind: "sketch", imageId: "s1" });
  });

  test("moves on into the next stage, skipping an empty one", () => {
    expect(
      send(selected("s2"), { type: "hero-swiped", direction: "next", stages: journey() }),
    ).toEqual({ kind: "final", imageId: "f1" });
    expect(
      send(selected("s1"), { type: "hero-swiped", direction: "previous", stages: journey() }),
    ).toEqual({ kind: "inspiration", imageId: "i2" });
  });

  test("stays put at either end of the journey", () => {
    expect(
      send(
        { kind: "final", imageId: "f2" },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({ kind: "final", imageId: "f2" });
    expect(
      send(
        { kind: "inspiration", imageId: "i1" },
        {
          type: "hero-swiped",
          direction: "previous",
          stages: journey(),
        },
      ),
    ).toEqual({ kind: "inspiration", imageId: "i1" });
  });

  test("a hero with no image has nowhere to move", () => {
    expect(
      send(
        { kind: "prototype", imageId: null },
        {
          type: "hero-swiped",
          direction: "next",
          stages: journey(),
        },
      ),
    ).toEqual({ kind: "prototype", imageId: null });
  });
});
