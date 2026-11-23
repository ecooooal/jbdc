# JBDC

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Before any UI or design edit

Do these first, in order:

1. Load the Expo frontend skills: `expo-design-system`, `expo-animation`, `uniwind`. Load `expo-data-fetching` when the work fetches or caches data, and `expo-sqlite` when it touches the database.
2. Read `CODING_STANDARDS.md`, `docs/FRONTEND_STATE.md`, `docs/EXPO-FOLDER-STRUCTURE.md`, `GLOSSARY.md`, and the ADRs the surface touches.
3. Read the plan or ticket. For a design pass, also read `DESIGN.md` (visual decisions) and `PRODUCT.md` (voice).

`pnpm check` is the exit condition.

## Expo has changed — do not trust your training data

Before adding or changing an Expo module, an EAS config, a config plugin, or a native API: read the `expo` major in `package.json`, run `npx @expo/agent-cli docs:search <query>` (it prints `file:line`), and fetch `https://docs.expo.dev/versions/v<major>.0.0/` only when the search has no match. For anything else, start at https://docs.expo.dev/llms.txt. Never answer from memory.

## Pointers

- Commands: `docs/EXPO-COMMANDS.md`
- Navigation and routing: `docs/EXPO-NAVIGATION-ROUTING.md`
- EAS: `docs/EXPO-EAS.md`
- Feature map: `src/features/README.md`
- Database: `docs/EXPO-DB.md`
- Issue tracker: `docs/agents/issue-tracker.md`
- Triage labels: `docs/agents/triage-labels.md`
- Domain docs: `GLOSSARY.md`, `docs/adr/`

## Hard rules

- Precedence when sources disagree: GitHub issues (scope and specs) → `docs/adr/` (decisions) → `GLOSSARY.md` (vocabulary) → `docs/JBDC-PRD.md` (intent).
- Use the vocabulary in `GLOSSARY.md` when naming anything. A term that is not in it is not a term.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies.
- `docs/architecture-reviews/` holds throwaway working artifacts (architecture maps and review reports). They describe old commits and go stale. Never read them — read the code, `docs/adr/`, `GLOSSARY.md` and the other `docs/*.md` instead. Writing there is still fine.
- Git access is read-only: the GitHub token manages issues and PRs but cannot push commits. Hand branch pushes (`git push`) to the user, then open the PR with `gh` once the branch is on the remote.
- Packages under `src/features` are deep modules — import only through a package's entry points (its root files); everything in `lib/`/`tests/` is private.
- Reviewing a diff: read `CODING_STANDARDS.md` before approving. It holds the judgement calls CI cannot enforce; types, lint, interface design, import boundaries, frontend state, and tests are checked in CI.

## Design and state

Repo docs win on architecture, tests, imports, and naming; `DESIGN.md` wins on visual decisions; `PRODUCT.md` wins on voice. The skill's references never override the first.

- A design decision that changes state lives in the surface reducer (`src/features/<feature>/lib/<surface>-reducer.ts`). Route changes, app backgrounding, and leaving a screen are flush exits, not component `useState`. A component effect may subscribe and dispatch a fact; it never sets state and never decides.
- Decisions are tested on the reducer; rendered tests cover wiring only. Never cover one rule in both layers.
- Resolve every colour, type, spacing, and radius through `DESIGN.md` / `src/global.css`; no hardcoded values.
- If the design needs a new rule, stop and file a ticket; do not smuggle it into the diff.
