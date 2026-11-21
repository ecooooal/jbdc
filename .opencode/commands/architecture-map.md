---
description: Generate or refresh the visual architecture map (HTML + Mermaid), including per-feature dossiers, severity, and symptom triage
agent: build
---

Generate or refresh the visual architecture map for this repository.

**Target:** $ARGUMENTS

- Empty: write `docs/architecture-reviews/architecture-map.html`.
- Ends in `.html`: write that path instead.
- Anything else: write the default path and treat the text as a focus note.

If the target already exists, keep its visual language, anchors, and navigation. The section
order below is authoritative: add, merge, or reorder sections to match it. Update the
content in place; do not start from a blank page unless the file is missing or unusable.

## Read before writing

Do not answer from memory or from an older commit. Inspect the current tree:

- `src/app/**` — every route file and `_layout.tsx`.
- `src/features/README.md` and every `src/features/**/README.md`.
- `src/features/*/index.ts`, `react.ts`, `components/`, `lib/`.
- `src/features/database/schema.ts`, `lib/port.ts`, `lib/live-read.ts`, `react.tsx`,
  `expo.ts`, `testing.ts`.
- `src/features/**/tests/**` — every test file.
- `docs/adr/*.md`, `GLOSSARY.md`, `docs/FRONTEND_STATE.md`, `docs/EXPO-DB.md`,
  `docs/EXPO-FOLDER-STRUCTURE.md`, `CODING_STANDARDS.md`.
- `package.json`, `jest.config.js`, `app.json`.

Start with an inventory:

```sh
find src -type f | sort
find src -path '*/tests/*' -type f | sort
rg -n "declareLiveRead|export function|export type" src/features/*/index.ts src/features/*/react.ts
rg -n "declareLiveRead" src/features
rg -n "transaction|COMMIT|ROLLBACK" src/features/database src/features/designs src/features/images
rg -n "router\.(push|replace)|<Link" src/app src/features
find src -path '*/tests/*' -type f -exec rg -c "^\s*(test|it)\(" {} +
```

Read the files behind the boxes you intend to draw. A diagram is only useful if every label
maps to real code.

## Output contract

One self-contained HTML file:

- Tailwind CDN and Mermaid 11 via ESM CDN, matching
  `docs/architecture-reviews/architecture-review-*.html`.
- Sticky top navigation, responsive layout, print styles, accessible headings.
- Every diagram is a `<pre class="mermaid">` block. Mermaid renders on load.
- No build step, no local server required. Opening the file in a browser is enough.
- No screenshots or external images.

Required sections, in this order. Section 0 is a preamble; number 1-9 on the page.

0. **Quick reference** — one row per feature: feature, headline severity, first file to open,
   top pattern, public entry, link to its dossier. Count features per headline tier below the
   table. This table is the ten-second version of the page.
1. **Routes and screen flow** — cold start, `/`, New Design modal, Detail, Edit, History, back.
2. **Modules and dependency direction** — routing, `react.ts` entries, `index.ts` entries,
   `database`, adapters, `shared`; a deep-module anatomy diagram; a named-pattern table.
3. **Feature dossiers** — one per `src/features/*`, weighted by ownership (see below):
   identity, patterns, behavioural connections, tests, severity, first file to open. Open the
   section with a summary table: feature, headline tier, first file, public entry.
4. **State management** — sources of truth, ownership table, "where should this state live?"
   decision tree, and the Edit visit state machine.
5. **Read and write loops** — live-read sequence, field-write sequence, and visit-close
   sequence.
6. **Component hierarchies** — provider tree, Library, Edit, Detail, New Design, History.
7. **Data model** — ER diagram plus soft-delete, append-only History, derived `search_text`,
   and "not built yet" notes.
8. **Tests: what protects what** — the three categories, a per-feature rollup, counts, the
   full per-file table, what the shape says, and how to run them.
9. **File atlas, symptom triage, and reading path** — question → first file → next file;
   symptom → first file; a short reading path; known sharp edges.

## Feature dossiers

One dossier per folder under `src/features`. Weight each by what it owns, and keep the dossier
to that weight — do not pad a small feature.

