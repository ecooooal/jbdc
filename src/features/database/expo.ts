import { drizzle } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';
import { createDatabase, type Database } from './lib/port';

/**
 * Subscribes a drizzle query to expo-sqlite's change listener. It lives here so
 * only the database package names a driver.
 */
export { useLiveQuery } from 'drizzle-orm/expo-sqlite';

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

  return createDatabase(drizzle(client), () => client.closeSync(), randomUUID);
}
