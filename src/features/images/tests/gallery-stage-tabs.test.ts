import { galleryReducer, stageTabsView } from "../lib/gallery-reducer";
import { journey, onImage } from "./gallery-reducer-fixtures";

describe("the stage tabs view", () => {
  test("carries one tab per stage, in journey order, each with its image count", () => {
    expect(stageTabsView(journey(), onImage("s2")).tabs).toEqual([
      { kind: "inspiration", count: 2, active: false },
      { kind: "sketch", count: 2, active: true },
      { kind: "prototype", count: 0, active: false },
      { kind: "final", count: 2, active: false },
    ]);
  });

  test("an empty stage reads zero", () => {
    const prototype = stageTabsView(journey(), onImage("s2")).tabs.find(
      (tab) => tab.kind === "prototype",
    );

    expect(prototype).toEqual({ kind: "prototype", count: 0, active: false });
  });

  test("the gallery's stage is the active tab", () => {
    const active = stageTabsView(journey(), onImage("f1", "final")).tabs.filter(
      (tab) => tab.active,
    );

    expect(active).toEqual([{ kind: "final", count: 2, active: true }]);
  });

  test("an empty chosen stage is the active tab", () => {
    const chosen = galleryReducer(onImage("s2"), {
      type: "stage-pressed",
      kind: "prototype",
      stages: journey(),
    }).state;
    const active = stageTabsView(journey(), chosen).tabs.filter((tab) => tab.active);

    expect(active).toEqual([{ kind: "prototype", count: 0, active: true }]);
  });
});
