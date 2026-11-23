import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
  createInitialLibraryScreenState,
  libraryScreenReducer,
  type LibraryScreenEvent,
} from "../lib/library-screen-reducer";

/** The Design every press fixture names. */
const DESIGN_ID = "design-silk-slip";

/** Drives the Library reducer with the sequence of events and answers what settled. */
function library(...events: LibraryScreenEvent[]) {
  const tester = createReducerTester(libraryScreenReducer, createInitialLibraryScreenState());

  for (const event of events) tester.send(event);

  return tester;
}

describe("pressing a Library card", () => {
  test("a touch-down dips the card until the finger lifts", () => {
    const tester = library({ type: "press-started", designId: DESIGN_ID });

    expect(tester.getState()).toEqual({
      press: { designId: DESIGN_ID, phase: "down" },
    });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: "press-released", designId: DESIGN_ID });

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });

  test("a tap holds the highlight and asks for the cards to open", () => {
    const tester = library({ type: "card-tapped", designId: DESIGN_ID });

    expect(tester.getState()).toEqual({
      press: { designId: DESIGN_ID, phase: "holding" },
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });

  test("a second tap while the highlight holds opens nothing more", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "card-tapped", designId: DESIGN_ID },
    );

    expect(tester.getState()).toEqual({
      press: { designId: DESIGN_ID, phase: "holding" },
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });

  test("a lift during the held beat leaves the highlight up", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "press-released", designId: DESIGN_ID },
    );

    expect(tester.getState()).toEqual({
      press: { designId: DESIGN_ID, phase: "holding" },
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });

  test("the held beat elapsing clears the highlight and opens the Design", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "hold-elapsed", designId: DESIGN_ID },
    );

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([
      { type: "hold-cards-open", designId: DESIGN_ID },
      { type: "open-design", designId: DESIGN_ID },
    ]);
  });

  test("a held beat for another Design opens nothing", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "hold-elapsed", designId: "design-other" },
    );

    expect(tester.getState()).toEqual({
      press: { designId: DESIGN_ID, phase: "holding" },
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });
});
