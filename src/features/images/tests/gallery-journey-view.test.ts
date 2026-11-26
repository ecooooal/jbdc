import { galleryReducer, journeyView } from "../lib/gallery-reducer";
import { journey, onImage } from "./gallery-reducer-fixtures";

describe("the journey view", () => {
  test("returns every image in journey order, oldest first within its stage", () => {
    const view = journeyView(journey(), onImage("s2"));

    expect(view.images.map((image) => image.id)).toEqual(["i1", "i2", "s1", "s2", "f1", "f2"]);
    expect(view.images.map((image) => image.kind)).toEqual([
      "inspiration",
      "inspiration",
      "sketch",
      "sketch",
      "final",
      "final",
    ]);
  });

  test("names the current stage and its position across the journey", () => {
    expect(journeyView(journey(), onImage("s2"))).toMatchObject({
      stage: "sketch",
      position: 4,
      count: 6,
    });
  });

  test("a step across a stage moves the stage and the position", () => {
    const stepped = galleryReducer(onImage("s2"), {
      type: "hero-swiped",
      direction: "next",
      stages: journey(),
    }).state;

    expect(journeyView(journey(), stepped)).toMatchObject({
      stage: "final",
      position: 5,
      count: 6,
    });
  });

  test("both ends keep their position and stage", () => {
    const first = galleryReducer(onImage("i1", "inspiration"), {
      type: "hero-swiped",
      direction: "previous",
      stages: journey(),
    }).state;
    const last = galleryReducer(onImage("f2", "final"), {
      type: "hero-swiped",
      direction: "next",
      stages: journey(),
    }).state;

    expect(journeyView(journey(), first)).toMatchObject({
      stage: "inspiration",
      position: 1,
      count: 6,
    });
    expect(journeyView(journey(), last)).toMatchObject({
      stage: "final",
      position: 6,
      count: 6,
    });
  });
});
