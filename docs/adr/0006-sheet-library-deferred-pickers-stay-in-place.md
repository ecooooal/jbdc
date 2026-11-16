# The sheet library is deferred, and a picker is never a route

A sheet is wanted for editing a Material link from inside Edit, but the surface that would decide its shape — Specifications, materials, and creative direction (#7) — is not specified yet, so the library choice is deferred rather than guessed. What cannot wait is the one choice that hardens: a picker implemented as a **route**. `session-closed` is dispatched from an effect cleanup (`src/features/designs/components/edit-design-screen.tsx:62`), so a route pushed over Edit puts the visit's boundary in the navigator's hands and can record two Events where ADR-0004 says one; and returning a value from a route forces either URL params bridged back into the reducer or a module holding the form's snapshot, both of which the frontend state rules and ADR-0004 already reject. An in-place interaction has neither problem: the screen never blurs, the choice is a dispatch.

Candidates were assessed and the answer is stable even though the timing is not: TrueSheet 4.1 (native iOS sheet, Material 3 on Android, web, `detents`, `footerOptions`, stacking) for a real sheet, `@expo/ui`'s community bottom sheet as the zero-dependency fallback, and neither `@gorhom/bottom-sheet` nor `react-native-actions-sheet` — both are JavaScript-drawn and buy nothing over a native sheet here. TrueSheet's requirement set matches this repo exactly (RN 0.88, Expo SDK 58, reanimated 4.7, worklets 0.13). The reason not to adopt it yet is scope, not risk: nothing in the MVP needs a sheet until the Materials slice lands.

## Revisit trigger

Adopt a sheet when a specified surface needs a container larger than a menu and larger than an inline row — search, its own scroll, or more than roughly four fields — **and** it modifies the current visit's drafts. That decision belongs to the UI/UX pass that follows the MVP slices, when real list lengths and real editing shapes exist.

## Consequences

- Nothing is installed: no dev build, no `transformIgnorePatterns` entry, no mock registration. The tree stays clean through the MVP.
- Presentation stays as it is. `designs/new` keeps `presentation: 'modal'`, Edit and History keep pushing as cards. Each is one option on one route, so the later flip is per route rather than per call site.
- Pickers stay in place and keep the prop shape `TaxonomySelect` already has (`value`, `items`, `onSelect`, `label`). A Materials picker reuses that shape, so the UX pass replaces one file instead of every call site.
- No picker routes, therefore no param handoff and no bridge effect re-injecting a route param into a reducer.
- A sheet over Edit must not unmount it. When a sheet does land, the visit test asserts one Event across opening and closing it, not two.
- A surface that turns out to be a destination — its own visit, its own drafts — is a route with `presentation: 'formSheet'`, never a sheet. Stacking is a consequence of a surface being transient, never a reason to choose the library.
