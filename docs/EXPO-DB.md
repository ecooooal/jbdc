# Expo database

`expo-sqlite` is the driver, drizzle is the query layer, and the app only ever
talks to the **Database port** in `src/features/database`.

## The port

Feature modules import `@/features/database` for the `CatalogDatabase` query
handle, the schema tables, and the status vocabulary. They never import
`expo-sqlite` or `better-sqlite3`.

| Entry | Who imports it | What it opens |
|---|---|---|
| `@/features/database` | every feature module | nothing; types and schema only |
| `@/features/database/expo` | the provider (`react.tsx`) | expo-sqlite, synchronously |
| `@/features/database/react` | the app root and screens | provider and `useDatabase()` |
| `@/features/database/testing` | Jest suites only | better-sqlite3 on a temp file |

The port opens a connection, applies migrations, applies the seed, and hands
out the handle plus transactions:

```ts
const database = openAppDatabase();
const rows = listLibraryDesigns(database.db);
```

`openAppDatabase()` enables change listeners so later slices can subscribe to
live queries. Opening is synchronous because drizzle's expo-sqlite driver is
synchronous; that driver landed in drizzle-orm 1.0 (currently pinned to an RC),
which is why the ORM version is exact rather than a range.

## Migrations

Migrations are generated SQL, applied on every launch through drizzle's ledger
(`__drizzle_migrations`), so only migrations that have not run yet are applied.
The generated DDL is also rewritten to be idempotent (`CREATE TABLE IF NOT
EXISTS`, `CREATE INDEX IF NOT EXISTS`), so re-executing it is harmless.
`pnpm db:generate` does the rewrite for you.

Schema changes go through drizzle-kit:

```sh
pnpm db:generate    # writes src/features/database/migrations/<timestamp>_<name>/
```

Commit the generated folder, including `snapshot.json`. Never edit a migration
after it has shipped; generate a new one.

The seed lives in code (`lib/seed.ts`), runs after migrations, and inserts the
default Categories only when their `seed_key` is missing, so an owner rename
survives the next launch.

## Tests

Domain suites run the real modules against a real temporary SQLite file on a
Node test environment:

```ts
const { database, dispose } = createTempDatabase();
afterAll(dispose);
```

No mocks, no in-memory fakes. Only the two thin driver adapters are untested.
