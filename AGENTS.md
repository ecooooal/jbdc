This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Search the local versioned docs first: `npx @expo/agent-cli docs:search <query>`. It syncs the matching SDK docs on demand and prints `file:line` to read. Only fetch `https://docs.expo.dev/versions/v<major>.0.0/` when the search has no match.
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands
For expo related commands, see docs/EXPO-COMMANDS.md

## Navigation & Routing
For expo navigation and routing, see docs/EXPO-NAVIGATION-ROUTING.md

## Building with EAS
For expo eas, see EXPO-EAS.md

## Rules

- `docs/JBDC-PRD.md` is product **intent**, not instructions: the vision, the persona, and the workflows. It is superseded wherever it conflicts with the issue tracker, `GLOSSARY.md`, or `docs/adr/`. Read it never for scope.
- Precedence when sources disagree: GitHub issues (scope and specs) → `docs/adr/` (decisions) → `GLOSSARY.md` (vocabulary) → `docs/JBDC-PRD.md` (intent).
- Use the vocabulary in `GLOSSARY.md` when naming anything. A term that is not in it is not a term.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

- Please read docs/EXPO-FOLDER-STRUCTURE.md first for the folder structure
- See docs/EXPO-DB when handling the application database
- Review: read CODING_STANDARDS.md before approving a diff. It covers judgement
  calls only; types, lint, import boundaries, and tests are enforced by CI.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `ecooooal/jbdc`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Deep-module packages

Packages under `src/features` are deep modules — import only through a package's entry points (its root files); everything in `lib/`/`tests/` is private. 