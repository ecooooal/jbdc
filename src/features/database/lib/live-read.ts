import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';

/** A table a live read watches. */
export type LiveReadTable = SQLiteTable;

/**
 * Registers one `onChange` for any change to `tables`, named as the driver
 * reports them. Returns the unsubscribe. The app adapter filters expo-sqlite's
 * change events; the test adapter fires them by hand.
 */
export type LiveReadSubscribe = (tables: readonly string[], onChange: () => void) => () => void;

/** The stored name a change event reports for `table`. */
export function liveReadTableName(table: LiveReadTable): string {
  return getTableConfig(table).name;
}
