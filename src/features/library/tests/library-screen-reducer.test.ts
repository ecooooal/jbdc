import { createReducerTester } from "@/shared/testing/reducer-tester";
import {
  createInitialLibraryScreenState,
  libraryScreenReducer,
  type LibraryScreenEvent,
} from "../lib/library-screen-reducer";

/** The Design every press fixture names. */
const DESIGN_ID = "design-silk-slip";

/** The exits that shut the FAB's actions without choosing one. */
const CLOSING_EXITS = [
  { type: "fab-dismissed" },
  { type: "library-left" },
  { type: "app-backgrounded" },
] as const satisfies readonly LibraryScreenEvent[];

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
      actionsOpen: false,
      press: { designId: DESIGN_ID, phase: "down" },
      view: "library",
    });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: "press-released", designId: DESIGN_ID });

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });

  test("a tap holds the highlight and asks for the cards to open", () => {
    const tester = library({ type: "card-tapped", designId: DESIGN_ID });

    expect(tester.getState()).toEqual({
      actionsOpen: false,
      press: { designId: DESIGN_ID, phase: "holding" },
      view: "library",
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });

  test("a second tap while the highlight holds opens nothing more", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "card-tapped", designId: DESIGN_ID },
    );

    expect(tester.getState()).toEqual({
      actionsOpen: false,
      press: { designId: DESIGN_ID, phase: "holding" },
      view: "library",
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });

  test("a lift during the held beat leaves the highlight up", () => {
    const tester = library(
      { type: "card-tapped", designId: DESIGN_ID },
      { type: "press-released", designId: DESIGN_ID },
    );

    expect(tester.getState()).toEqual({
      actionsOpen: false,
      press: { designId: DESIGN_ID, phase: "holding" },
      view: "library",
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
      actionsOpen: false,
      press: { designId: DESIGN_ID, phase: "holding" },
      view: "library",
    });
    expect(tester.getEffects()).toEqual([{ type: "hold-cards-open", designId: DESIGN_ID }]);
  });
});

describe("the session view", () => {
  test("a fresh session opens the active Library", () => {
    expect(createInitialLibraryScreenState()).toEqual({
      actionsOpen: false,
      press: null,
      view: "library",
    });
  });

  test("checking Rejected designs switches the same screen to the rejected view", () => {
    const tester = library({ type: "rejected-designs-checked", checked: true });

    expect(tester.getState()).toEqual({
      ...createInitialLibraryScreenState(),
      view: "rejected",
    });
    expect(tester.getEffects()).toEqual([]);
  });

  test("unchecking Rejected designs switches back to the Library", () => {
    const tester = library(
      { type: "rejected-designs-checked", checked: true },
      { type: "rejected-designs-checked", checked: false },
    );

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });

  test("the empty view's View the library returns to the Library", () => {
    const tester = library(
      { type: "rejected-designs-checked", checked: true },
      { type: "library-view-tapped" },
    );

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });

  test("a new session still opens the active Library after one switched views", () => {
    library({ type: "rejected-designs-checked", checked: true });

    expect(createInitialLibraryScreenState().view).toBe("library");
  });
});

describe("the FAB's actions", () => {
  test("its own tap opens the actions and another tap shuts them", () => {
    const tester = library({ type: "fab-tapped" });

    expect(tester.getState()).toEqual({
      ...createInitialLibraryScreenState(),
      actionsOpen: true,
    });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: "fab-tapped" });

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });

  test("choosing add shuts the actions and asks for the create screen", () => {
    const tester = library({ type: "fab-tapped" }, { type: "fab-action-taken", action: "add" });

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([{ type: "open-create-screen" }]);
  });

  test("choosing the theme shuts the actions and asks for the chosen scheme", () => {
    const tester = library(
      { type: "fab-tapped" },
      { type: "fab-action-taken", action: "theme", scheme: "dark" },
    );

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([{ type: "apply-theme", scheme: "dark" }]);
  });

  test("an action taken after the actions have shut asks for nothing", () => {
    const tester = library(
      { type: "fab-tapped" },
      { type: "fab-action-taken", action: "add" },
      { type: "fab-action-taken", action: "add" },
    );

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([{ type: "open-create-screen" }]);
  });

  test.each(CLOSING_EXITS)("$type shuts the actions", (exit) => {
    const tester = library({ type: "fab-tapped" }, exit);

    expect(tester.getState()).toEqual(createInitialLibraryScreenState());
    expect(tester.getEffects()).toEqual([]);
  });
});
