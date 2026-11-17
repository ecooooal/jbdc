# designs — the Design package

One Design's record, the fields the owner edits under two tabs, the Material
uses recorded on it, and the screens that show and edit it. Public entries are
`index.ts` and `react.ts`; everything below is private to the package.

## Where a rule lives

| Question | File |
| --- | --- |
| Which fields are editable, in what order, and their labels | `lib/fields.ts` |
| The two tab sections, and the four a History card groups by | `lib/sections.ts` |
| The Specification and Creative direction field lists | `lib/specification-fields.ts`, `lib/creative-direction-fields.ts` |
| Reading and writing a Design, and its Material uses | `lib/records.ts` |
| Whether a visit changed its Material uses | `lib/material-use-changes.ts` |
| Role labels, name limits, whitespace-to-null, Status labels | `lib/material-use-role.ts`, `lib/limits.ts`, `lib/optional-text.ts`, `lib/status.ts` |

## One reducer per surface

| Surface | Reducer |
| --- | --- |
| Edit — the visit: drafts, open row, tabs, Material use panel, close | `lib/edit-design-reducer.ts` |
| The correction editor inside Edit, as one slice of that visit | `lib/edit-material-use-reducer.ts` |
| The add-Material-use editor | `lib/add-material-use-reducer.ts` |
| New Design | `lib/new-design-form-reducer.ts` |

`use-edit-session.ts` runs the Edit reducer's effects; `use-design-detail.ts`
is Detail's live read.

## The Material use path

`components/material-uses-section.tsx` holds the table and the one panel that
can be open, and picks between `add-material-use-form.tsx` and
`edit-material-use-form.tsx`. Those dispatch into the reducers above, whose
effects call `addMaterialUse` / `updateMaterialUse` / `removeMaterialUse` in
`lib/records.ts`. The visit's one Event is recorded at close.

## Screens and pieces

- `components/edit-design-screen.tsx`, `components/design-detail-screen.tsx` — the two screens.
- `components/new-design-form.tsx` — create: name, Category, Collection.
- `components/field-rows.tsx` — one section's read-first rows; `form-field.tsx` is a single labelled input.
- `components/taxonomy-select.tsx` — Category/Collection picker with None; `material-use-role-select.tsx` — role chips.
- `components/inline-creation-panel.tsx` — create a Category, Collection, or Material without leaving the form.
- `components/material-uses-table.tsx` — the read-only rows Detail and Edit share.
- `components/design-image-strip.tsx`, `components/design-status-badge.tsx` — the hero's image strip and Status badge.
