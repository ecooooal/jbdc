import { render, screen, userEvent, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { LibraryScreen } from "@/features/library/react";
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
  const user = userEvent.setup();
  const first = await renderLibrary();

  expect(screen.queryByText("Library")).toBeNull();
  expect(screen.getByRole("combobox", { name: "Grouping" })).toBeTruthy();
  expect(screen.getByText("Per design")).toBeTruthy();

  await user.press(screen.getByRole("combobox", { name: "Grouping" }));
  await user.press(screen.getByRole("option", { name: "Per collection" }));

  expect(screen.getByText("Per collection")).toBeTruthy();

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

/** Two Collections, one design in none, freshest first: Spring, Autumn, no season. */
function seedCollections() {
  const spring = createCollection(database, { name: "Spring" }, 1);
  const autumn = createCollection(database, { name: "Autumn" }, 2);

  createDesign(database, { name: "Autumn coat", collectionId: autumn.id }, 1000);
  createDesign(database, { name: "Spring skirt", collectionId: spring.id }, 2000);
  createDesign(database, { name: "No season dress" }, 3000);
  createDesign(database, { name: "Spring blouse", collectionId: spring.id }, 4000);
}

async function chooseGrouping(user: ReturnType<typeof userEvent.setup>, grouping: string) {
  await user.press(screen.getByRole("combobox", { name: "Grouping" }));
  await user.press(screen.getByRole("option", { name: grouping }));
}

test("Per collection regroups the density-2 grid under Collection headers", async () => {
  seedCollections();
  const user = userEvent.setup();

  await renderLibrary();

  // Per design is today's flat stream: the designs, no Collection headers.
  expect(screen.getByText("Spring blouse")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Spring" })).toBeNull();

  await chooseGrouping(user, "Per collection");

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
  await chooseGrouping(user, "Per collection");

  expect(
    within(screen.getByTestId("library-section-Spring")).getByText("Spring skirt"),
  ).toBeTruthy();
  expect(
    within(screen.getByTestId("library-section-no-collection")).getByText("No season dress"),
  ).toBeTruthy();
});
