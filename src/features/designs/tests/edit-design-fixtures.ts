/**
 * Fixtures shared by the Edit visit reducer's test files. `DESIGN` and
 * `WOOL_USE` are the rows a visit reads; `visit()` returns a tester seeded from
 * `DESIGN`, and each scenario helper adds the panel the test starts from.
 */
import { createReducerTester } from "@/shared/testing/reducer-tester";
import { createInitialEditDesignState, editDesignReducer } from "../lib/edit-design-reducer";
import type { DesignFields, MaterialUse } from "../lib/records";

export const DESIGN_ID = "design-silk-slip";
export const DRESS = "category-dress";
export const KNITWEAR = "category-knitwear";
export const NOW = 1_700_000_000_000;
export const LATER = NOW + 60_000;

export const EMPTY_SPECIFICATION = {
  silhouette: null,
  neckline: null,
  sleeveType: null,
  garmentDetails: null,
  sizeRange: null,
  measurements: null,
  constructionNotes: null,
} as const;

export const EMPTY_CREATIVE_DIRECTION = {
  concept: null,
  mood: null,
  inspiration: null,
  intendedFeeling: null,
  audience: null,
  styling: null,
  palette: null,
} as const;

export const DESIGN: DesignFields = {
  name: "Silk slip dress",
  description: "Bias cut",
  categoryId: DRESS,
  collectionId: null,
  ...EMPTY_SPECIFICATION,
  ...EMPTY_CREATIVE_DIRECTION,
};

export const WOOL_USE: MaterialUse = {
  id: "use-wool",
  designId: DESIGN_ID,
  materialId: "material-wool",
  materialName: "Wool",
  colour: "Charcoal",
  role: "main",
  createdAt: NOW,
};

/** A visit that has read its Design and is ready to edit. */
export function visit() {
  const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

  tester.send({ type: "design-loaded", design: DESIGN });

  return tester;
}

/** A visit whose Design already has one recorded Material use. */
export function visitWithUse() {
  const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

  tester.send({ type: "design-loaded", design: DESIGN, materialUses: [WOOL_USE] });

  return tester;
}

/** A visit with the correction editor open on the recorded use. */
export function opened() {
  const tester = visitWithUse();

  tester.send({ type: "material-use-editor-opened", materialUse: WOOL_USE, now: NOW });

  return tester;
}

/** A visit with the Add panel open. */
export function adding() {
  const tester = visit();

  tester.send({ type: "material-use-add-opened", now: NOW });

  return tester;
}

/** A visit with the Add panel holding a Material and colour. */
export function chosen() {
  const tester = adding();

  tester.send({
    type: "material-use-panel-fact",
    fact: { type: "material-chosen", materialId: "material-wool" },
    now: NOW,
  });
  tester.send({
    type: "material-use-panel-fact",
    fact: { type: "colour-changed", colour: "Charcoal" },
    now: NOW,
  });

  return tester;
}
