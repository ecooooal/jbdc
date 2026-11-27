import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { router, useFocusEffect } from "expo-router";
import type { ReactNode } from "react";
import { AppState, BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { changeStatus, createDesign } from "@/features/designs";
import { listLibraryDesigns } from "@/features/library";
import { LibraryScreen } from "@/features/library/react";
import type { Grouping } from "@/features/settings";
import { ThemeChoiceProvider } from "@/features/settings/react";
import { createCollection } from "@/features/taxonomy";
import { PRESS_HIGHLIGHT_HOLD_MS } from "../lib/library-screen-reducer";

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));

// The native dropdown's portal waits for a trigger measurement Jest never
// fires. Render its rows inline, inside the real root and items, so the tests
// reach the grouping radio and the view checkbox the way the Detail menu's
// rows are tested.
jest.mock("@/shared/components/ui/dropdown-menu", () => {
  const actual = jest.requireActual("@/shared/components/ui/dropdown-menu");
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ...actual,
    DropdownMenuContent: ({ children }: { children?: ReactNode }) =>
      React.createElement(View, null, children),
  };
});

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  jest.clearAllMocks();
  jest.mocked(useFocusEffect).mockReset();
});

afterEach(() => {
  dispose();
  jest.useRealTimers();
  Uniwind.setTheme("system");
});

async function renderLibrary() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <ThemeChoiceProvider>
          <LibraryScreen />
        </ThemeChoiceProvider>
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

test("the empty view names the Library, not the Catalog", async () => {
  await renderLibrary();

  expect(screen.getByText("The library is empty")).toBeTruthy();
  expect(screen.queryByText(/catalog/i)).toBeNull();
});

test("the menu's Group by remembers the choice", async () => {
  seedCollections();
  const first = await renderLibrary();

  expect(screen.getByRole("radio", { name: "Design" })).toBeChecked();

  await chooseGrouping("per-collection");

  expect(screen.getByRole("radio", { name: "Collection" })).toBeChecked();

  const spring = within(screen.getByTestId("library-section-Spring"));

  expect(within(spring.getByTestId("library-row-0")).getAllByRole("button")).toHaveLength(2);

  // A second screen reads the stored choice, like the next launch of the app.
  await first.unmount();

  await renderLibrary();

  expect(screen.getByRole("radio", { name: "Collection" })).toBeChecked();
});

test("the view control shows the active Library and switches to the rejected cards", async () => {
  seedStream();
  rejectDesign("Rejected coat", "The fabric cost too much", 4000);

  await renderLibrary();

  expect(screen.getByRole("button", { name: "Library" })).toBeTruthy();

  await toggleRejectedDesigns();

  expect(screen.getByRole("button", { name: "Rejected designs" })).toBeTruthy();
  expect(screen.queryByText("Freshest dress")).toBeNull();
  expect(screen.getByText("Rejected coat")).toBeTruthy();
});

test("unchecking Rejected designs returns the control and the screen to the Library", async () => {
  seedStream();
  rejectDesign("Rejected coat", "The fabric cost too much", 4000);

  await renderLibrary();
  await toggleRejectedDesigns();
  await toggleRejectedDesigns();

  expect(screen.getByRole("button", { name: "Library" })).toBeTruthy();
  expect(screen.getByText("Freshest dress")).toBeTruthy();
  expect(screen.queryByText("Rejected coat")).toBeNull();
});

test("the search and filter placeholders render disabled and say they are coming", async () => {
  await renderLibrary();

  for (const name of ["Search", "Filter"]) {
    const control = screen.getByRole("button", { name });

    expect(control).toBeDisabled();
    expect(control).toHaveProp("accessibilityHint", "Coming soon");
  }
});

test("the header carries no create button; the FAB owns add", async () => {
  seedStream();

  await renderLibrary();

  expect(screen.queryByRole("button", { name: "Create design" })).toBeNull();
});

