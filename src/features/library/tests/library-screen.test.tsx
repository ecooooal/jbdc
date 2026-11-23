import { fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { LibraryScreen } from "@/features/library/react";
import type { Grouping } from "@/features/settings";
import { createCollection } from "@/features/taxonomy";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

async function renderLibrary() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <LibraryScreen />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

test("the empty view names the Library, not the Catalog", async () => {
  await renderLibrary();

  expect(screen.getByText("The library is empty")).toBeTruthy();
  expect(screen.queryByText(/catalog/i)).toBeNull();
});

test("the grouping dropdown replaces the screen title and remembers the choice", async () => {
  seedCollections();
  const first = await renderLibrary();

  expect(screen.queryByText("Library")).toBeNull();
  expect(screen.getByRole("combobox", { name: "Grouping" })).toBeTruthy();
  expect(screen.getByText("Per design")).toBeTruthy();

  await chooseGrouping("per-collection");

  expect(screen.getByText("Per collection")).toBeTruthy();

  const spring = within(screen.getByTestId("library-section-Spring"));

  expect(spring.getByRole("heading", { name: "Spring" })).toBeTruthy();
  expect(within(spring.getByTestId("library-row-0")).getAllByRole("button")).toHaveLength(2);

  // A second screen reads the stored choice, like the next launch of the app.
  await first.unmount();

  await renderLibrary();

  expect(screen.getByText("Per collection")).toBeTruthy();
});

test("the search and filter placeholder icons render disabled", async () => {
  await renderLibrary();

  expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Filter" })).toBeDisabled();
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
  const headings = screen.getAllByRole("heading");

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
  "per-design": "Per design",
  "per-collection": "Per collection",
};

/**
 * Opens the grouping choice through its primitive, which Jest cannot do: the
 * native Select positions its portal from the trigger's measure callback, and
 * the test renderer never fires it. Firing the handler is the documented seam.
 */
async function chooseGrouping(grouping: Grouping) {
  await fireEvent(screen.getByRole("combobox", { name: "Grouping" }), "valueChange", {
    value: grouping,
    label: GROUPING_LABELS[grouping],
  });
}

test("Per collection regroups the density-2 grid under Collection headers", async () => {
  seedCollections();

  await renderLibrary();

  // Per design is today's flat stream: the designs, no Collection headers.
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

test("Per collection keeps its section grids at density 4", async () => {
  seedCollections();
  const user = userEvent.setup();

  await renderLibrary();

  await user.press(screen.getByLabelText("Four designs per row"));
  await chooseGrouping("per-collection");

  const spring = within(screen.getByTestId("library-section-Spring"));
  const firstRow = within(spring.getByTestId("library-row-0"));

  expect(spring.getByRole("heading", { name: "Spring" })).toBeTruthy();
  expect(firstRow.getAllByRole("button")).toHaveLength(4);
  expect(firstRow.getByText("Spring blouse")).toBeTruthy();
  expect(firstRow.getByText("Spring scarf")).toBeTruthy();
});
