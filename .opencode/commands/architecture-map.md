---
description: Generate or refresh the visual architecture map (HTML + Mermaid), including the test overview
agent: build
---

Generate or refresh the visual architecture map for this repository.

**Target:** $ARGUMENTS

- Empty: write `docs/architecture-reviews/architecture-map.html`.
- Ends in `.html`: write that path instead.
- Anything else: write the default path and treat the text as a focus note.

If the target already exists, keep its visual language, section order, and navigation. Update
the content; do not start from a blank page unless the file is missing or unusable.

## Read before writing

Do not answer from memory or from an older commit. Inspect the current tree:

- `src/app/**` — every route file and `_layout.tsx`.
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

Required sections, in this order:

1. **Routes and screen flow** — cold start, `/`, New Design modal, Detail, Edit, History, back.
2. **Modules and dependency direction** — routing, `react.ts` entries, `index.ts` entries,
   `database`, adapters, `shared`; a deep-module anatomy diagram; a named-pattern table.
3. **State management** — sources of truth, ownership table, "where should this state live?"
   decision tree, and the Edit visit state machine.
4. **Read and write loops** — live-read sequence, field-write sequence, and visit-close
   sequence.
5. **Component hierarchies** — provider tree, Library, Edit, Detail, New Design, History.
6. **Data model** — ER diagram plus soft-delete, append-only History, derived `search_text`,
   and "not built yet" notes.
7. **Tests: what protects what** — the three categories, counts, the full per-file table,
   what the shape says, and how to run them.
8. **File atlas and reading path** — question → first file → next file; a short reading path;
   known sharp edges.

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
- End by reporting: output path, sections written, diagram count, test counts per layer,
  validation result, and any fact that needs a human decision.
