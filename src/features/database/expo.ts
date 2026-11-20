import { drizzle } from "drizzle-orm/expo-sqlite";
import { randomUUID } from "expo-crypto";
import { addDatabaseChangeListener, openDatabaseSync } from "expo-sqlite";
import type { LiveReadSubscribe } from "./lib/live-read";
import { createDatabase, type Database } from "./lib/port";

export const DATABASE_NAME = "jbdc.db";

export function openAppDatabase(): Database {
  return openAppDatabaseWithLiveReads().database;
}

/**
 * The app adapters: the Database port on expo-sqlite and the live-read seam on
 * its change listener. One connection owns both, so the listener can ignore
 * changes from every other file. Open it once, at the app root.
 */
export function openAppDatabaseWithLiveReads(): {
  database: Database;
  subscribe: LiveReadSubscribe;
} {
  const client = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

  client.execSync("PRAGMA journal_mode = WAL;");
  client.execSync("PRAGMA foreign_keys = ON;");

  const database = createDatabase(drizzle(client), () => client.closeSync(), randomUUID);

  const subscribe: LiveReadSubscribe = (tables, onChange) => {
    const names = new Set(tables);
    const subscription = addDatabaseChangeListener(({ databaseFilePath, tableName }) => {
      if (databaseFilePath !== client.databasePath) return;
      if (!names.has(tableName)) return;

      onChange();
    });

    return () => subscription.remove();
  };

  return { database, subscribe };
}
