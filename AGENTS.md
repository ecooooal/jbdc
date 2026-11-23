This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Search the local versioned docs first: `npx @expo/agent-cli docs:search <query>`. It syncs the matching SDK docs on demand and prints `file:line` to read. Only fetch `https://docs.expo.dev/versions/v<major>.0.0/` when the search has no match.
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands
For expo related commands, see `docs/EXPO-COMMANDS.md`

## Navigation & Routing
For expo navigation and routing, see `docs/EXPO-NAVIGATION-ROUTING.md`

## Building with EAS
For expo eas, see `docs/EXPO-EAS.md`

## Rules

- Precedence when sources disagree: GitHub issues (scope and specs) → `docs/adr/` (decisions) → `GLOSSARY.md` (vocabulary) → `docs/JBDC-PRD.md` (intent).
- Use the vocabulary in `GLOSSARY.md` when naming anything. A term that is not in it is not a term.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- `docs/architecture-reviews/` holds throwaway working artifacts (architecture maps and review reports). They describe old commits and go stale. Never read them — read the code, `docs/adr/`, `GLOSSARY.md` and the other `docs/*.md` instead. Writing there is still fine.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, managed with the `gh` CLI, which resolves this repo from the remote — run `gh` without `--repo`. See `docs/agents/issue-tracker.md`.

Git access is read-only: the GitHub token manages issues and PRs but cannot push commits. Hand branch pushes (`git push`) to the user, then open the PR with `gh` once the branch is on the remote.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Src Folder Layout
Read `docs/EXPO-FOLDER-STRUCTURE.md` before exploring `src/features`; the
feature map in `src/features/README.md` names each package's public entries.

### Database Handling
See `docs/EXPO-DB.md` when handling the application database

### Coding Standards
- Review: read `CODING_STANDARDS.md` before approving a diff. It covers judgement
  calls only; types, lint, interface design, import boundaries, frontend state,
  and tests are enforced by CI.
- Frontend state and tests: read `docs/FRONTEND_STATE.md` before adding a
  screen's state or any rendered test. Reducers own decisions; rendered tests
  are for wiring only.

### Frontend skills

Before writing any frontend or UI code, always load the Expo frontend skills:
`expo-design-system`, `expo-animation`, and `uniwind`. Load `expo-data-fetching`
when the work fetches or caches data, and `expo-sqlite` when it touches the
database. They are the stack's manuals; they override habit, not the repo rules
below.

### Design work (impeccable)

`impeccable` and any design pass are bound by this repo, not only by
PRODUCT.md/DESIGN.md. Before the skill's playbook, read `CODING_STANDARDS.md`,
`docs/FRONTEND_STATE.md`, `docs/EXPO-FOLDER-STRUCTURE.md`, `GLOSSARY.md`, and
the ADRs the surface touches.

- Precedence: this repo's docs win on architecture, tests, imports, and naming;
  `DESIGN.md` wins on visual decisions; `PRODUCT.md` wins on voice. The skill's
  references never override the first.
- Always load the Expo frontend skills above; design work is frontend work.
- A design decision that changes state lives in the surface reducer
  (`src/features/<feature>/lib/<surface>-reducer.ts`). Route changes, app
  backgrounding, and leaving a screen are flush exits, not component `useState`.
  A component effect may subscribe and dispatch a fact; it never sets state and
  never decides.
- Decisions are tested on the reducer; rendered tests cover wiring only. Never
  cover one rule in both layers.
- Resolve every colour, type, spacing, and radius through `DESIGN.md` /
  `src/global.css`; no hardcoded values.
- `pnpm check` is the exit condition. If the design needs a new rule, stop and
  file a ticket; do not smuggle it into the diff.

### Deep-module packages

Packages under `src/features` are deep modules — import only through a package's entry points (its root files); everything in `lib/`/`tests/` is private. 