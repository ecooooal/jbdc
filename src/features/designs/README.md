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
| The add-Material-use editor | `lib/add-material-use-reducer.ts` |
| New Design | `lib/new-design-form-reducer.ts` |

`use-edit-visit.ts` runs the Edit reducer's effects; `use-design-detail.ts`
is Detail's live read.

## The Material use path

`components/material-uses-section.tsx` holds the table and the one panel that
can be open, and picks between `add-material-use-form.tsx` and
`edit-material-use-form.tsx`. Both forms only render the visit's panel and send
it what happened. The visit holds the open panel's draft and the stored use a
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
them; History's diff — the same rule the write path used — decides whether that
is worth an Event.

## Screens and pieces

- `components/edit-design-screen.tsx`, `components/design-detail-screen.tsx` — the two screens.
- `components/section-tabs.tsx` — Detail's plain section switcher: labels on the shared Tabs root, the active one marked by its text and border; Edit keeps its filled bar.
- `components/new-design-form.tsx` — create: name, Category, Collection.
- `components/field-rows.tsx` — one section's read-first rows; `form-field.tsx` is a single labelled input.
- `components/taxonomy-select.tsx` — Category/Collection picker with None; `material-use-role-select.tsx` — role chips.
- `components/inline-creation-panel.tsx` — create a Category, Collection, or Material without leaving the form.
- `components/material-uses-table.tsx` — the read-only rows Detail and Edit share.
- `components/material-uses-section.tsx` — Edit's Materials block: the uses table, then `Add material`, or the visit's one open add/edit panel.
- `components/design-status-badge.tsx` — a Status badge. The hero image and its journey belong to the `images` module's gallery; Detail composes `DesignGallery` above its text.
