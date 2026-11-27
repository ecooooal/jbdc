import { render, screen, userEvent, within } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { changeStatus, createDesign, getDesign } from "@/features/designs";
import { DesignDetailScreen } from "@/features/designs/react";
import { listDesignEvents } from "@/features/history";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

// The native dropdown's portal waits for a trigger measurement Jest never
// fires. Render its rows inline, inside the real root and items, so the test
// presses each row through the primitive's own root.
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
});

afterEach(() => {
  dispose();
});

async function renderDetail(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <DesignDetailScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

/** The status sheet's body, once Change status has opened it. */
function statusSheet() {
  return within(screen.getByTestId("status-sheet"));
}

async function openStatusSheet() {
  await userEvent.press(screen.getByRole("menuitem", { name: "Change status" }));
}

test("Change status opens the status sheet with the five offered Statuses", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);
  await openStatusSheet();

  expect(statusSheet().getByText("Status")).toBeTruthy();

  for (const name of ["Concept", "In Development", "Approved", "Produced", "Rejected"]) {
    expect(statusSheet().getByRole("button", { name })).toBeTruthy();
  }
});

test("the status sheet never offers Archived", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);
  await openStatusSheet();

  expect(statusSheet().queryByRole("button", { name: "Archived" })).toBeNull();
  expect(statusSheet().queryByText("Archived")).toBeNull();
});

test("the status sheet checks the Design's current Status", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  changeStatus(database, design.id, { status: "approved" }, 20);

  await renderDetail(design.id);
  await openStatusSheet();

  expect(
    statusSheet().getByRole("button", { name: "Approved" }).props.accessibilityState,
  ).toMatchObject({ selected: true });
  expect(
    statusSheet().getByRole("button", { name: "Concept" }).props.accessibilityState,
  ).toMatchObject({ selected: false });
});

test("pressing a non-rejected Status writes and closes the sheet", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Approved" }));

  expect(screen.queryByTestId("status-sheet")).toBeNull();
  expect(getDesign(database, design.id)).toMatchObject({ status: "approved" });
  expect(listDesignEvents(database, design.id)).toEqual([
    expect.objectContaining({
      kind: "status_change",
      diff: { status: { from: "concept", to: "approved" } },
    }),
  ]);
});

test("pressing the checked Status closes without a write", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Concept" }));

  expect(screen.queryByTestId("status-sheet")).toBeNull();
  expect(getDesign(database, design.id)).toEqual(design);
  expect(listDesignEvents(database, design.id)).toEqual([]);
});
