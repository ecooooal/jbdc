import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { LibraryScreen } from "@/features/library/react";

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
