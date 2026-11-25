import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
  createInitialImageDetailState,
  removeImageOutcome,
  imageDetailReducer,
  type ImageDetailEvent,
} from "../lib/image-detail-reducer";

/** The Design every image detail fixture belongs to. */
const DESIGN_ID = "design-silk-slip";

/** Drives the image detail reducer with the sequence of events and answers what settled. */
function imageDetail(...events: ImageDetailEvent[]) {
  const tester = createReducerTester(imageDetailReducer, createInitialImageDetailState(DESIGN_ID));

  for (const event of events) tester.send(event);

  return tester;
}

/** An image detail the owner has opened on one image. */
function opened(imageId = "image-1") {
  return imageDetail({ type: "image-opened", imageId });
}

describe("opening the image detail", () => {
  test("opens on the image the owner tapped, with nothing asked", () => {
    const tester = opened();

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("closing returns to no image and drops a pending question", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "detail-closed" });

    expect(tester.getState()).toEqual(createInitialImageDetailState(DESIGN_ID));
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("reclassifying in the image detail", () => {
  test("a kind press declares one reclassify and the image detail stays open on the image", () => {
    const tester = opened();

    tester.send({ type: "kind-pressed", kind: "final" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([
      { type: "reclassify-image", designId: DESIGN_ID, imageId: "image-1", to: "final" },
    ]);
  });

  test("a closed image detail reclassifies nothing", () => {
    const tester = imageDetail({ type: "kind-pressed", kind: "sketch" });

    // The image detail still knows its Design while it is closed, so a later open
    // names the same one without the hook reading anything.
    expect(tester.getState()).toEqual(createInitialImageDetailState(DESIGN_ID));
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("removing an image", () => {
  test("Remove asks before it deletes", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: true,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("answering the question declares the removal and keeps the image until it answers", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([
      { type: "remove-image", designId: DESIGN_ID, imageId: "image-1" },
    ]);
  });

  test("a stored removal closes the image detail", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-stored", imageId: "image-1" });

    expect(tester.getState()).toEqual(createInitialImageDetailState(DESIGN_ID));
    expect(tester.getEffects()).toEqual([
      { type: "remove-image", designId: DESIGN_ID, imageId: "image-1" },
    ]);
  });

  test("a failed removal keeps the image open and says it did not land", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-failed", imageId: "image-1" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: true,
    });
    expect(tester.getEffects()).toEqual([
      { type: "remove-image", designId: DESIGN_ID, imageId: "image-1" },
    ]);
  });

  test("pressing Remove again clears the last failure", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-failed", imageId: "image-1" });
    tester.send({ type: "remove-pressed" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: true,
      removeFailed: false,
    });
  });

  test("a failure for another image is ignored", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-failed", imageId: "image-2" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
  });

  test("a confirm without the question deletes nothing", () => {
    const tester = opened();

    tester.send({ type: "remove-confirmed" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("a second confirm deletes nothing", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-confirmed" });
    tester.send({ type: "remove-confirmed" });

    expect(tester.getEffects()).toEqual([
      { type: "remove-image", designId: DESIGN_ID, imageId: "image-1" },
    ]);
  });

  test("cancelling keeps the image and drops the question", () => {
    const tester = opened();

    tester.send({ type: "remove-pressed" });
    tester.send({ type: "remove-cancelled" });

    expect(tester.getState()).toEqual({
      designId: DESIGN_ID,
      imageId: "image-1",
      confirmingRemoval: false,
      removeFailed: false,
    });
    expect(tester.getEffects()).toEqual([]);
  });
});

describe("a removal's ending", () => {
  test("a stored removal closes the image detail", () => {
    expect(removeImageOutcome("image-1", { kind: "stored", images: [], event: null })).toEqual([
      { type: "remove-stored", imageId: "image-1" },
    ]);
  });

  test.each([
    { ending: { kind: "store-failed" }, name: "store-failed" },
    { ending: { kind: "design-missing" }, name: "design-missing" },
    { ending: { kind: "image-missing", imageId: "image-1" }, name: "image-missing" },
  ] as const)("a $name removal keeps the image and says so", ({ ending }) => {
    expect(removeImageOutcome("image-1", ending)).toEqual([
      { type: "remove-failed", imageId: "image-1" },
    ]);
  });
});
