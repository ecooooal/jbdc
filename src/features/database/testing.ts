import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LiveReadSubscribe } from './lib/live-read';
import type { Database } from './lib/port';
import { openTestDatabase } from './lib/better-sqlite3-driver';

export { openTestDatabase };

/**
 * The test adapter for the live-read seam. It is synchronous: `notify` fires
 * the listeners watching `table`, the way the app's change listener would.
 */
export function createSyncSubscribe(): {
  subscribe: LiveReadSubscribe;
  notify: (table: string) => void;
} {
  const listeners = new Set<{
    tables: ReadonlySet<string>;
    onChange: () => void;
  }>();

  return {
    subscribe(tables, onChange) {
      const listener = { tables: new Set(tables), onChange };
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    notify(table) {
      for (const listener of [...listeners]) {
        if (listener.tables.has(table)) listener.onChange();
      }
    },
  };
}

/**
 * Test-only entry to the Database port. Opens one fresh temporary database
 * file per call, migrated and seeded like the app's, and removes it on dispose.
 * Jest suites call this in `beforeAll` and `afterAll`.
 */
export function createTempDatabase(): {
  database: Database;
  /** The file on disk, so a suite can close and reopen it like a relaunch. */
  path: string;
  dispose: () => void;
} {
  const directory = mkdtempSync(join(tmpdir(), 'jbdc-'));
  const path = join(directory, 'jbdc.db');
  const database = openTestDatabase(path);

  return {
    database,
    path,
    dispose: () => {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
