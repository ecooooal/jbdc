import { fireEvent, screen, userEvent, within } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { createTempDatabase } from "@/features/database/testing";
import { createCollection } from "@/features/taxonomy";
import { rejectDesign, renderLibraryScreen, seedStream } from "./library-screen-fixtures";

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
});

/** Checks the header menu's Rejected designs view. */
async function showRejectedDesigns() {
  await fireEvent.press(screen.getByRole("checkbox", { name: "Rejected designs" }));
}

/** Picks a grouping through the menu's radio, rendered inline by this file's mock. */
async function chooseGrouping(label: "Design" | "Collection") {
  await fireEvent.press(screen.getByRole("radio", { name: label }));
}

/** Asserts the design names the density-2 grid draws, in the order they appear. */
function expectGridNames(names: readonly string[]) {
  const headings = screen.getAllByRole("heading");

  expect(headings).toHaveLength(names.length);
  names.forEach((name, index) => expect(headings[index]).toHaveTextContent(name));
}

test("the rejected view draws the two-per-row cards and their reasons", async () => {
  seedStream(database);
  rejectDesign(database, "Rejected coat", "The fabric cost too much", 4000);

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expect(screen.getByText("Rejected coat")).toBeTruthy();
  expect(screen.getByText("The fabric cost too much")).toBeTruthy();
  expect(screen.queryByText("Freshest dress")).toBeNull();
  expect(screen.getByTestId("library-row-0")).toBeTruthy();
  expect(screen.queryByTestId("single-view")).toBeNull();
});

test("a rejected card with a blank reason reads No reason recorded", async () => {
  rejectDesign(database, "Rejected coat", null, 4000);

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expect(screen.getByText("No reason recorded")).toBeTruthy();
});

test("a rejected card announces its reason as part of the one tap target", async () => {
  seedStream(database);
  rejectDesign(database, "Rejected coat", "The fabric cost too much", 4000);

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expect(
    screen.getByRole("button", { name: "Rejected coat, The fabric cost too much" }),
  ).toBeTruthy();
});

test("a rejected card with no reason announces that none was recorded", async () => {
  rejectDesign(database, "Rejected coat", null, 4000);

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expect(screen.getByRole("button", { name: "Rejected coat, No reason recorded" })).toBeTruthy();
});

test("the rejected view orders designs by their most recent update, newest first", async () => {
  rejectDesign(database, "Oldest coat", "Too costly", 1000);
  rejectDesign(database, "Newest coat", "Too costly", 3000);
  rejectDesign(database, "Middle coat", "Too costly", 2000);

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expectGridNames(["Newest coat", "Middle coat", "Oldest coat"]);
});

test("the rejected view keeps the Collection grouping", async () => {
  const spring = createCollection(database, { name: "Spring" }, 1);
  const autumn = createCollection(database, { name: "Autumn" }, 2);

  rejectDesign(database, "Spring coat", "Too costly", 1000, spring.id);
  rejectDesign(database, "Autumn coat", "Too heavy", 2000, autumn.id);
  rejectDesign(database, "Unfiled coat", null, 3000);

  await renderLibraryScreen(database);
  await chooseGrouping("Collection");
  await showRejectedDesigns();

  const springSection = within(screen.getByTestId("library-section-Spring"));

  expect(springSection.getByText("Spring coat")).toBeTruthy();
  expect(springSection.getByText("Too costly")).toBeTruthy();

  const autumnSection = within(screen.getByTestId("library-section-Autumn"));

  expect(autumnSection.getByText("Autumn coat")).toBeTruthy();
  expect(autumnSection.getByText("Too heavy")).toBeTruthy();

  const unfiled = within(screen.getByTestId("library-section-no-collection"));

  expect(unfiled.getByText("Unfiled coat")).toBeTruthy();
  expect(unfiled.getByText("No reason recorded")).toBeTruthy();
});

test("the empty rejected view reads Nothing has been rejected and returns to the Library", async () => {
  const user = userEvent.setup();

  await renderLibraryScreen(database);
  await showRejectedDesigns();

  expect(screen.getByText("Nothing has been rejected")).toBeTruthy();
  expect(screen.getByText("Designs you reject will appear here.")).toBeTruthy();
  expect(screen.queryByText("The library is empty")).toBeNull();
  expect(screen.queryByRole("button", { name: "Create a design" })).toBeNull();

  await user.press(screen.getByRole("button", { name: "View the library" }));

  expect(screen.getByText("The library is empty")).toBeTruthy();
  expect(screen.queryByText("Nothing has been rejected")).toBeNull();
});

test("the rejected view hides the FAB and keeps the header's settings gear", async () => {
  seedStream(database);
  rejectDesign(database, "Rejected coat", "Too costly", 4000);

  await renderLibraryScreen(database);

  expect(screen.getByRole("button", { name: "Add design" })).toBeTruthy();

  await showRejectedDesigns();

  expect(screen.queryByRole("button", { name: "Add design" })).toBeNull();
  expect(screen.getByRole("button", { name: "Settings" })).toBeEnabled();
});

test("the single view shows the full reason, the decision date, and no Status pill", async () => {
  const user = userEvent.setup();
  const rejectedAt = Date.UTC(2026, 10, 12, 12);
  const reason =
    "The fabric cost too much to make at this scale, and the dye lot never matched the palette.";

  rejectDesign(database, "Rejected coat", reason, rejectedAt);

  await renderLibraryScreen(database);
  await user.press(screen.getByRole("switch", { name: "Single view" }));
  await showRejectedDesigns();

  expect(screen.getByTestId("single-view")).toBeTruthy();
  expect(screen.getByText(reason)).toBeTruthy();
  expect(screen.getByText(/Nov\s12,\s2026/)).toBeTruthy();
  expect(screen.queryByText("Rejected")).toBeNull();
});
