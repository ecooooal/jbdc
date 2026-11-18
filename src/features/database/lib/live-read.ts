import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Database } from './port';

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

/**
 * One live read, declared as one value: the query, the row shape it produces,
 * and every table it watches, joins included (ADR-0005). These live beside the
 * query rather than in a hook, so adding a table or a resolved name is one
 * local edit and a forgotten table is a failing check instead of a stale
 * screen. `Row` names the row shape exactly once; the hook derives the read's
 * result from it.
 */
export type LiveReadDeclaration<Row extends object> = {
  /** Runs the query against the catalog. */
  read: (database: Database) => Row;
  /** The row shape before the first read resolves — the default a screen sees. */
  empty: Row;
  /** Every table the query reads, joins included. */
  tables: readonly LiveReadTable[];
};

/** Declares a live read without changing it; the type parameter names its row. */
export function declareLiveRead<Row extends object>(
  declaration: LiveReadDeclaration<Row>
): LiveReadDeclaration<Row> {
  return declaration;
}
