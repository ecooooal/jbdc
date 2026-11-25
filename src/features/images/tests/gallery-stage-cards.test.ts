import { galleryReducer, stageCardsView } from "../lib/gallery-reducer";
import { journey, onImage } from "./gallery-reducer-fixtures";

describe("the stage cards view", () => {
  test("carries one card per stage, in journey order, each with its image count", () => {
    expect(stageCardsView(journey(), onImage("s2")).cards).toEqual([
      { kind: "inspiration", count: 2, active: false },
      { kind: "sketch", count: 2, active: true },
      { kind: "prototype", count: 0, active: false },
      { kind: "final", count: 2, active: false },
    ]);
  });

  test("an empty stage reads zero", () => {
    const prototype = stageCardsView(journey(), onImage("s2")).cards.find(
      (card) => card.kind === "prototype",
    );

    expect(prototype).toEqual({ kind: "prototype", count: 0, active: false });
  });

  test("the gallery's stage is the active card", () => {
    const active = stageCardsView(journey(), onImage("f1", "final")).cards.filter(
      (card) => card.active,
    );

    expect(active).toEqual([{ kind: "final", count: 2, active: true }]);
  });

  test("an empty chosen stage is the active card", () => {
    const chosen = galleryReducer(onImage("s2"), {
      type: "stage-pressed",
      kind: "prototype",
      stages: journey(),
    }).state;
    const active = stageCardsView(journey(), chosen).cards.filter((card) => card.active);

    expect(active).toEqual([{ kind: "prototype", count: 0, active: true }]);
  });
});
