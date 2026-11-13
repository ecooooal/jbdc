import { migrateSync, type SQLiteAsyncDatabase } from 'drizzle-orm/sqlite-core';
import migrationBundle from '../migrations/migrations.js';
import { applySeed } from './seed';

/**
 * The query handle every feature module talks to. It is drizzle's synchronous
 * SQLite surface, so no feature ever imports a driver.
 */
export type DatabaseHandle = SQLiteAsyncDatabase<'sync', unknown>;

/**
 * The Database port. It opens (in the adapter), migrates and seeds on open, and
 * hands out the query handle and transactions. Adapters are the only code that
 * knows which SQLite driver is underneath.
 */
export interface Database {
  readonly db: DatabaseHandle;
  transaction<T>(work: (tx: DatabaseHandle) => T): T;
  close(): void;
}

type MigrationMeta = Parameters<typeof migrateSync>[0][number];

function timestampFromName(name: string): number {
  const year = Number(name.slice(0, 4));
  const month = Number(name.slice(4, 6)) - 1;
  const day = Number(name.slice(6, 8));
  const hour = Number(name.slice(8, 10));
  const minute = Number(name.slice(10, 12));
  const second = Number(name.slice(12, 14));

  return Date.UTC(year, month, day, hour, minute, second);
}

/**
 * The generated SQL migrations, keyed by folder name. Sorted by name, which is
 * the timestamp drizzle-kit prefixes, so apply order is generation order.
 */
export const migrations: MigrationMeta[] = Object.entries(migrationBundle.migrations)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, sql]) => ({
    name,
    sql: sql.split('--> statement-breakpoint'),
    bps: true,
    folderMillis: timestampFromName(name),
    // The folder name is the identity drizzle's ledger records; the hash is
    // only metadata, matching drizzle's own Expo migrator.
    hash: '',
  }));

/**
 * Applies pending migrations and the seed. Both are tracked/idempotent, so this
 * is safe to run on every launch.
 */
export function migrate(db: DatabaseHandle): void {
  migrateSync(migrations, db._.session);
}

export function prepareDatabase(db: DatabaseHandle): void {
  migrate(db);
  applySeed(db);
}

export function createDatabase(db: DatabaseHandle, close: () => void): Database {
  prepareDatabase(db);

  // The driver is synchronous, so a transaction callback can never return a
  // Promise; drizzle's conditional return type is stricter than this port is.
  const transaction = db.transaction.bind(db) as unknown as Database['transaction'];

  return {
    db,
    transaction,
    close,
  };
}
