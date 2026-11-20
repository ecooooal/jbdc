# Features — deep modules

Every folder here is a deep module. Import a feature only through its root
entries; `lib/` and `tests/` are private.

| Feature | Public entries | Owns |
| --- | --- | --- |
| `database` | `index.ts`, `react.tsx`, `expo.ts`, `testing.ts`, `testing-live.tsx` | Database port, schema, migrations, seed, live reads |
| `designs` | `index.ts`, `react.ts` | Design records, their editable field set and Material uses, create and edit forms, Detail |
| `history` | `index.ts`, `react.ts` | Append-only design Events, the edit diff, History |
| `images` | `index.ts`, `react.tsx`, `testing.ts` | Image kinds, the derived Cover, the journey stages and their gallery, the Image store port, the image URI provider, and the one structural write path |
| `library` | `index.ts`, `react.ts` | Library query, grid, cards |
| `materials` | `index.ts`, `react.ts` | The owner's Material list, names, and creation |
| `settings` | `index.ts`, `react.ts` | Device-local preferences |
| `taxonomy` | `index.ts`, `react.ts` | Category and Collection lists, names and labels, and creation |

`index.ts` is driver-free: domain functions, constants, and types. `react.ts`
holds components and hooks for route files. The anatomy and import rules live
in `docs/EXPO-FOLDER-STRUCTURE.md`.

`designs` is the largest package; its files and reducers are mapped in
`src/features/designs/README.md`.
