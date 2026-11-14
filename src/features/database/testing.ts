import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database } from './lib/port';
import { openTestDatabase } from './lib/better-sqlite3-driver';

export { openTestDatabase };

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
