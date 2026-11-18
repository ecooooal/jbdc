# designs — the Design package

One Design's record, the fields the owner edits under two tabs, the Material
uses recorded on it, and the screens that show and edit it. Public entries are
`index.ts` and `react.ts`; everything below is private to the package.

## Where a rule lives

| Question | File |
| --- | --- |
| Which fields are editable, in what order, and their labels | `lib/fields.ts` |
| The two tab sections Edit and Detail show | `lib/sections.ts` |
| The Specification and Creative direction field lists | `lib/specification-fields.ts`, `lib/creative-direction-fields.ts` |
| Reading and writing a Design, and its Material uses | `lib/records.ts` |
| Whether a visit changed anything — the diff History stores | `history/lib/events.ts` (`recordEdit`) |
| Role labels, name limits, whitespace-to-null, Status labels | `lib/material-use-role.ts`, `lib/limits.ts`, `lib/optional-text.ts`, `lib/status.ts` |

## One reducer per surface

| Surface | Reducer |
| --- | --- |
| Edit — the visit: drafts, open row, tabs, Material use panel, close | `lib/edit-design-reducer.ts` |
| The correction editor inside Edit, as one slice of that visit | `lib/edit-material-use-reducer.ts` |
| The add-Material-use editor | `lib/add-material-use-reducer.ts` |
| New Design | `lib/new-design-form-reducer.ts` |

`use-edit-visit.ts` runs the Edit reducer's effects; `use-design-detail.ts`
is Detail's live read.

## The Material use path

`components/material-uses-section.tsx` holds the table and the one panel that
can be open, and picks between `add-material-use-form.tsx` and
`edit-material-use-form.tsx`. Both forms only render state and report gestures:
the visit holds the open editor, declares the add, correction, and removal
writes, and `lib/use-edit-visit.ts` performs them through `addMaterialUse` /
`updateMaterialUse` / `removeMaterialUse` in `lib/records.ts`. A write's outcome
folds back into the visit's record of what it stored, so a refused add leaves
its choices on screen and never reaches that record. At close the visit hands
History the row and its uses as it found them and as the writes left them;
History decides whether that is worth an Event.

## Screens and pieces

- `components/edit-design-screen.tsx`, `components/design-detail-screen.tsx` — the two screens.
- `components/new-design-form.tsx` — create: name, Category, Collection.
- `components/field-rows.tsx` — one section's read-first rows; `form-field.tsx` is a single labelled input.
- `components/taxonomy-select.tsx` — Category/Collection picker with None; `material-use-role-select.tsx` — role chips.
- `components/inline-creation-panel.tsx` — create a Category, Collection, or Material without leaving the form.
- `components/material-uses-table.tsx` — the read-only rows Detail and Edit share.
- `components/design-image-strip.tsx`, `components/design-status-badge.tsx` — the hero's image strip and Status badge.
