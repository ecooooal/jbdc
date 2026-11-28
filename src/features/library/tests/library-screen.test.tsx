import { act, fireEvent, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Uniwind } from "uniwind";
import { createTempDatabase } from "@/features/database/testing";
import { listLibraryDesigns } from "@/features/library";
import type { Grouping } from "@/features/settings";
import { PRESS_HIGHLIGHT_HOLD_MS } from "../lib/library-screen-reducer";
import {
  rejectDesign,
  renderLibraryScreen,
  seedCollections,
  seedStream,
} from "./library-screen-fixtures";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

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

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  jest.clearAllMocks();
});

afterEach(() => {
  dispose();
  jest.useRealTimers();
  Uniwind.setTheme("system");
});

async function renderLibrary() {
  return renderLibraryScreen(database);
}

test("the empty view names the Library, not the Catalog", async () => {
  await renderLibrary();

  expect(screen.getByText("The library is empty")).toBeTruthy();
  expect(screen.queryByText(/catalog/i)).toBeNull();
});

test("the menu's Group by remembers the choice", async () => {
  seedCollections(database);
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
  seedStream(database);
  rejectDesign(database, "Rejected coat", "The fabric cost too much", 4000);

  await renderLibrary();

  expect(screen.getByRole("button", { name: "View: Library" })).toBeTruthy();

  await toggleRejectedDesigns();

  expect(screen.getByRole("button", { name: "View: Rejected designs" })).toBeTruthy();
  expect(screen.queryByText("Freshest dress")).toBeNull();
  expect(screen.getByText("Rejected coat")).toBeTruthy();
});

test("unchecking Rejected designs returns the control and the screen to the Library", async () => {
  seedStream(database);
  rejectDesign(database, "Rejected coat", "The fabric cost too much", 4000);

  await renderLibrary();
  await toggleRejectedDesigns();
  await toggleRejectedDesigns();

  expect(screen.getByRole("button", { name: "View: Library" })).toBeTruthy();
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
  seedStream(database);

  await renderLibrary();

  expect(screen.queryByRole("button", { name: "Create design" })).toBeNull();
});

test("the FAB opens the create screen in one press", async () => {
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByRole("button", { name: "Add design" }));

  expect(router.push).toHaveBeenLastCalledWith("/designs/new");
});

test("the settings menu's density switch reflows the Library to the single view", async () => {
  seedStream(database);
  const user = userEvent.setup();

  await renderLibrary();

  expect(screen.getByRole("switch", { name: "Single view" })).not.toBeChecked();
  expect(screen.getByRole("switch", { name: "Dark mode" })).toBeTruthy();
  expect(screen.queryByRole("switch", { name: "Four designs per row" })).toBeNull();
  expect(screen.queryByTestId("single-view")).toBeNull();

  await user.press(screen.getByRole("switch", { name: "Single view" }));

  expect(screen.getByRole("switch", { name: "Single view" })).toBeChecked();
  expect(screen.getByTestId("single-view")).toBeTruthy();
  expect(screen.getByText("1 / 3")).toBeTruthy();

  await user.press(screen.getByRole("switch", { name: "Single view" }));

  expect(screen.getByRole("switch", { name: "Single view" })).not.toBeChecked();
  expect(screen.queryByTestId("single-view")).toBeNull();
});

test("the settings menu's dark mode switch applies the scheme and persists it", async () => {
  const user = userEvent.setup();
  const first = await renderLibrary();

  expect(screen.getByRole("switch", { name: "Dark mode" })).not.toBeChecked();

  await user.press(screen.getByRole("switch", { name: "Dark mode" }));

  expect(screen.getByRole("switch", { name: "Dark mode" })).toBeChecked();

  // Persisted: a fresh app open reads the stored choice back.
  await first.unmount();
  await renderLibrary();

  expect(screen.getByRole("switch", { name: "Dark mode" })).toBeChecked();

  await user.press(screen.getByRole("switch", { name: "Dark mode" }));

  expect(screen.getByRole("switch", { name: "Dark mode" })).not.toBeChecked();
});

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
  seedStream(database);
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByRole("switch", { name: "Single view" }));

  const pager = screen.getByTestId("single-view");

  expect(pager.props.bounces).toBe(false);
  expect(pager.props.overScrollMode).toBe("never");
  expectPageNames(["Freshest dress", "Middle skirt", "Oldest coat"]);
  expect(screen.getByText("1 / 3")).toBeTruthy();
});

test("a swipe settles on its page and both edges stop the pager", async () => {
  seedStream(database);
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByRole("switch", { name: "Single view" }));

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
  seedCollections(database);
  const user = userEvent.setup();

  await renderLibrary();
  await user.press(screen.getByRole("switch", { name: "Single view" }));
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

test("The Collection grouping regroups the density-2 grid under Collection headers", async () => {
  seedCollections(database);

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
  seedCollections(database);

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

test("the FAB keeps one corner when the density changes", async () => {
  seedStream(database);
  const user = userEvent.setup();

  await renderLibrary();

  const twoUpBottom = screen.getByTestId("library-fab-anchor").props.style.bottom;

  await user.press(screen.getByRole("switch", { name: "Single view" }));

  expect(screen.getByTestId("library-fab-anchor").props.style.bottom).toBe(twoUpBottom);
});

test("a tap on a card at every density opens its Detail", async () => {
  seedStream(database);
  const user = userEvent.setup();
  const freshest = listLibraryDesigns(database).find((design) => design.name === "Freshest dress");

  if (!freshest) throw new Error("No Library design named Freshest dress");

  jest.useFakeTimers();
  await renderLibrary();

  for (const singleView of [false, true]) {
    if (singleView) {
      await user.press(screen.getByRole("switch", { name: "Single view" }));
    }

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
