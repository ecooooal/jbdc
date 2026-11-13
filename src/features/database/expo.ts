import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { createDatabase, type Database } from './lib/port';

export const DATABASE_NAME = 'jbdc.db';

/**
 * The app adapter for the Database port: expo-sqlite behind drizzle's
 * synchronous driver. Change listeners are on so later slices can subscribe to
 * live queries. Open it once, at the app root.
 */
export function openAppDatabase(): Database {
  const client = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

  client.execSync('PRAGMA journal_mode = WAL;');
  client.execSync('PRAGMA foreign_keys = ON;');

  return createDatabase(drizzle(client), () => client.closeSync());
}