- **Full** — owns persisted data, a write path, or app-wide wiring: `database`, `designs`,
  `history`, `images`.
- **Standard** — owns screens and reads, writes nothing new: `library`, `materials`, `taxonomy`.
- **Card** — device-local preferences only: `settings`.

Verify the weights against `src/features/README.md` and the code. If ownership moved, move the
weight with it; state the weight next to the feature name.

| Part | Full | Standard | Card |
| --- | --- | --- | --- |
| Identity: GLOSSARY term, public entries, what it owns, why it matters | yes | yes | yes |
| Patterns: file → low-level pattern → what it buys | every key file | the two or three that matter | — |
| Connections: behaviour → crossing | both directions | both directions | one line |
| Tests: suite → layer → cases → pins → why that layer | yes | yes | yes |
| Severity: failure mode → tier → consequence → recovery → detection | every plausible mode | every plausible mode | headline only |
| First file to open | per headline failure | per headline failure | one |

Every dossier opens with one sentence a newcomer can hold: what the feature does for the owner,
in GLOSSARY vocabulary, and what the owner would miss if it vanished. Importance is not
severity: a cosmetic feature can be important, a rare write path can be quiet and S1.

### Patterns, per file

Name the low-level pattern the file actually implements, not the feature's general style. Names
that recur here: deep module, ports and adapters, declarative live read, reducer,
effect-as-data, single write path, append-only event log, derived value, context as dependency
injection, form-state machine, read/write separation. Add a pattern only when the file shows
it; a plain helper needs no label. A key file is one that carries a rule, a read, a write, or a
screen. State what the pattern buys *here*, in one clause.

### Connections, described by behaviour

Do not draw an import graph here; the module section already has one. A connection exists when
a user action, an event, or a write that starts in one feature has an observable effect in
another. Use:

| When this happens (behaviour) | What happens next | Crossing |
| --- | --- | --- |

- Start from route files and public entries; follow the call, not the import.
- Name the trigger as a user action or an event. Never write "A imports B".
- Cover both directions: which screens go stale after a write, which write changes which
  record, what dies with what.
- Type-only or constant-only dependencies belong in the module section, not here.

### Tests, per feature

The per-feature view of the suites the tests section lists. Columns: suite file, layer, cases,
pins, why this layer. Use the layer definitions below unchanged. End with the gap: behaviour
this feature owns that no suite pins.

## Severity model

Every failure-mode row gets exactly one tier. Do not rename or subdivide the tiers.

- **S1 Data corruption** — persisted data is lost, wrong, or unreadable, and putting it right
  needs manual SQL or file surgery. It can be silent: screens look fine while the catalog is
  wrong. Blast radius is the owner's data across restarts and exports.
- **S2 App down** — cold start, the provider tree, or every screen fails; crash or blank.
  Stored data is intact and fixing the code recovers the app.
- **S3 Flow broken** — one flow cannot be completed or shows wrong information; other flows
  and the stored data stay correct.
- **S4 Degraded** — cosmetic, copy, ordering, labels, performance, or convenience. The owner
  can still do the work.

Rules:

- Tier the worst plausible failure the code can produce given its real call path. File
  importance is not a tier.
- Name the mechanism in the failure mode: transaction, migration, LIVE invalidation, provider,
  reducer, render, filesystem write. "Critical" with no path is not a failure mode.
- A feature's headline tier is its worst row.
- Each S1 row names its detection: the suite that would fail, or **unprotected**.
- Blast radius is concrete: which screens, flows, records, files, or History entries the owner
  loses or sees wrong. "The app" is not a blast radius.
- Speculative failures — disk death, OS bugs, network loss — are out of scope. This map
  describes this code.

Use this table shape in every dossier:

| Failure mode | Tier | What the owner sees or loses | Recovered by | Detected by |
| --- | --- | --- | --- | --- |

`Recovered by` is one of: retry, restart, fix code, manual SQL, re-export from a backup,
nothing. `Detected by` is a test file or **unprotected**.

## Symptom triage

Section 9 starts with the symptom table, the entry point for the moment something is already
wrong. Keep it visually distinct from the question-based reading atlas even when they share a
section.

