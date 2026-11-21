import { createReducerTester } from "@/shared/testing/reducer-tester";
import { createInitialViewerState, viewerReducer, type ViewerEvent } from "../lib/viewer-reducer";

/** Drives the viewer reducer with the sequence of events and answers what settled. */
function viewer(...events: ViewerEvent[]) {
  const tester = createReducerTester(viewerReducer, createInitialViewerState());

  for (const event of events) tester.send(event);

  return tester;
}

/** A viewer the owner has opened on one image. */
function opened(imageId = "image-1") {
  return viewer({ type: "image-opened", imageId });
}

describe("opening the viewer", () => {
  test("opens on the image the owner tapped, with nothing asked", () => {
    const tester = opened();

    expect(tester.getState()).toEqual({ imageId: "image-1", confirmingRemoval: false });
    expect(tester.getEffects()).toEqual([]);
  });

  test("closing returns to no image and drops a pending question", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "viewer-closed" });

    expect(tester.getState()).toEqual(createInitialViewerState());
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("reclassifying in the viewer", () => {
  test("a kind press declares one reclassify and the viewer stays open on the image", () => {
    const tester = opened();

    tester.send({ type: "kind-pressed", kind: "final" });

    expect(tester.getState()).toEqual({ imageId: "image-1", confirmingRemoval: false });
    expect(tester.getEffects()).toEqual([
      { type: "reclassify-image", imageId: "image-1", to: "final" },
    ]);
  });

  test("a closed viewer reclassifies nothing", () => {
    const tester = viewer({ type: "kind-pressed", kind: "sketch" });

    expect(tester.getState()).toEqual(createInitialViewerState());
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("removing an image", () => {
  test("Remove asks before it deletes", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });

    expect(tester.getState()).toEqual({ imageId: "image-1", confirmingRemoval: true });
    expect(tester.getEffects()).toEqual([]);
  });

  test("answering the question removes the image once and closes", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });

    expect(tester.getState()).toEqual(createInitialViewerState());
    expect(tester.getEffects()).toEqual([{ type: "remove-image", imageId: "image-1" }]);
  });

  test("a confirm without the question deletes nothing", () => {
    const tester = opened();

    tester.send({ type: "remove-confirmed" });

    expect(tester.getState()).toEqual({ imageId: "image-1", confirmingRemoval: false });
    expect(tester.getEffects()).toEqual([]);
  });

  test("a second confirm deletes nothing", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-confirmed" });

    expect(tester.getEffects()).toEqual([{ type: "remove-image", imageId: "image-1" }]);
  });

  test("cancelling keeps the image and drops the question", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-cancelled" });

    expect(tester.getState()).toEqual({ imageId: "image-1", confirmingRemoval: false });
    expect(tester.getEffects()).toEqual([]);
  });
});
