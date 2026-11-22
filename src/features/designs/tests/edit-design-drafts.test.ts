import { createReducerTester } from "@/shared/testing/reducer-tester";
import { createInitialEditDesignState, editDesignReducer } from "../lib/edit-design-reducer";
import {
  DESIGN,
  DESIGN_ID,
  DRESS,
  EMPTY_CREATIVE_DIRECTION,
  EMPTY_SPECIFICATION,
  KNITWEAR,
  LATER,
  NOW,
  visit,
} from "./edit-design-fixtures";

describe("seeding the visit", () => {
  test("starts unseeded, with the Design it edits and no baseline yet", () => {
    expect(createInitialEditDesignState(DESIGN_ID)).toEqual({
      designId: DESIGN_ID,
      isSeeded: false,
      closing: null,
      draft: {
        name: "",
        description: "",
        categoryId: null,
        collectionId: null,
        silhouette: "",
        neckline: "",
        sleeveType: "",
        garmentDetails: "",
        sizeRange: "",
        measurements: "",
        constructionNotes: "",
        concept: "",
        mood: "",
        inspiration: "",
        intendedFeeling: "",
        audience: "",
        styling: "",
        palette: "",
      },
      stored: {
        name: "",
        description: null,
        categoryId: null,
        collectionId: null,
        ...EMPTY_SPECIFICATION,
        ...EMPTY_CREATIVE_DIRECTION,
      },
      storedUses: [],
      visitStart: null,
      visitStartUses: [],
      editing: null,
      materialUsePanel: null,
      tab: "specification",
      error: null,
    });
  });

  test("seeds the drafts, the row values, and the visit baseline from the first read", () => {
    expect(visit().getState()).toEqual({
      designId: DESIGN_ID,
      isSeeded: true,
      closing: null,
      draft: {
        name: "Silk slip dress",
        description: "Bias cut",
        categoryId: DRESS,
        collectionId: null,
        silhouette: "",
        neckline: "",
        sleeveType: "",
        garmentDetails: "",
        sizeRange: "",
        measurements: "",
        constructionNotes: "",
        concept: "",
        mood: "",
        inspiration: "",
        intendedFeeling: "",
        audience: "",
        styling: "",
        palette: "",
      },
      stored: DESIGN,
      storedUses: [],
      visitStart: DESIGN,
      visitStartUses: [],
      editing: null,
      materialUsePanel: null,
      tab: "specification",
      error: null,
    });
  });

  test("seeds Specification drafts from the stored values", () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: "design-loaded",
      design: { ...DESIGN, silhouette: "Relaxed A-line", measurements: "Bust 96" },
    });

    expect(tester.getState().draft).toMatchObject({
      silhouette: "Relaxed A-line",
      measurements: "Bust 96",
      neckline: "",
    });
  });

  test("seeds Creative direction drafts from the stored values", () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: "design-loaded",
      design: { ...DESIGN, concept: "Sunday afternoons", palette: "Ivory and cream" },
    });

    expect(tester.getState().draft).toMatchObject({
      concept: "Sunday afternoons",
      palette: "Ivory and cream",
      mood: "",
    });
  });

  test("a later live read does not overwrite what the owner is typing", () => {
    const tester = visit();
    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });

    const editing = tester.getState();
    tester.send({ type: "design-loaded", design: DESIGN });

    expect(tester.getState()).toBe(editing);
  });
});

