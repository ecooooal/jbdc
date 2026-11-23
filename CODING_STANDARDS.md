# Coding standards

Read this before reviewing a diff. It holds judgement calls that no automated
check can make. Mechanical rules live in code, not here:

- Import boundaries and driver imports: `eslint.config.js`
- Types, lint, tests: `.github/workflows/ci.yml` and `.githooks/pre-commit`

A review reads the standards set together: `docs/FRONTEND_STATE.md`,
`docs/EXPO-FOLDER-STRUCTURE.md`, `docs/EXPO-DB.md`, `GLOSSARY.md`, and the
ADRs under `docs/adr/`. For each source the diff can contradict, name the
decision it settles and say whether it now disagrees; a source opened but not
checked is not a source.

## Commits

- **Keep unrelated fixes separate.** A broken baseline (dependency, type, lint)
  gets its own commit before the ticket work. Never fold it into the feature
  commit, and never let it hide inside a review diff.
- **One ticket, one purpose.** If a change is not needed for the ticket's
  acceptance criteria, leave it out and file it.
- **One step, one commit.** A step is the unit the ticket names. Its tests and
  the code that passes them land together; a code-only commit proves nothing.
  Never split an implementation from the test that drove it. Inside a step,
  red → green repeats as often as the work needs; those cycles do not each earn
  a commit.
- **Prose rides with what it describes.** A comment, a glossary line, or an ADR
  line lands in the commit whose behaviour it explains. If that commit is
  already pushed, it lands in the ticket's repair commit. Never amend pushed
  work, and never give a one-line prose change its own commit. A phrase you
  rename gets a row in `scripts/check-retired-terms.mjs` naming its
  replacement, so a copy left behind fails `pnpm check`, not a reviewer.
- **Generated files travel alone.** `snapshot.json`, `migration.sql`, and
  `migrations.js` share a commit with their schema change and nothing else.
  Their hundreds of lines hide every file beside them. When the step's content is
  the schema change itself, they ride in that step's commit with the schema and
  the migration test; "alone" means not beside unrelated code.
- **A rename travels alone.** Moving a file and changing its behaviour in one
  commit hides both from the reviewer.
- **A fat commit means a coarse ticket.** If the ticket does not name its steps
  up front, the steps get invented at commit time — once, at the end. Split the
  ticket, not the commit.
- **Subject names the ticket and the skill.** `<type> (#<ticket>): <reason>`,
  e.g. `implement (#14): edit a design's fields without a Save button`. A
  ticket commit is typed by the skill that produced it: `implement` for a step
  commit, `review` for a repair commit. `git log --oneline` then says whether a
  commit is feature work or review work without reading the diff. A person
  fixing a ticket by hand keeps `fix (#<ticket>)`.
  A change with no ticket names the files it touches instead of inventing a
  number, comma-separated when there are several, and keeps the content types —
  `feat`, `fix`, `refactor`, `test`, `docs`, `chore`:
  `chore (CODING_STANDARDS, AGENTS): …`.
  The Spec review reads the ticket from the subject, so a commit without one is
  unreviewable, and `.githooks/commit-msg` rejects a subject that names no
  change.

## Architecture

- **Adapters stay mechanical.** `lib/expo-database.ts` and
  `lib/better-sqlite3-driver.ts` translate calls only. Semantics live in the
  port (`lib/port.ts`); a rule that can be tested on the port does not belong in
  an adapter.
- **A write names the row it missed.** A write returns the row it stored, or
  `null` for exactly one reason: the row it targeted is missing. A write that
  can miss more than one row — a Design and one of its Material uses — says
  which in its return type. A caller cannot infer it from `null`, and a surface
  that guesses records the wrong thing.
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
- **An entry point exports only what another package imports.** `index.ts` and
  `react.ts` are the contract between features; a function or type only the
  package's own tree uses stays in `lib/`. `scripts/check-entry-exports.mjs`
  enforces it; its baseline lists the exports that predate the rule, so any
  name the check reports is one the diff added.

## Tests

- **Use the real database.** `createTempDatabase()` and temp files from
  `@/features/database/testing`; do not mock the port or the driver.
- **Test the invariant, not the implementation.** A test should fail if the
  behaviour regresses, not if a private helper is renamed.
- **Render only what a reducer cannot reach.** Decisions are tested on the
  reducer; RNTL covers gestures, what a state looks like, and subscriptions.
  Never check one rule in both layers. See `docs/FRONTEND_STATE.md`.
