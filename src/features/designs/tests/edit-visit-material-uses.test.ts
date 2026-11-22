import type { MaterialUse } from "../lib/records";
import {
  DESIGN,
  DESIGN_ID,
  LATER,
  NOW,
  WOOL_USE,
  visit,
  visitWithUse,
} from "./edit-design-fixtures";

describe("the visit keeps the Material uses its writes store", () => {
  test("a corrected use replaces what the visit holds", () => {
    const tester = visitWithUse();
    const corrected: MaterialUse = { ...WOOL_USE, colour: "Black", role: "secondary" };

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "saved", materialUse: corrected },
      now: NOW,
    });

    expect(tester.getState().storedUses).toEqual([corrected]);
    expect(tester.getState().visitStartUses).toEqual([WOOL_USE]);
  });

  test("a removed use leaves what the visit holds", () => {
    const tester = visitWithUse();

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "use-removed", useId: WOOL_USE.id },
      now: NOW,
    });

    expect(tester.getState().storedUses).toEqual([]);
    expect(tester.getState().visitStartUses).toEqual([WOOL_USE]);
  });

  test("a missing use settles the write and keeps the visit open", () => {
    const tester = visitWithUse();

    tester.send({ type: "material-use-editor-opened", materialUse: WOOL_USE, now: NOW });
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "colour-changed", colour: "Black" },
      now: NOW,
    });
    tester.send({ type: "visit-closed", now: LATER });

    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "use-missing", useId: WOOL_USE.id },
      now: LATER,
    });
    tester.send({ type: "write-settled", designId: DESIGN_ID });

    // The use is gone, but the Design row is not: the visit records its Event.
    expect(tester.getState().storedUses).toEqual([]);
    expect(tester.getState().materialUsePanel).toBeNull();
    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 0 });
    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: "record-visit",
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [WOOL_USE], after: [] },
        now: LATER,
      },
    ]);
  });

  test("a missing use the visit never held closes its panel and leaves the close waiting", () => {
    const tester = visit();

    // A close declares the one write it still owes.
    tester.send({ type: "text-changed", field: "name", value: "Wool coat" });
    tester.send({ type: "visit-closed", now: LATER });

    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 1 });

    // Its outcome updates the drafts without settling the close.
    tester.send({
      type: "drafts-written",
      design: { ...DESIGN, name: "Wool coat" },
      patch: { name: "Wool coat" },
    });
    const declared = tester.getEffects();

    // A panel can be opened on a use this visit never stored.
    tester.send({ type: "material-use-editor-opened", materialUse: WOOL_USE, now: LATER });
    tester.send({
      type: "material-use-panel-fact",
      fact: { type: "use-missing", useId: WOOL_USE.id },
      now: LATER,
    });

    // Only that panel closes: the use was not in the record to drop, and the
    // close still owes the write it declared.
    expect(tester.getState().materialUsePanel).toBeNull();
    expect(tester.getState().storedUses).toEqual([]);
    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 1 });
    expect(tester.getEffects()).toEqual(declared);

    tester.send({ type: "write-settled", designId: DESIGN_ID });

    const recording = tester.getEffects().filter((effect) => effect.type === "record-visit");

    expect(recording).toHaveLength(1);
    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 0 });
  });
});