describe("drafts and rows", () => {
  test("one row is open at a time", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "silhouette", now: NOW });
    expect(tester.getState().editing).toBe("silhouette");

    tester.send({ type: "row-opened", row: "neckline", now: NOW });
    expect(tester.getState().editing).toBe("neckline");

    tester.send({ type: "row-closed" });
    expect(tester.getState().editing).toBeNull();
  });

  test("opening another row writes the draft the owner is leaving", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "silhouette", now: NOW });
    tester.send({ type: "text-changed", field: "silhouette", value: "  Relaxed A-line  " });
    tester.send({ type: "row-opened", row: "neckline", now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { silhouette: "  Relaxed A-line  " } },
        now: LATER,
      },
    ]);
    expect(tester.getState().editing).toBe("neckline");
  });

  test("leaving a name row with a blank draft restores the saved name", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "name", now: NOW });
    tester.send({ type: "text-changed", field: "name", value: "   " });
    tester.send({ type: "row-opened", row: "description", now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toMatchObject({
      draft: { name: "Silk slip dress" },
      editing: "description",
    });
  });

  test("choosing a Category updates the draft until the write confirms it", () => {
    const tester = visit();

    tester.send({ type: "choice-chosen", field: "categoryId", value: KNITWEAR, now: NOW });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      stored: { categoryId: DRESS },
    });

    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, categoryId: KNITWEAR },
      patch: { categoryId: KNITWEAR },
    });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      stored: { categoryId: KNITWEAR },
    });
  });

  test("clearing a selection is a draft like any other", () => {
    const tester = visit();

    tester.send({ type: "choice-chosen", field: "categoryId", value: null, now: NOW });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: null },
      stored: { categoryId: DRESS },
    });
  });

  test("a cleared description comes back as an empty draft, not the text null", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "description", value: "" });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, description: null },
      patch: { description: "" },
    });

    expect(tester.getState()).toMatchObject({
      draft: { description: "" },
      stored: { description: null },
      error: null,
    });
  });

  test("a saved Specification row becomes its stored value and collapses", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "silhouette", now: NOW });
    tester.send({ type: "text-changed", field: "silhouette", value: "  Relaxed A-line  " });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, silhouette: "Relaxed A-line" },
      patch: { silhouette: "  Relaxed A-line  " },
    });

    expect(tester.getState()).toMatchObject({
      draft: { silhouette: "Relaxed A-line" },
      stored: { silhouette: "Relaxed A-line" },
      editing: null,
    });
  });

  test("saving a row that has since closed does not collapse the open one", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "silhouette", now: NOW });
    tester.send({ type: "row-opened", row: "neckline", now: NOW });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, silhouette: "Relaxed A-line" },
      patch: { silhouette: "  Relaxed A-line  " },
    });

    expect(tester.getState().editing).toBe("neckline");
  });

  test("a saved field leaves the other drafts where they are", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });
    tester.send({ type: "text-changed", field: "description", value: "Heavy twill" });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, name: "Wool coat" },
      patch: { name: "Wool coat" },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: "Wool coat", description: "Heavy twill" },
    });
  });

  test("the drafts that still differ from the row are what a flush writes", () => {
    const tester = visit();

    tester.send({ type: "app-backgrounded", now: NOW });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: "text-changed", field: "name", value: "  Wool coat  " });
    tester.send({ type: "text-changed", field: "description", value: " Heavy twill " });
    tester.send({ type: "text-changed", field: "silhouette", value: " Relaxed A-line " });
    tester.send({ type: "app-backgrounded", now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: {
          fields: {
            name: "Wool coat",
            description: " Heavy twill ",
            silhouette: " Relaxed A-line ",
          },
        },
        now: LATER,
      },
    ]);
  });

  test("a blank name is never pending, but a real description still is", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "   " });
    tester.send({ type: "text-changed", field: "description", value: "Heavy twill" });
    tester.send({ type: "app-backgrounded", now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { description: "Heavy twill" } },
        now: NOW,
      },
    ]);
  });

  test("clearing the description is a pending write", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "description", value: "" });
    tester.send({ type: "app-backgrounded", now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { description: "" } },
        now: NOW,
      },
    ]);
  });

  test("clearing a Specification row is a pending write", () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: "design-loaded",
      design: { ...DESIGN, neckline: "Wide boat neck" },
    });
    tester.send({ type: "text-changed", field: "neckline", value: "" });
    tester.send({ type: "app-backgrounded", now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { neckline: "" } },
        now: NOW,
      },
    ]);
  });

  test("whitespace-only Specification input is not a change", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "constructionNotes", value: "   " });
    tester.send({ type: "app-backgrounded", now: NOW });

    expect(tester.getEffects()).toEqual([]);
  });
});

describe("tab changes", () => {
  test("a half-typed draft is written when its tab is left, and nothing is recorded", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "silhouette", now: NOW });
    tester.send({ type: "text-changed", field: "silhouette", value: "  Relaxed A-line  " });
    tester.send({ type: "tab-changed", tab: "creativeDirection", now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { silhouette: "  Relaxed A-line  " } },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      tab: "creativeDirection",
      editing: null,
      draft: { silhouette: "  Relaxed A-line  " },
      stored: { silhouette: null },
    });
  });

  test("the visit still records one Event after a tab change and close", () => {
    const tester = visit();

    tester.send({ type: "tab-changed", tab: "creativeDirection", now: NOW });
    tester.send({ type: "row-opened", row: "mood", now: NOW });
    tester.send({ type: "text-changed", field: "mood", value: " Romantic, relaxed " });
    tester.send({ type: "tab-changed", tab: "specification", now: LATER });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, mood: "Romantic, relaxed" },
      patch: { mood: " Romantic, relaxed " },
    });
    tester.send({ type: "visit-closed", now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { mood: " Romantic, relaxed " } },
        now: LATER,
      },
      {
        type: "record-visit",
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, mood: "Romantic, relaxed" },
        materialUses: { before: [], after: [] },
        now: LATER,
      },
    ]);
  });

  test("a tab change with nothing half-typed declares no work", () => {
    const tester = visit();

    tester.send({ type: "tab-changed", tab: "creativeDirection", now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().tab).toBe("creativeDirection");
  });

  test("asking for the tab already shown changes nothing", () => {
    const tester = visit();
    const before = tester.getState();

    tester.send({ type: "tab-changed", tab: "specification", now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toBe(before);
  });

  test("leaving a tab with a blank name restores the saved one", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "name", now: NOW });
    tester.send({ type: "text-changed", field: "name", value: "   " });
    tester.send({ type: "tab-changed", tab: "creativeDirection", now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toMatchObject({
      tab: "creativeDirection",
      editing: null,
      draft: { name: "Silk slip dress" },
    });
  });
});
