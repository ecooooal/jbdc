# Code vocabulary

The words issues use come in three kinds: domain words (GLOSSARY.md owns them), code vocabulary (this file owns them — the codebase's own words for its mechanisms and parts), and plain English. Entries are added lazily, when an issue first uses the word.

## The write pattern

The designs package's Edit visit proved this shape; the images gallery adopts it.

**fold**:
A pure function that maps one write attempt's observed ending into the feature's events. The designs precedent is `writeOutcome`; nothing else decides what an answer means.
_Note_: the glossary's _Avoid_ on "outcome" is scoped to the Decision Event; the fold's name is fine.

**attempt**:
One write try as data: the declared write beside its observed ending.

**ending**:
How an attempt concluded. An attach ends in the picker's answer or the write path's own answer for an attach; a note write ends in the write path's answer for its kind. The write path narrows its answer per change kind and never throws, so the fold adds only the picker's answer to an attach and is total.

**effects**:
What a reducer's result asks a runner to perform, carried beside the state it returns. The reducer declares; the runner performs.

**runner**:
The one hook, `useReducerRunner` at `src/shared/hooks/use-reducer-runner.ts`, behind the visit, the gallery and the image detail. It owns the state, the latest ref, the state-then-latest ordering, and the effect loop; each surface keeps only its perform body, which performs the effect and folds the ending. It carries no policy: reviewing a write's behaviour means reading the surface's perform body and the fold.

## The shared controls

**the two-step delete**:
The one destructive rule for a note or a Material use: the first press arms the target by replacing its trash with the confirm word ("Delete" or "Remove"), and the second press on that word removes it. One delete is armed at a time; closing its surface, arming another, or — in the Material sheet — any other edit disarms it. No timer, no dialog, no undo. The arming is the surface reducer's state; the control only renders it.

**the delete control**:
`src/shared/components/delete-button.tsx`: the trash the rule wears — a 16px glyph in a 40×40 ghost icon button, Faded Thread at rest. Once armed, the same button becomes the confirm word in the destructive variant, so the filled red and its foreground carry the second press on paper and on the photograph alike. The control's accessible hint promises the two presses while unarmed and names the confirming press once armed. Its first press cross-fades the trash into the word in 160ms and settles the button's width around it; a press dips to 0.97 in 120ms, the one motion this control adds to the shared tonal wash, and reduced motion resolves the swap on the spot. The notes list and the Material sheet use it.

## The sheets

**the sheet wrapper**:
`Sheet` at `src/shared/components/sheet.tsx`: the one place the app configures a modal bottom sheet — a closed detent, a floating content detent, the paper surface, and the close fact. Every sheet wears the same plate: an inset dashed frame in Faded Thread, on a tone that steps once per sheet stacked above it (`sheet`, `sheet-stacked`, `sheet-stacked-deep`). `SheetSurface` fills the card, `SheetBody` draws the inset frame and supplies its one gutter, and `useSheetDepth` tracks the stack. A body whose rows can outgrow the card asks `SheetBody` to scroll them (`scroll`): the plate and the gutter stay anchored to the card while the rows move inside them, so a form's first field and its footer stay reachable at the largest text scale; a body that does not ask hugs its rows. `SheetHeader` is the header every sheet opens with: its title in the serif voice, taking the row's free width and wrapping rather than clipping, and one ghost X labelled for its sheet. The card settles inside the Quiet Turn budget. It carries no rules and no state; the surface that owns the open state says what a close means. A drag to the closed detent, the scrim, a screen reader's dismiss, or Android's Back all report through it.

**the read row**:
`components/field-rows.tsx`, and the shape the identity rows share: the value, and one trailing 16px pencil in Faded Thread. The name, Category and collection, and Description blocks take it inside their outlines; a Specification or Creative direction row takes it after its value. The pencil is decorative, so the row keeps its own role and label, and the row takes the Kraft press wash for the 120ms press beat. Its Input is mounted underneath from the start — hidden, not absent — so a press moves focus into the next row before the previous one unmounts and the keyboard stays up. Status is the one field that is not a read row.

**the choice sheet**:
`components/choice-sheet.tsx`: the picker Edit's Category, Collection, and Material fields open. Its trigger is the select's shell — Warm Paper, a Thread Line stroke, the field's radius and height, a Faded Thread chevron — and the options open on the shared wrapper above the sheet that holds the field, one tone deeper, so a choice costs no popover. The list is one Thread Line box of rows, each at least 44pt tall with the Kraft press wash; the chosen row takes the solid Deep Wood fill under Unbleached Paper ink and the medium weight instead of a trailing check, because a check on paper was too quiet to read at a glance, and the row that clears the choice reads in Faded Thread until it is chosen. Opening dismisses the keyboard first, because a choice may sit beside a field that already holds the keys. The control keeps only whether it is open; a choice is reported as the field's fact, which the visit owns, so no component decides anything else. The create form picks Category and Collection through the same sheet, and its new-entry sheets stack above it.

**the status sheet**:
`components/status-sheet.tsx`: Detail's Status picker, opened from the kebab's `Change status` on the shared wrapper. It lists the five offered Statuses in lifecycle order — Concept, In Development, Approved, Produced, Rejected — as rows at least 44pt tall with the Kraft press wash, the Design's current Status checked and in the medium weight; Archived is absent until the filters slice gives it a home. A non-rejected row closes the sheet and writes at once; the checked row closes with no write. Rejected keeps all five rows in place, takes the Kraft tint, and expands the shared decision fields beneath the list — Reason (optional) and Potential improvements (optional), both empty — above `Reject design`, which closes the sheet and writes one `decision` Event carrying the move and the why. The current check stays visible while the form is open, so a mis-tap can still choose another row, and pressing Rejected again keeps the typed draft. Any dismiss after expanding drops the form and writes nothing, and no toast or banner announces either write.

**the decision block**:
`components/decision-block.tsx`: the Design screen's latest Decision, directly under the identity block and above the gallery. It reads `Latest decision · <date>` in the mono voice from the newest `decision` Event, then `Rejected · <reason>` or `Rejected · no reason recorded`, then `Potential improvements: <text>` when the Event recorded any. It is the Event's record, not the Design's current Status, so a revived Design keeps the dated rejection. `Add a decision` sits in the block only while the Design is Rejected; a rejected Design with no decision Event shows the no-reason line and the action with no date.

**the decision sheet**:
`components/decision-sheet.tsx`: Detail's later-decision form on the shared wrapper, opened by the block's `Add a decision`. It is titled `Add a decision`, and its Reason (optional) and Potential improvements (optional) are the status sheet's shared fields, prefilled from the latest Decision — empty when there is none — and editable. `Save decision` is disabled while both trimmed fields are empty and enabled as soon as either holds text; saving closes the sheet and writes one `decision` Event with no Status diff, and the block updates through the live read. Any dismiss drops the drafts and writes nothing.

**the taxonomy sheet**:
Edit's Category and Collection sheet on the shared wrapper: the title "Category and collection", the two fields that each open a choice sheet, and a Close labelled "Close category and collection". A choice sends `choice-chosen` and writes at once while both sheets stay open; Close sends `row-closed`. Its open state is the visit's `editing: "taxonomy"`, so no component boolean sits beside it.

**the material sheets**:
`components/material-use-sheets.tsx`: Edit's three Material sheets, rendered beside the screen on the shared wrapper. Add material holds Material — which opens a choice sheet — over a ghost "New material" action, then Colour and Role — `material-use-role-picker.tsx` draws the three roles as one radio row each inside a Thread Line box; its footer's "Add to design" sends `material-use-add-confirmed`, while Cancel and Close discard the unconfirmed use. Edit material writes each field as it changes and is left by the header's X or the footer's Done, either of which flushes an unwritten colour through the panel's `closed` fact; the notes' two-step trash at the footer's leading edge sends `remove-pressed`: the first press arms it, the second writes the removal. New material stacks above Add material: one focused name field whose Return submits through `inlineCreationResult`, and Cancel or Close returns to Add material with its choices intact. Add and Edit share the visit's one `materialUsePanel`; New material keeps the inline slice's `open`. Each header is its title in the serif voice and one ghost X, labelled "Close add material", "Close material", or "Close new material".

## The Design screen's images

The Design screen's gallery, its parts, and its writes.

**the gallery**:
The images component on the Design Detail screen: the inline pager, its chrome, the stage block, and the image detail it opens.
_Note_: the Library entry's _Avoid_ on "gallery" bars calling that screen by this word.

**the image block**:
The Design screen's region that holds the gallery, between the identity and the recorded sections.

**the journey**:
One design's images grouped by kind, in process order — inspiration, sketch, prototype, final — oldest first within each.

**the stage**:
One kind's group in the journey: the images that share a kind.
_Note_: the Status entry's _Avoid_ on "stage" is about a design's standing, not this grouping.

**the pager**:
The gallery's swipe surface: one image at a time on a full-bleed 3:4 stage, the image fitted whole on photography black, walking the journey in order and stopping at either end.

**the notes button**:
The gallery's bottom-right control, carrying the current image's note count; one press opens the notes sheet.

**the notes sheet**:
The current image's notes in one sheet: the count and Close at the top, Add note expanding the inline composer, and every note below, oldest first, with the two-step delete. Only the list scrolls; the header and composer stay above it.

**the composer**:
The notes sheet's inline composer: the draft textarea with Save and Cancel, bound to the image it was opened on. Save is disabled while the trimmed draft is empty; a stored note collapses it and leaves the sheet open, while Cancel or closing the sheet collapses it and drops the draft; changing the image drops it.

**the image detail**:
The full-screen view a tap on the image opens: one image on the black photography surface, the four kind pills that reclassify it, Remove behind its one question, and the notes list read-only with the two-step delete. No add, no pager, and no sheet opens over it.

**the stage block**:
The four stage tabs and the open stage's single image row, with the plus card at the row's end.

**the plus card**:
The stage row's add-images card. A press opens the picker and attaches what comes back to the stage the row is showing.

**the picker**:
The system image-file chooser, as a port. It answers picked files, a backed-out cancel, or a denied permission — three endings, only one worth telling the owner about.

**the live read**:
The reactive database read that re-runs whenever the tables it watches change. A write lands through it; the gallery and the notes never copy rows.

**the write path**:
The images module's one function for every image write — attach, reclassify, remove, add-note, remove-note. It answers each change kind with only the endings that change can produce — an attach cannot answer with a note's refusal — and answers a failed copy or a missing store as one ending. A failed copy, a missing store, and a store that cannot release a file never throw.

**the missing-adapters guard**:
The two images perform bodies' answer when an adapter is missing. The gallery's perform body, with no image store or picker available, cannot attempt an attach and says nothing on the stage row; the image detail's performer hands its possibly-null store to the write path, so a removal without one answers `store-failed`.

## The Library's views

The domain glossary owns Library and Rejected designs; these are the code's names for how the screen switches between and arranges them.

**the view control**:
The Library header's one control: an outlined button labelled View, showing the view the screen is on — *Library* or *Rejected designs* — that opens the menu holding both of the Library's arrangement choices. The label sits above the value, and the header keeps two stable bands at every text size — the view control above, then density beside the disabled Search/Filter pair — so switching views never moves the body. *Group by* is the radio inside it: *Design*, the flat, most recently updated first stream, or *Collection*, designs gathered under their Collection. *View* is the `Rejected designs` checkbox, whose unchecked row draws an empty box before the first check: checking it switches the same screen to the rejected, non-deleted Designs, newest first, each with its Cover, taxonomy, and latest Decision's reason and date; unchecking it, or the empty view's "View the library", returns to the active Library. Grouping persists behind its settings key; the view never does, so a launch opens the active Library.

## The Library's preferences

Device-local choices the settings store keeps. The domain glossary owns Library and Collection; these are the code's names for how the Library arranges itself.

**grouping**:
The Library's ordering choice, labelled "Group by" in the view control: *Design*, the flat, most recently updated first stream, or *Collection*, designs gathered under their Collection — the freshest Collection first, "No collection" last. Stored behind its own settings key, validated on read. Both views keep it.

**single view**:
The Library at density 1: one Design per page, its Cover filling the frame beneath a details panel, paged horizontally in the grouping's order and bounded at the first and last Design. A Design with no Cover keeps the page's shape with the dashed placeholder, and the panel blurs only photography. The same pager serves the rejected view, where the panel carries the latest Decision's date and full reason and no Status pill, the reason taking the same clearance from the FAB's corner that the Library's record row keeps. At density 2 the rejected card is one tap target whose accessible name carries the Design's name and the reason — or `No reason recorded` — so a screen reader hears the why without opening the Design.

**theme**:
The Owner's app-wide appearance choice: *light*, *dark*, or *follow-system*, the default until she chooses. Stored behind its own settings key and validated on read, so nothing stored means the system's appearance. The root applies it through the styling engine and the navigation theme, so every surface and the navigation chrome follow it.
_Note_: the palettes live in `src/global.css`; `src/shared/lib/theme.ts` derives the navigation theme from the same values. This word is the Owner's choice, not those.

## The Library's FAB

**the FAB**:
The Library's floating action button in the bottom corner, a speed-dial: collapsed it holds its actions shut; expanded it stacks add design, the theme toggle, and the disabled settings action above the corner within the quiet motion budget, clearing the single view's details panel. It owns add now that the header carries no create button, and add is hidden while the rejected view is on while the theme and settings actions stay. Any exit shuts it — a tap outside, choosing an action, leaving the route, backgrounding the app, or Android's Back — so a return never finds it open.
