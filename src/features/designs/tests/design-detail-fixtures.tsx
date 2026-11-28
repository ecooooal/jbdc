/**
 * Fixtures shared by Detail's rendered suites. Call
 * `setupDesignDetailFixtures()` at the top of a suite to give every test a
 * fresh migrated database; `database` and `live` are the values for the test
 * that is running, and `renderDetail` mounts the screen inside the providers
 * it reads through.
 */
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { DesignDetailScreen } from "@/features/designs/react";

/** The sync subscribe the provider uses; a test notifies it after a write. */
export const live = createSyncSubscribe();

/** The database this test's Detail screen reads and writes. */
export let database: ReturnType<typeof createTempDatabase>["database"];

let dispose: () => void;

/** Registers the per-test setup both Detail suites need. */
export function setupDesignDetailFixtures(): void {
  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
    jest.clearAllMocks();
  });

  afterEach(() => {
    dispose();
  });
}

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The Detail surface in the providers it reads through. */
export async function renderDetail(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <DesignDetailScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}
