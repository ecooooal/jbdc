import type { DesignStatus } from "@/features/database";
import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
  canSaveDecision,
  createInitialDesignDetailState,
  designDetailReducer,
  type DesignDetailEffect,
  type DesignDetailEvent,
  type DesignDetailState,
} from "../lib/design-detail-reducer";

const DESIGN_ID = "design-one";

function statusSheet(designId: string = DESIGN_ID) {
  return createReducerTester<DesignDetailState, DesignDetailEvent, DesignDetailEffect>(
    designDetailReducer,
    createInitialDesignDetailState(designId),
  );
}

/** The surface with its status sheet open on the Design's current Status. */
function opened(status: DesignStatus = "concept") {
  const tester = statusSheet();

  tester.send({ type: "status-sheet-opened", status });

  return tester;
}

describe("the Detail surface's status sheet", () => {
  test("opening it checks the Design's current Status and declares no write", () => {
    const tester = opened("approved");

    expect(tester.getState().statusSheet).toEqual({ current: "approved", rejection: null });
    expect(tester.getEffects()).toEqual([]);
  });

  test("a non-rejected row declares one immediate write and closes the sheet", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "approved" });

    expect(tester.getEffects()).toEqual([
      { type: "change-status", designId: DESIGN_ID, change: { status: "approved" } },
    ]);
    expect(tester.getState().statusSheet).toBeNull();
  });

  test("the checked row declares no write and closes the sheet", () => {
    const tester = opened("approved");

    tester.send({ type: "status-row-pressed", status: "approved" });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().statusSheet).toBeNull();
  });

  test("the checked Rejected row closes without expanding the form", () => {
    const tester = opened("rejected");

    tester.send({ type: "status-row-pressed", status: "rejected" });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().statusSheet).toBeNull();
  });

  test("the Rejected row expands an empty form without a write", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "rejected" });

    expect(tester.getState().statusSheet).toEqual({
      current: "concept",
      rejection: { reason: "", potentialImprovements: "" },
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("dismissing the expanded Rejected row drops the form and writes nothing", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "rejected" });
    tester.send({ type: "status-sheet-closed" });

    expect(tester.getState().statusSheet).toBeNull();
    expect(tester.getEffects()).toEqual([]);
  });

  test("typing the rejection form keeps the draft and declares no write", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "rejected" });
    tester.send({
      type: "rejection-field-changed",
      field: "reason",
      value: "The fabric cost too much",
    });
    tester.send({
      type: "rejection-field-changed",
      field: "potentialImprovements",
      value: "Try the wool blend",
    });

    expect(tester.getState().statusSheet?.rejection).toEqual({
      reason: "The fabric cost too much",
      potentialImprovements: "Try the wool blend",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("Reject design declares one write carrying the why and closes the sheet", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "rejected" });
    tester.send({
      type: "rejection-field-changed",
      field: "reason",
      value: "The fabric cost too much",
    });
    tester.send({
      type: "rejection-field-changed",
      field: "potentialImprovements",
      value: "Try the wool blend",
    });
    tester.send({ type: "reject-pressed" });

    expect(tester.getEffects()).toEqual([
      {
        type: "change-status",
        designId: DESIGN_ID,
        change: {
          status: "rejected",
          reason: "The fabric cost too much",
          potentialImprovements: "Try the wool blend",
        },
      },
    ]);
    expect(tester.getState().statusSheet).toBeNull();
  });

  test("a rejection with both fields left empty still declares one write", () => {
    const tester = opened("concept");

    tester.send({ type: "status-row-pressed", status: "rejected" });
    tester.send({ type: "reject-pressed" });

    expect(tester.getEffects()).toEqual([
      {
        type: "change-status",
        designId: DESIGN_ID,
        change: { status: "rejected", reason: "", potentialImprovements: "" },
      },
    ]);
  });
});

describe("the Detail surface's decision sheet", () => {
  test("Add a decision opens the sheet prefilled from the latest decision", () => {
    const tester = statusSheet();

    tester.send({
      type: "decision-sheet-opened",
      latest: {
        reason: "The fabric cost too much",
        potentialImprovements: "Try the wool blend",
      },
    });

    expect(tester.getState().decisionSheet).toEqual({
      reason: "The fabric cost too much",
      potentialImprovements: "Try the wool blend",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("Add a decision with no latest decision opens an empty form", () => {
    const tester = statusSheet();

    tester.send({ type: "decision-sheet-opened", latest: null });

    expect(tester.getState().decisionSheet).toEqual({
      reason: "",
      potentialImprovements: "",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("Save decision is disabled while both trimmed fields are empty", () => {
    expect(canSaveDecision({ reason: "", potentialImprovements: "" })).toBe(false);
    expect(canSaveDecision({ reason: "   ", potentialImprovements: "\n\t" })).toBe(false);
  });

  test("Save decision is enabled when either field has text", () => {
    expect(canSaveDecision({ reason: "The fringe shed", potentialImprovements: "" })).toBe(true);
    expect(canSaveDecision({ reason: "", potentialImprovements: "Try a tighter weave" })).toBe(
      true,
    );
    expect(canSaveDecision({ reason: "   ", potentialImprovements: " Try a tighter weave " })).toBe(
      true,
    );
  });

  test("typing a decision field keeps the draft and declares no write", () => {
    const tester = statusSheet();

    tester.send({ type: "decision-sheet-opened", latest: null });
    tester.send({ type: "decision-field-changed", field: "reason", value: "The fringe shed" });
    tester.send({
      type: "decision-field-changed",
      field: "potentialImprovements",
      value: "Try a tighter weave",
    });

    expect(tester.getState().decisionSheet).toEqual({
      reason: "The fringe shed",
      potentialImprovements: "Try a tighter weave",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("dismissing the decision sheet drops the draft and writes nothing", () => {
    const tester = statusSheet();

    tester.send({ type: "decision-sheet-opened", latest: null });
    tester.send({ type: "decision-field-changed", field: "reason", value: "The fringe shed" });
    tester.send({ type: "decision-sheet-closed" });

    expect(tester.getState().decisionSheet).toBeNull();
    expect(tester.getEffects()).toEqual([]);
  });

  test("Save decision declares one write carrying the why and closes the sheet", () => {
    const tester = statusSheet();

    tester.send({
      type: "decision-sheet-opened",
      latest: { reason: "The fabric cost too much", potentialImprovements: null },
    });
    tester.send({ type: "decision-field-changed", field: "reason", value: "The fringe shed" });
    tester.send({
      type: "decision-field-changed",
      field: "potentialImprovements",
      value: "Try a tighter weave",
    });
    tester.send({ type: "save-decision-pressed" });

    expect(tester.getEffects()).toEqual([
      {
        type: "record-decision",
        designId: DESIGN_ID,
        decision: {
          reason: "The fringe shed",
          potentialImprovements: "Try a tighter weave",
        },
      },
    ]);
    expect(tester.getState().decisionSheet).toBeNull();
  });
});
