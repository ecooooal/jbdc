import { galleryReducer, stageRowView } from "../lib/gallery-reducer";
import { journey, onImage } from "./gallery-reducer-fixtures";

describe("the stage row view", () => {
  test("lists the active stage's images oldest first", () => {
    const view = stageRowView(journey(), onImage("s2"));

    expect(view.kind).toBe("sketch");
    expect(view.images.map((image) => image.id)).toEqual(["s1", "s2"]);
  });

  test("names the image the pager shows", () => {
    expect(stageRowView(journey(), onImage("s2")).selectedId).toBe("s2");
  });

  test("places each image in the journey, not in its stage", () => {
    const view = stageRowView(journey(), onImage("s2"));

    // The journey is i1, i2, s1, s2, f1, f2: the sketch stage starts third.
    expect(view.positions).toEqual([3, 4]);
    expect(view.count).toBe(6);
  });

  test("an empty stage's row lists no images", () => {
    const chosen = galleryReducer(onImage("s2"), {
      type: "stage-pressed",
      kind: "prototype",
      stages: journey(),
    }).state;

    expect(stageRowView(journey(), chosen)).toEqual({
      kind: "prototype",
      images: [],
      positions: [],
      count: 6,
      selectedId: null,
    });
  });
});
