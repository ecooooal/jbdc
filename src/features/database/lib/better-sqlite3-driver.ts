import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase, type Database } from './port';

/**
 * The test adapter for the Database port. It opens a real file on disk with a
 * real SQLite driver; nothing about it ships in the app bundle.
 */
export function openTestDatabase(filePath: string): Database {
  const client = new BetterSqlite3(filePath);

  client.pragma('journal_mode = WAL');
  client.pragma('foreign_keys = ON');

  return createDatabase(drizzle({ client }), () => client.close());
}
