import { fireEvent, screen, userEvent, within } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { changeStatus, createDesign, getDesign } from "@/features/designs";
import { listDesignEvents } from "@/features/history";
import { database, renderDetail, setupDesignDetailFixtures } from "./design-detail-fixtures";

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

setupDesignDetailFixtures();

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

test("pressing Rejected expands empty Reason and Potential improvements fields", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Rejected" }));

  expect(screen.getByTestId("status-sheet")).toBeTruthy();
  expect(statusSheet().getByLabelText("Reason")).toHaveDisplayValue("");
  expect(statusSheet().getByLabelText("Potential improvements")).toHaveDisplayValue("");
  expect(statusSheet().getByRole("button", { name: "Reject design" })).toBeTruthy();
});

test("dismissing the expanded rejection writes nothing", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Rejected" }));
  await fireEvent.changeText(statusSheet().getByLabelText("Reason"), "The fabric cost too much");
  await userEvent.press(statusSheet().getByRole("button", { name: "Close status" }));

  expect(screen.queryByTestId("status-sheet")).toBeNull();
  expect(getDesign(database, design.id)).toMatchObject({ status: "concept" });
  expect(listDesignEvents(database, design.id)).toEqual([]);
});

test("Reject design writes one decision carrying the why and closes", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Rejected" }));
  await fireEvent.changeText(statusSheet().getByLabelText("Reason"), "The fabric cost too much");
  await fireEvent.changeText(
    statusSheet().getByLabelText("Potential improvements"),
    "Try the wool blend",
  );
  await userEvent.press(statusSheet().getByRole("button", { name: "Reject design" }));

  expect(screen.queryByTestId("status-sheet")).toBeNull();
  expect(getDesign(database, design.id)).toMatchObject({ status: "rejected" });
  expect(listDesignEvents(database, design.id)).toEqual([
    expect.objectContaining({
      kind: "decision",
      reason: "The fabric cost too much",
      potentialImprovements: "Try the wool blend",
      diff: { status: { from: "concept", to: "rejected" } },
    }),
  ]);
});

test("a blank rejection writes one decision with no reason", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  await renderDetail(design.id);
  await openStatusSheet();
  await userEvent.press(statusSheet().getByRole("button", { name: "Rejected" }));
  await userEvent.press(statusSheet().getByRole("button", { name: "Reject design" }));

  expect(screen.queryByTestId("status-sheet")).toBeNull();
  expect(getDesign(database, design.id)).toMatchObject({ status: "rejected" });
  expect(listDesignEvents(database, design.id)).toEqual([
    expect.objectContaining({ kind: "decision", reason: null, potentialImprovements: null }),
  ]);
});
