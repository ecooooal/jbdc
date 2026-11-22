import { act, render } from "@testing-library/react-native";
import { liveReadTableName, type LiveReadDeclaration, type LiveReadTable } from "./lib/live-read";
import type { Database } from "./lib/port";
import { DatabaseProvider, useLiveRead } from "./react";
import { createSyncSubscribe } from "./testing";

/** Mounts one declared read in the app's provider seam; the hook does the rest. */
function Probe<Row extends object>({ declaration }: { declaration: LiveReadDeclaration<Row> }) {
  useLiveRead(declaration);

  return null;
}

/**
 * ADR-0005's check for one table: `table` must be declared by `declaration`,
 * and the driver's change event for it must re-run the query. `change` performs
 * the real write; the harness sends the signal itself, so a write alone proves
 * nothing. Wraps the declaration in a counted read, mounts it in a real
 * provider, then fails when the count does not move.
 */
export async function expectLiveReadReruns<Row extends object>(
  declaration: LiveReadDeclaration<Row>,
  table: LiveReadTable,
  database: Database,
  change: (database: Database) => void | Promise<void>,
): Promise<void> {
  let reads = 0;
  const counted: LiveReadDeclaration<Row> = {
    ...declaration,
    read: (database) => {
      reads += 1;

      return declaration.read(database);
    },
  };
  const live = createSyncSubscribe();
  const view = await render(
    <DatabaseProvider database={database} subscribe={live.subscribe}>
      <Probe declaration={counted} />
    </DatabaseProvider>,
  );
  const before = reads;

  try {
    await act(async () => {
      await change(database);
      live.notify(liveReadTableName(table));
    });

    expect(reads).toBeGreaterThan(before);
  } finally {
    await view.unmount();
  }
}
