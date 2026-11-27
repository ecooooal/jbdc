import type { DesignStatus } from "@/features/database";
import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
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
});
