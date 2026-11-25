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

  test("an empty stage's row lists no images", () => {
    const chosen = galleryReducer(onImage("s2"), {
      type: "stage-pressed",
      kind: "prototype",
      stages: journey(),
    }).state;

    expect(stageRowView(journey(), chosen)).toEqual({
      kind: "prototype",
      images: [],
      selectedId: null,
    });
  });
});