test("the FAB expands into add, theme, and settings actions", async () => {
  seedStream();
  const user = userEvent.setup();

  await renderLibrary();

  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();

  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(screen.getByRole("button", { name: "Add design" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Settings" })).toBeDisabled();

  // Every action is named on paper, and the one that does not exist yet says
  // so instead of fading into the work behind it.
  expect(screen.getByText("Add design")).toBeTruthy();
  expect(screen.getByText("Dark theme")).toBeTruthy();
  expect(screen.getByText("Coming soon")).toBeTruthy();
});

test("the FAB's add action opens the create screen", async () => {
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));
  await user.press(screen.getByRole("button", { name: "Add design" }));

  expect(router.push).toHaveBeenLastCalledWith("/designs/new");
});

test("the FAB's theme action persists the chosen mode and applies it", async () => {
  const user = userEvent.setup();
  const first = await renderLibrary();

  await user.press(screen.getByRole("button", { name: "More actions" }));
  await user.press(screen.getByRole("button", { name: "Switch to dark theme" }));

  // Applied: the Library now offers the other mode.
  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();

  // Persisted: a fresh app open reads the stored choice back.
  await first.unmount();
  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
});

test("an outside tap closes the FAB instead of reaching the card below", async () => {
  const user = userEvent.setup();
  seedStream();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));
  await fireEvent.press(screen.getByTestId("library-fab-dismiss"));

  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();
  expect(router.push).not.toHaveBeenCalled();
});

test("leaving the Library closes the FAB", async () => {
  let closeOnLeave: (() => void) | undefined;

  jest.mocked(useFocusEffect).mockImplementation((effect) => {
    const cleanup = effect();

    closeOnLeave = typeof cleanup === "function" ? cleanup : undefined;
  });

  const user = userEvent.setup();
  seedStream();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(screen.getByRole("button", { name: "Add design" })).toBeTruthy();

  await act(async () => closeOnLeave?.());

  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();
});

test("backgrounding the app closes the FAB", async () => {
  // The RN Jest preset already mocks AppState with a subscription-returning
  // listener, so the test reads the handler it recorded instead of replacing it.
  const addEventListener = AppState.addEventListener as unknown as jest.Mock;
  const user = userEvent.setup();
  seedStream();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(screen.getByRole("button", { name: "Add design" })).toBeTruthy();

  const handler = addEventListener.mock.calls.at(-1)?.[1] as (status: string) => void;

  if (!handler) throw new Error("The FAB did not subscribe to AppState");

  await act(async () => handler("background"));

  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();
});

test("the system Back closes the open FAB and stays on the Library", async () => {
  const handlers: (() => boolean | null | undefined)[] = [];
  const addEventListener = jest.spyOn(BackHandler, "addEventListener").mockImplementation(((
    _event: string,
    handler: () => boolean | null | undefined,
  ) => {
    handlers.push(handler);

    return { remove: jest.fn() };
  }) as never);

  const user = userEvent.setup();
  seedStream();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "More actions" }));

  let consumed = false;

  await act(async () => {
    consumed = handlers[0]() === true;
  });

  expect(consumed).toBe(true);
  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();
  addEventListener.mockRestore();
});

test("the content behind the open actions is hidden from assistive tech", async () => {
  const user = userEvent.setup();
  seedStream();

  await renderLibrary();

  const content = screen.getByTestId("library-content");

  expect(content).toHaveProp("importantForAccessibility", "auto");
  expect(content).toHaveProp("accessibilityElementsHidden", false);

  await user.press(screen.getByRole("button", { name: "More actions" }));

  expect(content).toHaveProp("importantForAccessibility", "no-hide-descendants");
  expect(content).toHaveProp("accessibilityElementsHidden", true);
});

/** Three designs with no Collection, freshest first as the default read orders them. */
function seedStream() {
  createDesign(database, { name: "Freshest dress" }, 3000);
  createDesign(database, { name: "Middle skirt" }, 2000);
  createDesign(database, { name: "Oldest coat" }, 1000);
}

