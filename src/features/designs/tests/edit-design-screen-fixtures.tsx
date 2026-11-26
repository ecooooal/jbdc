/**
 * Fixtures shared by Edit design's rendered suites. Call
 * `setupEditDesignFixtures()` at the top of a suite to give every test a fresh
 * migrated database; `database` and `live` are the values for the test that is
 * running, and `renderEdit` mounts the screen inside the providers it reads
 * through.
 */
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { PortalHost } from "@rn-primitives/portal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign, writeDesign } from "@/features/designs";
import { EditDesignScreen } from "@/features/designs/react";

/** The sync subscribe the provider uses; a test notifies it after a write. */
export const live = createSyncSubscribe();

/** The database this test's Edit screen reads and writes. */
export let database: ReturnType<typeof createTempDatabase>["database"];

let dispose: () => void;

/** Registers the per-test setup both Edit suites need. */
export function setupEditDesignFixtures(): void {
  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });
}

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The Edit surface in the providers it reads through. */
export async function renderEdit(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <EditDesignScreen designId={designId} />
        <PortalHost />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

/** A seeded Design with a name and description. */
export function newDesign() {
  return createDesign(database, {
    name: "Silk slip dress",
    description: "Bias cut",
  });
}

/** Seeds a recorded use through the visit's one write path. */
export function addMaterialUse(
  designId: string,
  input: { materialId: string; colour: string; role: "main" | "secondary" | "other" },
  now?: number,
) {
  writeDesign(database, designId, { uses: [{ kind: "add", input }] }, now);
}

/** Opens the read-first editor for a hero field or a section row. */
export async function openRow(label: string) {
  await userEvent.press(screen.getByRole("button", { name: label }));
}

/** Switches the section index. */
export async function openTab(name: string) {
  await userEvent.press(screen.getByRole("tab", { name }));
}

/** Lets a declared write land and reports it the way the app's listener does. */
export async function settleRead() {
  await act(async () => {});
  await act(async () => {
    live.notify("design_materials");
    live.notify("designs");
  });
}
