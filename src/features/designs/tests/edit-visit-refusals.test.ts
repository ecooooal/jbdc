import type { MaterialUse } from "../lib/records";
import {
  DESIGN,
  DESIGN_ID,
  DRESS,
  KNITWEAR,
  LATER,
  NOW,
  WOOL_USE,
  adding,
  chosen,
  opened,
  visit,
  visitWithUse,
} from "./edit-design-fixtures";

describe("field refusals", () => {
  test("typing a name clears the previous refusal", () => {
    const tester = visit();

    tester.send({
      type: "field-refused",
      field: "name",
      message: "A design needs a name.",
    });
    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });

    expect(tester.getState()).toMatchObject({ draft: { name: "Wool coat" }, error: null });
  });

  test("opening another row clears the refusal of the row being left", () => {
    const tester = visit();

    tester.send({ type: "row-opened", row: "name", now: NOW });
    tester.send({ type: "field-refused", field: "name", message: "A design needs a name." });
    tester.send({ type: "row-opened", row: "description", now: LATER });

    expect(tester.getState().error).toBeNull();
  });

  test("a saved name is trimmed and becomes the value a refusal restores", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "  Wool coat  " });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, name: "Wool coat" },
      patch: { name: "  Wool coat  " },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: "Wool coat" },
      stored: { name: "Wool coat" },
      error: null,
    });

    tester.send({
      type: "field-refused",
      field: "name",
      message: "A design needs a name.",
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: "Wool coat" },
      error: { field: "name", message: "A design needs a name." },
    });
  });

  test("a refused selection falls back to the committed one", () => {
    const tester = visit();

    tester.send({ type: "choice-chosen", field: "categoryId", value: KNITWEAR, now: NOW });
    tester.send({
      type: "choice-chosen",
      field: "collectionId",
      value: "collection-spring",
      now: NOW,
    });
    tester.send({
      type: "field-refused",
      field: "categoryId",
      message: "This design is not here.",
    });
    tester.send({
      type: "field-refused",
      field: "collectionId",
      message: "This design is not here.",
    });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: DRESS, collectionId: null },
      stored: { categoryId: DRESS, collectionId: null },
    });
  });

  test("a draft written by leaving the app becomes the value a later refusal restores", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });
    tester.send({ type: "app-backgrounded", now: NOW });
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, name: "Wool coat" },
      patch: { name: "Wool coat" },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: "Wool coat" },
      stored: { name: "Wool coat" },
    });
  });

  test("a refused write is never recorded as if it landed", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "   " });
    tester.send({ type: "visit-closed", now: NOW });

    // A blank name is refused before the row is touched, so the close settles
    // with the stored row and History writes no Event.
    tester.send({ type: "field-refused", field: "name", message: "A design needs a name." });

    expect(tester.getEffects()).toEqual([
      {
        type: "record-visit",
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      stored: { name: "Silk slip dress" },
      closing: { at: NOW, writesOwed: 0 },
    });
  });

  test("a two-field patch refused by one rule settles the visit once and records nothing", () => {
    const tester = visit();

    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });
    tester.send({ type: "text-changed", field: "description", value: "Heavy twill" });
    tester.send({ type: "visit-closed", now: NOW });

    // One write carries both fields, so the close owes one write, not two.
    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: { fields: { name: "Wool coat", description: "Heavy twill" } },
        now: NOW,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 1 });

    // The refusal names the one field it refused; it does not settle the write.
    tester.send({ type: "field-refused", field: "name", message: "A design needs a name." });
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 1 });

    tester.send({ type: "write-settled", designId: DESIGN_ID });

    const recording = tester.getEffects().filter((effect) => effect.type === "record-visit");

    expect(recording).toHaveLength(1);
    // Nothing was stored, so the visit's after-state is the row it opened on.
    expect(recording[0]).toMatchObject({ before: DESIGN, after: DESIGN });
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 0 });
  });
});