| Symptom | Suspect (tier) | First file | Confirming test | Next file |
| --- | --- | --- | --- | --- |

- Symptoms are observable: "a list is stale after an edit", "opening a design crashes", "a
  change is gone after restart", "History misses a visit", "the cover shows the wrong image".
  Not "the database is broken".
- Every symptom maps to a failure mode listed in a dossier; add no new speculation.
- Order S1 symptoms first.
- If the failure mode is unprotected, say so in the confirming-test column.

## Tests section

Categorize every file under `src/features/**/tests/**` into exactly one dominant layer.
Use these definitions; do not rename them.

- **Implementation** — pins a private mechanism: a pure helper, a constant table, or a
  reducer slice that is not itself a surface. It answers "does this piece work as built?"
  A refactor behind the same outcome may legitimately break it. No I/O, no render.
- **Behavioral** — pins an outcome a caller or owner can observe through a public or surface
  entry: a reducer scenario, a record write, a diff, a query. It answers "does the domain
  still behave?" It may use the real temp database but does not render.
- **Integration** — pins two or more real layers meeting: a rendered screen with
  `DatabaseProvider`, the live subscription and SQLite; or migrations with the driver,
  filesystem, seed, and schema. It answers "is the wiring still connected?"

Classification rules:

- Classify by what the test protects, not by extension. A `.test.tsx` that drives a reducer is
  not Integration. A `.test.ts` that renders nothing but opens SQLite is not Implementation.
- One file gets one dominant layer. If a file genuinely mixes layers, name its sub-suites in
  the "Pins" column and pick the layer that owns most cases.
- Count cases with `^\s*(test|it)\(`. Report cases and file counts per layer and the total.
- Include every test file in the table. Columns: file, layer, cases, pins, real DB, renders.
- Add a per-feature rollup before the per-file table: feature, files, cases per layer, what
  its suites protect, and the gap. The dossier tables give the detail; this rollup gives the
  coverage shape by feature.
- State the commit in the header and note that counts are a snapshot.
- Say that domain suites use a real temporary SQLite file, never a mocked port, and that a
  rule is tested on the reducer or the screen, never both.
- Include the run commands: `pnpm test`, `pnpm test -- src/features/<feature>`, `pnpm check`.

## Diagram rules

- Use only valid Mermaid 11 syntax. Prefer `flowchart`, `sequenceDiagram`, `stateDiagram-v2`,
  `erDiagram`, and `pie`.
- Quote any label containing punctuation, slashes, parentheses, or `<br/>`.
- Keep one idea per diagram. If a diagram has more than about 20 nodes, split it.
- Show the current code, not an intended design. Mark unbuilt features explicitly as
  "not built yet".
- If `designs` and `history` still import each other's entries, show the cycle and label it.
- If a chart encodes severity or test layer, put the value in the label; never rely on colour
  alone.
- Do not invent statuses, tables, routes, files, or test categories.

Validate every Mermaid block before finishing. A reliable check is to extract each
`<pre class="mermaid">` body and POST it to `https://kroki.io/mermaid/svg`; expect a 2xx
response. If the network is unavailable, use `npx -y @mermaid-js/mermaid-cli` or report that
validation was skipped. Do not leave a block that has never parsed.

## Guardrails

- This is a documentation task. Do not edit source code, tests, schema, migrations, or config.
- Do not commit or push unless the user asks.
- Do not expose secrets, absolute home paths, tokens, or machine-specific values.
- Keep the page useful on a phone and in print; diagrams must scroll, not overflow the page.
- If the existing map and the code disagree, trust the code and fix the map.
- Severity must trace to a real call path. No S1 row without naming the write, transaction,
  migration, or invalidation it depends on.
- Connections are behavioural. Never "A imports B"; import direction belongs in the module
  section.
- Never imply coverage. If no suite pins an S1 failure mode, write **unprotected**.
- End by reporting: output path, sections written, diagram count, test counts per layer,
  feature dossiers by weight and headline tier, any unprotected S1 failure mode, validation
  result, and any fact that needs a human decision.
