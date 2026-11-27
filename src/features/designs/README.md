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
| A Status move, the one Event a rejection records, and a later decision | `lib/status-writes.ts` |
| Whether a write changes anything, and whether a visit records an Event | `lib/records.ts` (`isUnchanged`), `history/lib/events.ts` (`recordEdit`) |
| Role labels, name limits, whitespace-to-null, the one Status label rule | `lib/material-use-role.ts`, `lib/limits.ts`, `lib/optional-text.ts`, `lib/status.ts` |

## One reducer per surface

| Surface | Reducer |
| --- | --- |
| Edit — the visit: drafts, open row, tabs, Material use panel, close | `lib/edit-design-reducer.ts` |
| The add-Material-use editor | `lib/add-material-use-reducer.ts` |
| New Design | `lib/new-design-form-reducer.ts` |
| Detail — the status sheet: its open state, the checked row, the rejection draft | `lib/design-detail-reducer.ts` |

`use-edit-visit.ts` runs the Edit reducer's effects; `use-design-detail.ts`
is Detail's live read.

## The Material use path

`components/material-uses-section.tsx` holds the table whose last row opens the
Add material sheet. `components/material-use-sheets.tsx` renders the visit's one
add-or-edit panel on the shared sheet wrapper, with the New material sheet
stacked above Add material. Both forms only render the visit's panel and send it
what happened. The visit holds the open panel's draft and the stored use a
refusal restores, handles its facts directly, and declares the fields and uses
it changed in one `write-design` effect — not a choice among record functions.
`lib/use-edit-visit.ts` hands those changes to `writeDesign` in `lib/records.ts`,
the one write path: it reads the row and its uses once, decides once whether
anything changed, and stores the row, its uses, the rebuilt `search_text`, and
the moved `updatedAt` in one transaction. The write answers once — `stored` with
one outcome per declared change, `refused` with the field it refused, or
`design-missing` — and the visit settles on that one answer. Each change's
outcome folds back into the visit's record of what it stored, so a refused write
leaves the panel's choices on screen and never reaches that record. At close the
visit hands History the row and its uses as it found them and as the writes left
them; History's diff decides whether that is worth an Event. The write decides
for itself whether it needs a statement at all, by a private predicate kept
aligned with that diff, so it imports no part of History.

## Screens and pieces

- `components/edit-design-screen.tsx`, `components/design-detail-screen.tsx` — the two screens.
- `components/section-tabs.tsx` — Detail's section index: two full-width label halves on the shared Tabs root, the open one inked over a wood rule on the shared hairline; Edit keeps its filled bar.
- `components/new-design-form.tsx` — create: name, Category, Collection.
- `components/field-rows.tsx` — one section's read-first rows; `form-field.tsx` is a single labelled input.
- `components/taxonomy-select.tsx` — the create form's Category/Collection popover select with None; `choice-sheet.tsx` — Edit's trigger and its stacked choice sheet; `material-use-role-picker.tsx` — the Role choice.
- `components/inline-creation-panel.tsx` — create a Category or Collection without leaving the form.
- `components/material-uses-table.tsx` — the rows Detail and Edit share; Edit adds the pencil column and the last `Add material` row.
- `components/material-uses-section.tsx` — Edit's Materials block: the uses table, whose last row opens the Add material sheet.
- `components/material-use-sheets.tsx` — the Add material and Edit material sheets, with the New material sheet stacked above Add.
- `components/add-material-use-form.tsx`, `edit-material-use-form.tsx`, `new-material-form.tsx` — the three Material sheets' bodies.
- `components/design-status-badge.tsx` — a Status badge. The hero image and its journey belong to the `images` module's gallery; Detail composes `DesignGallery` above its text.
