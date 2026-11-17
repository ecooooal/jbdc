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
- **One green cycle, one commit.** The test and the code that passes it land
  together; a code-only commit proves nothing. Never split an implementation
  from the test that drove it.
- **Generated files travel alone.** `snapshot.json`, `migration.sql`, and
  `migrations.js` share a commit with their schema change and nothing else.
  Their hundreds of lines hide every file beside them.
- **A rename travels alone.** Moving a file and changing its behaviour in one
  commit hides both from the reviewer.
- **A fat commit means a coarse ticket.** If the ticket does not name its steps
  up front, the steps get invented at commit time — once, at the end. Split the
  ticket, not the commit.
- **Subject names the ticket.** `<type> (#<ticket>): <reason>`, e.g.
  `feat (#14): edit a design's fields without a Save button`. Types in use:
  `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. A change with no ticket
  names the files it touches instead of inventing a number, comma-separated
  when there are several: `chore (CODING_STANDARDS, AGENTS): …`.
  The Spec review reads the ticket from the subject, so a commit without one is
  unreviewable.

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
- **State** lives in reducers. See `docs/FRONTEND_STATE.md`.
- Client components get only what they use.

## Tests

- **Use the real database.** `createTempDatabase()` and temp files from
  `@/features/database/testing`; do not mock the port or the driver.
- **Test the invariant, not the implementation.** A test should fail if the
  behaviour regresses, not if a private helper is renamed.
- **Render only what a reducer cannot reach.** Decisions are tested on the
  reducer; RNTL covers gestures, what a state looks like, and subscriptions.
  Never check one rule in both layers. See `docs/FRONTEND_STATE.md`.