describe("Material use refusals", () => {
  test("a refused remove keeps the use the visit holds on screen", () => {
    const tester = visitWithUse();

    tester.send({ type: "material-use-editor-opened", materialUse: WOOL_USE, now: NOW });
    tester.send({ type: "material-use-panel-fact", fact: { type: "remove-pressed" }, now: NOW });

    // The refusal restores the panel it refused; the use stays in the record.
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "refused", useId: WOOL_USE.id, message: "A material use needs a colour." },
      now: NOW,
    });

    expect(tester.getState().storedUses).toEqual([WOOL_USE]);
    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: "edit",
      stored: WOOL_USE,
      removeArmed: false,
      error: "A material use needs a colour.",
    });
  });

  test("a refusal restores the stored use", () => {
    const tester = opened();

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "colour-changed", colour: "   " },
      now: NOW,
    });
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "refused", useId: WOOL_USE.id, message: "A material use needs a colour." },
      now: NOW,
    });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: "edit",
        colour: "Charcoal",
        error: "A material use needs a colour.",
      },
    });
  });

  test("a field change after a refusal clears the refusal", () => {
    const tester = opened();

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "refused", useId: WOOL_USE.id, message: "A material use needs a colour." },
      now: NOW,
    });
    expect(tester.getState().materialUsePanel).toMatchObject({
      colour: "Charcoal",
      error: "A material use needs a colour.",
    });

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "colour-changed", colour: "Black" },
      now: LATER,
    });
    expect(tester.getState().materialUsePanel).toMatchObject({ colour: "Black", error: null });
  });

  test("a saved correction becomes the row and clears the refusal", () => {
    const tester = opened();
    const corrected: MaterialUse = { ...WOOL_USE, colour: "Ivory", role: "secondary" };

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "refused", useId: WOOL_USE.id, message: "A material use needs a colour." },
      now: NOW,
    });
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "saved", materialUse: corrected },
      now: LATER,
    });

    expect(tester.getState().materialUsePanel).toMatchObject({
      colour: "Ivory",
      role: "secondary",
      stored: corrected,
      error: null,
    });
    expect(tester.getState().storedUses).toEqual([corrected]);
  });

  test("a blank colour still declares the write, whose refusal keeps the choices", () => {
    const tester = adding();

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "material-chosen", materialId: "material-wool" },
      now: NOW,
    });
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "colour-changed", colour: "   " },
      now: NOW,
    });
    tester.send({ type: "material-use-add-confirmed", now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: "write-design",
        designId: DESIGN_ID,
        changes: {
          uses: [
            { kind: "add", input: { materialId: "material-wool", colour: "   ", role: "main" } },
          ],
        },
        now: LATER,
      },
    ]);

    tester.send({
      type: "material-use-add-refused",
      message: "A material use needs a colour.",
    });

    expect(tester.getState().materialUsePanel).toEqual({
      kind: "add",
      editor: {
        materialId: "material-wool",
        colour: "   ",
        role: "main",
        inline: { open: false, name: "", error: null },
        error: "A material use needs a colour.",
      },
    });
  });

  test("a refused add keeps the choices on screen and shows the refusal", () => {
    const tester = chosen();

    tester.send({
      type: "material-use-add-refused",
      message: "A material use needs a colour.",
    });

    expect(tester.getState().materialUsePanel).toEqual({
      kind: "add",
      editor: {
        materialId: "material-wool",
        colour: "Charcoal",
        role: "main",
        inline: { open: false, name: "", error: null },
        error: "A material use needs a colour.",
      },
    });
  });

  test("an inline creation refusal keeps the typed name and the panel open", () => {
    const tester = adding();

    tester.send({ type: "material-use-inline-fact", fact: { type: "opened" } });
    tester.send({
      type: "material-use-inline-fact",
      fact: { type: "name-changed", name: "Silk crêpe" },
    });
    tester.send({
      type: "material-use-inline-fact",
      fact: { type: "refused", message: "That material is already in the list." },
    });

    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: "add",
      editor: {
        inline: { open: true, name: "Silk crêpe", error: "That material is already in the list." },
      },
    });
  });
});
