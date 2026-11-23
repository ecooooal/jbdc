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
The one hook, `useReducerRunner` at `src/shared/hooks/use-reducer-runner.ts`, behind the visit, the gallery and the viewer. It owns the state, the latest ref, the state-then-latest ordering, and the effect loop; each surface keeps only its perform body, which performs the effect and folds the ending. It carries no policy: reviewing a write's behaviour means reading the surface's perform body and the fold.

## The images gallery

The Detail screen's images component, its parts, and its writes.

**the gallery**:
The images component on the Design Detail screen: the hero, the note block, the journey rail, and the viewer.
_Note_: the Library entry's _Avoid_ on "gallery" bars calling that screen by this word; this word is the component.

**the journey**:
One design's images grouped by kind, in process order — inspiration, sketch, prototype, final — oldest first within each.

**the stage**:
One kind's group in the journey: the images that share a kind.
_Note_: the Status entry's _Avoid_ on "stage" is about a design's standing, not this grouping.

**the rail**:
The journey rail: the stage row with each stage's images, and the plus card.

**the hero**:
The large showing of the current image, with its position and count in the stage and the swipe that walks the journey.

**the plus card**:
The rail's add-images card. A press opens the picker and attaches what comes back to the stage the gallery is on.

**the composer**:
The in-place note editor under the hero: the draft textarea with Save and Cancel, bound to the image it was opened on. Only a stored note closes it.

**the note block**:
The current image's commentary beneath the hero: the notes list, its expansion control, and the composer when open.

**the viewer**:
The full-screen image view, whose own reducer owns reclassification, the one remove question, and whether the last removal landed.

**the picker**:
The system image-file chooser, as a port. It answers picked files, a backed-out cancel, or a denied permission — three endings, only one worth telling the owner about.

**the live read**:
The reactive database read that re-runs whenever the tables it watches change. A write lands through it; the rail and the note block never copy rows.

**the write path**:
The images module's one function for every image write — attach, reclassify, remove, add-note, remove-note. It answers each change kind with only the endings that change can produce — an attach cannot answer with a note's refusal — and answers a failed copy or a missing store as one ending. A failed copy, a missing store, and a store that cannot release a file never throw.

**the missing-adapters guard**:
The two images perform bodies' answer when an adapter is missing. The gallery's perform body, with no image store or picker available, cannot attempt an attach and says nothing on the rail; the viewer's perform body hands its possibly-null store to the write path, so a removal without one answers `store-failed`.

## The Library's preferences

Device-local choices the settings store keeps. The domain glossary owns Library and Collection; these are the code's names for how the Library arranges itself.

**grouping**:
The Library's ordering choice, labelled "Group by" in the header: *Design*, the flat, most recently updated first stream, or *Collection*, designs gathered under their Collection — the freshest Collection first, "No collection" last. Stored behind its own settings key, validated on read.

**single view**:
The Library at density 1: one Design per page, its Cover filling the frame beneath a details panel, paged horizontally in the grouping's order and bounded at the first and last Design. A Design with no Cover keeps the page's shape with the dashed placeholder, and the panel blurs only photography.

**theme**:
The Owner's app-wide appearance choice: *light*, *dark*, or *follow-system*, the default until she chooses. Stored behind its own settings key and validated on read, so nothing stored means the system's appearance. The root applies it through the styling engine and the navigation theme, so every surface and the navigation chrome follow it.
_Note_: the palettes live in `src/global.css`; `src/shared/lib/theme.ts` derives the navigation theme from the same values. This word is the Owner's choice, not those.

## The Library's FAB

**the FAB**:
The Library's floating action button in the bottom corner, a speed-dial: collapsed it holds its actions shut; expanded it stacks add design, the theme toggle, and the disabled settings action above the corner within the quiet motion budget, clearing the single view's details panel. It owns add now that the header carries no create button. Any exit shuts it — a tap outside, choosing an action, leaving the route, backgrounding the app, or Android's Back — so a return never finds it open.
