# A live read declares the tables it watches

Drizzle's `useLiveQuery` re-runs only for the **from** table: it reads `query.config.table` and then compares the change event's `tableName` against that one config (`node_modules/drizzle-orm/expo-sqlite/query.js:14,27-28`), and a select's `config` carries no joins to derive from (`sqlite-core/query-builders/select.js:64-70`). Every joined read is therefore stale whenever a joined row changes: Detail's and the Library's joins over `categories` and `collections` do not refresh on a rename or a delete, while History — the one read with no join, resolving ids through a second `useTaxonomy` subscription — does, at the cost of showing a soft-deleted entry as "Unknown Category". Neither shape is right on both counts. We treat the watched tables as part of the read's interface: a read declares them, and `DatabaseProvider` supplies a `subscribe(tables, onChange)` adapter — `addDatabaseChangeListener` filtered on table name and database path in the app, synchronous in tests. The builder cannot derive the tables, so they must be stated; stating them turns a forgotten table into a failing test instead of silent staleness.

## Consequences

- `useLiveRead` exposes one `status` (`loading | ready | error`), so the four `updatedAt !== undefined` derivations and the `AND` of two loaded flags collapse.
- The seam has two adapters — the expo change listener and the test's synchronous runner — which is what makes it a seam rather than a guess.
- A read that joins a table must list it. Its test writes to the joined table and asserts the read re-runs.
- Until this lands, renaming a Category or Collection does not refresh Detail or the Library, and History refreshes but mislabels deleted entries. That is a live bug this ADR schedules, not a hypothetical.
