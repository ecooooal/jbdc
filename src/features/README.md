# Features — deep modules

Every folder here is a deep module. Import a feature only through its root
entries; `lib/` and `tests/` are private.

| Feature | Public entries | Owns |
| --- | --- | --- |
| `database` | `index.ts`, `react.tsx`, `expo.ts`, `testing.ts` | Database port, schema, migrations, seed |
| `designs` | `index.ts`, `react.ts` | Design records, create and edit forms, Detail |
| `history` | `index.ts`, `react.ts` | Append-only design Events, the edit diff, History |
| `library` | `index.ts`, `react.ts` | Library query, grid, cards |
| `settings` | `index.ts`, `react.ts` | Device-local preferences |
| `taxonomy` | `index.ts`, `react.ts` | Category and Collection lists and creation |

`index.ts` is driver-free: domain functions, constants, and types. `react.ts`
holds components and hooks for route files. The anatomy and import rules live
in `docs/EXPO-FOLDER-STRUCTURE.md`.
