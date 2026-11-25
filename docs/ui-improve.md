# Plan for improving UI

## Library Screen
- Header
	- left: the grouping dropdown under its "Group by" label, and the compact density control
	- right: one paired Search / Filter control, its two segments disabled until those screens exist
- density 1 is the single column view: 1 design per screen and swipable instead of a list, in the grouping's order and bounded at the first and last
	- fills the screen with the image
	- the bottom part is blurred to provide space for the details: name, status, category, and collection; a design with no image keeps the page shape with the dashed placeholder
- density 2 is the grid; a tile carries the Cover, the Design's name, and the Status pill, while the single view carries Category and Collection. The Collection grouping gathers it under Collection labels, with "No collection" last. Four-up was dropped: a 4-up tile cannot hold the Design's name and the Status pill at the type floor.
- bottom right of the screen is the FAB, expanding upward into three actions inside the quiet motion budget
	- add design opens the create screen
	- the theme button switches dark and light, persists the choice, and the whole app — navigation chrome included — follows it, following the system until she chooses
	- settings renders disabled until the settings screen exists
	- the FAB keeps one corner at every density; the single view's details panel leaves that corner clear
- The header has no create button; the FAB owns add

## Design screen
- Header
	- fixed while the page scrolls; when its content needs more room it grows in height, never scrolls
	- left: back, then Collection in the serif voice, Category beneath it in muted text, and created/updated beneath that in mono; an absent Collection or Category is omitted, not labelled "No …"
	- right: one kebab menu holding History and Edit, each an icon with its label; the standalone History and Edit text buttons are gone
- Identity block, above the image
	- name, then the Status pill, then the description
	- dates, Category, and Collection live in the header, not here
- Image block
	- an inline, edge-to-edge pager at 3:4 with square edges and `cover`; it replaces the hero and the note block as the browsing surface, and a tap still opens the full-screen image detail
	- a swipe walks every image in journey order, across stages, and stops at both ends
	- top: the stage and its position across the journey, `Sketch · 7 / 19`; the stage word morphs when a swipe crosses into another stage
	- bottom-left: a filmstrip of every image in journey order; the active thumb lifts and names its stage, and pressing a thumb selects it
	- bottom-right: the notes button, carrying the current image's note count; it opens the notes sheet
	- no images: the dashed frame at the same size, with the counter, filmstrip, and notes button hidden
- Notes
	- a note is read-only everywhere; deletion is the two-step delete, one armed row at a time, cleared by closing the notes sheet or arming another
	- the notes sheet: the current image's notes, oldest first; Add note expands the inline composer at the top, only the list scrolls, and a stored note stays in the sheet
	- the composer is keyboard-aware, bound to the current image; changing the image drops the draft; a stored note collapses it and leaves the sheet open, while Cancel or closing the sheet collapses it and drops the draft
	- a tap on the image opens the image detail: full-screen, black photography surface, one image, the four kind pills (the only edit), Remove behind its one question, and the notes list read-only with the two-step delete; no add, no pager, no filmstrip
	- the notes sheet is a `ModalBottomSheet` (ADR-0006); no sheet opens over the image detail
- Stage block
	- four equal cards in one row, each the stage label and its image count; an empty stage reads zero
	- the active card takes the Kraft tone, a Wood border, and a short tone/scale animation; pressing a stage selects its oldest image and opens its row; pressing the active stage again closes the row
	- the active card follows the pager, so a swipe across a stage boundary moves the tone; the row keeps its open or closed state
	- the open stage's row is a single horizontal line of its images, oldest first, with the plus card at the end; the plus attaches to that stage; the row opens and closes on the shared accordion timing
	- the old rail chips and their per-stage thumbs go
- Specification and Creative direction
	- no outer border and no header fill; one hairline between rows
	- labels muted and left; values left in a second column
	- Material uses gets the same treatment; Edit keeps its tables as they are
- Motion and empty states
	- stage/count change: a cross-fade with a small vertical shift, 160–200ms
	- stage row: `LinearTransition` 200ms; active card tone/scale 150ms
	- paging uses the platform's paging; no spring, no overshoot, nothing announces
	- "Nothing recorded yet" stays as it is

# Edit design screen
- All fields should share the same keyboard, currently when keyboard is present, tapping a field re-renders the keyboard
- Name block
	- proper spacing 
	- name block is outline
	- status, category, and collection are grouped outline and switch to bottom sheet 
	- description is outline
- Specification block
	- pressing a field should have onPress feedback animation
- Material block
	- Add material should be a bottom sheet
	- Adding new material should be a bottom sheet (bottom sheets can stack)
		- pressing enter on keyboard should submit