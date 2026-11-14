# Coding standards

Read this before reviewing a diff. It holds judgement calls that no automated
check can make. Mechanical rules live in code, not here:

- Import boundaries and driver imports: `eslint.config.js`
- Types, lint, tests: `.github/workflows/ci.yml` and `.githooks/pre-commit`

## Commits

- **Keep unrelated fixes separate.** A broken baseline (dependency, type, lint)
  gets its own commit before the ticket work. Never fold it into the feature
  commit, and never let it hide inside a review diff.
- **One ticket, one purpose.** If a change is not needed for the ticket's
  acceptance criteria, leave it out and file it.

## Architecture

- **Adapters stay mechanical.** `expo.ts` and `lib/better-sqlite3-driver.ts`
  translate calls only. Semantics live in the port (`lib/port.ts`); a rule that
  can be tested on the port does not belong in an adapter.
- **Screens hold no persistence.** `src/app/**` calls feature entry points. It
  does not build queries, import a driver, or own migration/seed logic.
- **Shipped migrations are immutable.** Never hand-edit a migration that has
  shipped. Regenerate with `pnpm db:generate`; the raw `drizzle-kit generate`
  skips the idempotency rewrite.
- **The schema is the vocabulary.** Do not invent a status, kind, or table that
  is absent from `GLOSSARY.md` and `schema.ts`. If the spec needs one, the spec
  changes first.
- **useEffect**, used sensibly.
- **State** lives in reducers.
- Client components get only what they use.

## Tests

- **Use the real database.** `createTempDatabase()` and temp files from
  `@/features/database/testing`; do not mock the port or the driver.
- **Test the invariant, not the implementation.** A test should fail if the
  behaviour regresses, not if a private helper is renamed.