/** The width of one single-view page in the pager's settle events. */
const PAGE_WIDTH = 390;

/**
 * Ends a swipe on the pager at a horizontal offset, as the scroll view reports
 * it: the page it settles on is what the header's position chip shows.
 */
async function settlePagerAt(offset: number) {
  await fireEvent(screen.getByTestId("single-view"), "momentumScrollEnd", {
    nativeEvent: {
      contentOffset: { x: offset, y: 0 },
      contentSize: { width: PAGE_WIDTH * 8, height: 700 },
      layoutMeasurement: { width: PAGE_WIDTH, height: 700 },
      zoomScale: 1,
    },
  });
}

/**
 * Asserts the design names the single view shows, in the order its pages are
 * laid out, by the text the Owner reads on each heading rather than the shape
 * of the heading element.
 */
function expectPageNames(names: readonly string[]) {
  const headings = within(screen.getByTestId("single-view")).getAllByRole("heading");

  expect(headings).toHaveLength(names.length);
  names.forEach((name, index) => {
    expect(headings[index]).toHaveTextContent(name);
  });
}

test("density 1 pages the first Design full-screen instead of listing it", async () => {
  seedStream();
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByLabelText("Single view"));

  const pager = screen.getByTestId("single-view");

  expect(pager.props.bounces).toBe(false);
  expect(pager.props.overScrollMode).toBe("never");
  expectPageNames(["Freshest dress", "Middle skirt", "Oldest coat"]);
  expect(screen.getByText("1 / 3")).toBeTruthy();
});

test("a swipe settles on its page and both edges stop the pager", async () => {
  seedStream();
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByLabelText("Single view"));

  await settlePagerAt(PAGE_WIDTH);

  expect(screen.getByText("2 / 3")).toBeTruthy();

  await settlePagerAt(PAGE_WIDTH * 2);

  expect(screen.getByText("3 / 3")).toBeTruthy();

  await settlePagerAt(PAGE_WIDTH * 5);

  expect(screen.getByText("3 / 3")).toBeTruthy();

  await settlePagerAt(-PAGE_WIDTH);

  expect(screen.getByText("1 / 3")).toBeTruthy();
});

test("the pager walks the grouping selector's order, not the read's", async () => {
  seedCollections();
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByLabelText("Single view"));
  await chooseGrouping("per-collection");

  expectPageNames([
    "Spring blouse",
    "Spring skirt",
    "Spring dress",
    "Spring scarf",
    "Autumn coat",
    "No season dress",
  ]);
});

/** Two Collections, four designs in Spring, one in none; Spring is freshest, then Autumn. */
function seedCollections() {
  const spring = createCollection(database, { name: "Spring" }, 1);
  const autumn = createCollection(database, { name: "Autumn" }, 2);

  createDesign(database, { name: "Autumn coat", collectionId: autumn.id }, 1000);
  createDesign(database, { name: "Spring scarf", collectionId: spring.id }, 500);
  createDesign(database, { name: "Spring skirt", collectionId: spring.id }, 2000);
  createDesign(database, { name: "No season dress" }, 3000);
  createDesign(database, { name: "Spring blouse", collectionId: spring.id }, 4000);
  createDesign(database, { name: "Spring dress", collectionId: spring.id }, 1500);
}

/** The labels the picker shows, so the seam hands over what a pick would. */
const GROUPING_LABELS: Record<Grouping, string> = {
  "per-design": "Design",
  "per-collection": "Collection",
};

/**
 * Picks a grouping through the menu's radio. The menu's content is rendered
 * inline by this file's mock, so the row is reachable without opening the
 * native portal, the same seam the Detail menu's rows use.
 */
async function chooseGrouping(grouping: Grouping) {
  await fireEvent.press(screen.getByRole("radio", { name: GROUPING_LABELS[grouping] }));
}

/** Checks, or unchecks, the header menu's Rejected designs view. */
async function toggleRejectedDesigns() {
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rejected designs" }));
}

/** Rejects a design through the Status write, with its reason and timestamp. */
function rejectDesign(name: string, reason: string | null, now: number) {
  const design = createDesign(database, { name }, now - 1);

  changeStatus(
    database,
    design.id,
    { status: "rejected", reason, potentialImprovements: null },
    now,
  );
}

test("The Collection grouping regroups the density-2 grid under Collection headers", async () => {
  seedCollections();

  await renderLibrary();

  // The Design grouping is today's flat stream: the designs, no Collection headers.
  expect(screen.getByText("Spring blouse")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Spring" })).toBeNull();

  await chooseGrouping("per-collection");

  const spring = within(screen.getByTestId("library-section-Spring"));

  expect(spring.getByRole("heading", { name: "Spring" })).toBeTruthy();
  expect(spring.getByText("Spring blouse")).toBeTruthy();
  expect(spring.getByText("Spring skirt")).toBeTruthy();

  const autumn = within(screen.getByTestId("library-section-Autumn"));

  expect(autumn.getByRole("heading", { name: "Autumn" })).toBeTruthy();
  expect(autumn.getByText("Autumn coat")).toBeTruthy();

  const unfiled = within(screen.getByTestId("library-section-no-collection"));

  expect(unfiled.getByRole("heading", { name: "No collection" })).toBeTruthy();
  expect(unfiled.getByText("No season dress")).toBeTruthy();
});

test("The Collection grouping reads each Collection heading before its Designs", async () => {
  seedCollections();

  await renderLibrary();
  await chooseGrouping("per-collection");

  // The outline the screen reader walks: one Collection, its Designs, the next.
  const outline = [
    "Spring",
    "Spring blouse",
    "Spring skirt",
    "Spring dress",
    "Spring scarf",
    "Autumn",
    "Autumn coat",
    "No collection",
    "No season dress",
  ];
  const headings = screen.getAllByRole("heading");

  expect(headings).toHaveLength(outline.length);
  outline.forEach((name, index) => expect(headings[index]).toHaveTextContent(name));
});

test("the density control offers the single view and two designs per row", async () => {
  seedStream();

  await renderLibrary();

  expect(screen.getByLabelText("Single view")).toBeTruthy();
  expect(screen.getByLabelText("Two designs per row")).toBeTruthy();
  expect(screen.queryByLabelText("Four designs per row")).toBeNull();
  // The segments draw the layout; no numeral has to be memorised.
  expect(screen.queryByText("1")).toBeNull();
  expect(screen.queryByText("2")).toBeNull();
});

test("the FAB keeps one corner when the density changes", async () => {
  seedStream();
  const user = userEvent.setup();

  await renderLibrary();

  const twoUpBottom = screen.getByTestId("library-fab-anchor").props.style.bottom;

  await user.press(screen.getByLabelText("Single view"));

  expect(screen.getByTestId("library-fab-anchor").props.style.bottom).toBe(twoUpBottom);
});

/** Every density, in the order the header's control names them. */
const DENSITY_LABELS = ["Two designs per row", "Single view"] as const;

test("a tap on a card at every density opens its Detail", async () => {
  seedStream();
  const user = userEvent.setup();
  const freshest = listLibraryDesigns(database).find((design) => design.name === "Freshest dress");

  if (!freshest) throw new Error("No Library design named Freshest dress");

  jest.useFakeTimers();
  await renderLibrary();

  for (const density of DENSITY_LABELS) {
    await user.press(screen.getByLabelText(density));

    jest.mocked(router.push).mockClear();
    await fireEvent(screen.getByRole("button", { name: "Freshest dress" }), "press");

    await act(async () => {
      jest.advanceTimersByTime(PRESS_HIGHLIGHT_HOLD_MS);
    });

    expect(router.push).toHaveBeenLastCalledWith({
      pathname: "/designs/[id]",
      params: { id: freshest.id },
    });
  }
});
