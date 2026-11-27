---
name: JBDC — Fashion Design Catalog
description: The Atelier Ledger — a warm paper-and-wood design system for one designer's private design catalog.
colors:
  background: "#FFFFFF"
  surface: "#F8F6F2"
  surface-secondary: "#F2EBDD"
  sheet: "#F8F6F2"
  sheet-stacked: "#F2EBDD"
  sheet-stacked-deep: "#E9DFCB"
  foreground: "#292724"
  foreground-secondary: "#6E6A63"
  border: "#E8E5DF"
  wood: "#B38A64"
  wood-foreground: "#292724"
  selection: "#8A6642"
  selection-foreground: "#F8F6F2"
  green: "#687C68"
  green-foreground: "#FFFFFF"
  destructive: "#B94B45"
  destructive-foreground: "#FFFFFF"
  photography: "#000000"
  photography-ink: "#FFFFFF"
  destructive-on-photography: "#E27770"
  overlay: "rgba(0, 0, 0, 0.60)"
  overlay-foreground: "#FFFFFF"
  dark:
    background: "#242424"
    surface: "#303030"
    surface-secondary: "#424242"
    sheet: "#303030"
    sheet-stacked: "#383838"
    sheet-stacked-deep: "#404040"
    foreground: "#F0EEE9"
    foreground-secondary: "#B5B0A7"
    border: "#444444"
    wood: "#D1B18A"
    wood-foreground: "#292724"
    selection: "#8A6642"
    selection-foreground: "#F8F6F2"
    green: "#A4B69A"
    green-foreground: "#242424"
    destructive: "#E27770"
    destructive-foreground: "#242424"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  subtitle:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title-sm:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, -apple-system, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "DM Sans, -apple-system, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "DM Sans, -apple-system, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: "DM Sans, -apple-system, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
  mono:
    fontFamily: "DM Mono, SFMono-Regular, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  mono-sm:
    fontFamily: "DM Mono, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "48px"
  grid-gap: "12px"
  screen-margin: "24px"
components:
  button-primary:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-sm:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  button-icon:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    width: "40px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  card-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0"
  badge-confirmed:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-in-progress:
    backgroundColor: "{colors.green}"
    textColor: "{colors.green-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-rejected:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-neutral:
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  section-index:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
  section-index-edit:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "4px"
  section-index-edit-active:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
  stage-tabs:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xl}"
    padding: "2px"
  stage-tab-active:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.lg}"
    padding: "4px 0"
  notes-button:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.overlay-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 12px"
  fab:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.selection-foreground}"
    rounded: "{rounded.full}"
    height: "56px"
    width: "56px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
  sheet-stacked:
    backgroundColor: "{colors.sheet-stacked}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
  sheet-stacked-deep:
    backgroundColor: "{colors.sheet-stacked-deep}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
  image-detail:
    backgroundColor: "{colors.photography}"
    textColor: "{colors.photography-ink}"
---

# Design System: JBDC — The Atelier Ledger

## Overview

**Creative North Star: "The Atelier Ledger"**

JBDC is one designer's private catalog of her own clothing designs, and the interface reads as her bound studio notebook: warm paper surfaces, a wood-toned accent for the things that matter, serif titles like specimen labels. The photography is the artwork; the chrome is the furniture around it. The feel is warm, unhurried, precise — a working archive, not a showcase.

The system is quiet archival. Depth comes from paper tonal steps and hairline borders, never from shadow play; press feedback is a tonal shift, not a bounce; motion is a short fade that honors the system Reduce Motion setting, with one small zoom-fade into a design's Detail. Color is spent on meaning only: Sanded Wood carries the marks that say chosen — the selected thumb, the Detail section rule, the radio and checkbox — and its deeper Deep Wood fills the labelled primary action, the chosen row, and the pill of finished work; Muslin Sage marks work in progress and focus; and Rejection Red marks what did not proceed. Everything else is paper and ink.

Photography has its own surfaces: the design pager's 3:4 black plate, the full-screen black image detail, and Kraft mounts where a cover is missing. The pager fits the whole image inside its stage. The paper world never floats over a photograph; the only thing allowed to blur is the single view's details panel, and it blurs only the cover beneath it. Chrome over a photograph is a translucent-black pill with white ink.

The palette is live in `src/global.css`; Cormorant Garamond 600, DM Sans 400/500/700, and DM Mono 400 are bundled at the root. `docs/design-token.md` records the core paper and accent values.

**Key Characteristics:**

- Paper tonal hierarchy — Warm Paper page, Unbleached Paper cards, Kraft Layer mounts — instead of shadows; the Design detail alone inverts the mat, Unbleached Paper underfoot and Warm Paper for its cards
- Cormorant Garamond titles over DM Sans body; DM Mono for dates, ids, measurements, constants
- Two accents with fixed meanings: Sanded Wood for the marks that carry selection, its deeper Deep Wood for selected fills, the finished-work pill, and labelled primary actions; Muslin Sage for in-development and focus; red is rejection and destruction only
- Hairline Thread Line borders everywhere; dashed frames are the signature for empty attach points and missing covers
- Photography leads on fixed stages: a 3:4 inset journey pager that fits the whole image, 4:5 Library covers, 3:4 journey thumbs
- Fades ≤ 200ms, honoring Reduce Motion; nothing bounces or loops

## Colors

A warm, low-saturation paper palette whose only saturated voices are two accents with fixed meanings, plus a black photography surface with its own white-ink chrome.

### Primary

- **Sanded Wood** (`wood`, #B38A64 light / #D1B18A dark): the single primary accent. Marks rather than labels: the selected thumb's mark, the Detail section rule, the radio and checkbox marks, and every selection mark that is not a fill. It never carries a label — text goes on Deep Wood. Rare by design — well under 10% of any screen.
- **Deep Wood** (`selection`, #8A6642 both schemes): Sanded Wood one shade deeper, the fill under selected text in light and dark alike: the selected stage tab, Edit's selected section tab, the Approved and Produced status badge, the chosen row in a choice or status sheet, the Library's FAB, and every labelled primary action. It exists because a mid-tone wood cannot carry either its own ink or a light ink at 12px, which is what a button's or a badge's label is; the deeper fill takes Unbleached Paper text at 4.8:1. It is not a second accent, and it never appears as a half-tone or a gradient.

### Secondary

- **Muslin Sage** (`green`, #687C68 light / #A4B69A dark): work in progress and active state. The In Development status badge and the focus ring; active and selected marks where wood is not already the selection. White text on it in light mode, ink in dark.

### Tertiary

- **Rejection Red** (`destructive`, #B94B45 light / #E27770 dark): rejection and destruction only — the Rejected status badge, destructive actions, armed delete rows, and error text. Never decoration.

### Neutral

- **Warm Paper** (`background`, #FFFFFF light / #242424 dark): the page behind everything. Pure white in light mode is deliberate: it is the mat the archive sits on, not a SaaS canvas. The Design detail is the one page that gives its ground to Unbleached Paper and hands the cards Warm Paper, so the record reads as a sheet laid on the mat.
- **Unbleached Paper** (`surface`, #F8F6F2 / #303030): every resting surface content sits on — cards, tiles, sheets.
- **Kraft Layer** (`surface-secondary`, #F2EBDD / #424242): the inset group one step into a surface — form sections, field tables, image placeholders, the trough under Edit's section bar.
- **Sheet Stack** (`sheet`, `sheet-stacked`, `sheet-stacked-deep`; #F8F6F2 → #F2EBDD → #E9DFCB light, #303030 → #383838 → #404040 dark): the plate a sheet is drawn on. The base is Unbleached Paper; each sheet opened above it takes one step of tone, so a stack reads as depth without a shadow.
- **Ink Thread** (`foreground`, #292724 / #F0EEE9): primary text — the ink of the ledger.
- **Faded Thread** (`foreground-secondary`, #6E6A63 / #B5B0A7): secondary text — labels, meta lines, counts, quiet descriptions, placeholders.
- **Thread Line** (`border`, #E8E5DF / #444444): hairline borders, row dividers, and input strokes.
- **Photography Black** (`photography`, #000000): the full-screen image detail and the ground of the pager plate. It exists only on the photography surface.
- **Photography Ink** (`photography-ink`, #FFFFFF): white text and glyphs on the black surface.
- **Photography Red** (`destructive-on-photography`, #E27770): Rejection Red on Photography Black. The black ground takes the lifted red — the light scheme's #B94B45 reaches only 4.2:1 there, under the readable floor — so armed deletes, failed removals, and other destruction on the black surface stay legible in both schemes.
- **Photography Overlay** (`overlay`, rgba(0, 0, 0, 0.60)): the translucent pill behind stage, position, note, and notes-count chrome over an image, and the scrim behind a floating sheet.
- **Overlay Ink** (`overlay-foreground`, #FFFFFF): text and glyphs on a photography overlay pill.

The dark scheme is the same ledger by lamplight: paper goes near-black, accents lift instead of saturate, and Ink Thread becomes warm off-white. Both schemes are first-class; every screen is designed and checked in both.

The code's shadcn-style slot names resolve to this palette:

| Code slot | Resolves to |
| --- | --- |
| `background` | Warm Paper |
| `foreground`, `card-foreground`, `popover-foreground` | Ink Thread |
| `card`, `popover` | Unbleached Paper |
| `sheet`, `sheet-stacked`, `sheet-stacked-deep` | Sheet Stack, base through two steps |
| `muted`, `accent` | Kraft Layer |
| `muted-foreground` | Faded Thread |
| `primary` | Sanded Wood |
| `primary-foreground` | Ink Thread on wood |
| `selection` | Deep Wood |
| `selection-foreground` | Unbleached Paper on Deep Wood |
| `secondary` | Muslin Sage |
| `secondary-foreground` | White (light) / ink (dark) on sage |
| `destructive` | Rejection Red |
| `destructive-foreground` | White (light) / ink (dark) on Rejection Red |
| `border`, `input` | Thread Line |
| `photography` | Photography Black |
| `photography-ink` | Photography Ink |
| `destructive-on-photography` | Photography Red |
| `overlay` | Photography Overlay |
| `overlay-foreground` | Overlay Ink |

### Named Rules

**The Ink-and-Paper Rule.** Color is state, not decoration. Wood = the marks that carry selection and the finished-work status, plus the primary action; Sage = in-progress, active, and focus; Red = rejection and destruction. No third accent hue ever enters the system; everything else is paper and ink.

**The Overlay Exception.** Over photography, persistent chrome is a translucent-black pill (`rgba(0,0,0,0.6)`) with white text; muted text runs at 60% white, hairlines at 15%, fills at 10%, and unselected strokes at 40%. A menu or sheet the Owner deliberately opens may be paper; chrome that merely sits on the image may not. The same overlay tone is the scrim behind a sheet, and a dialog dims the page on 50% black; those scrims are the only black over paper.

**The Detail Ground Rule.** The Design detail is the one page that inverts the mat: Unbleached Paper underfoot, Warm Paper for its cards and stage tabs. No other screen changes ground, and the inversion is light and dark alike.

## Typography

**Display/Title Font:** Cormorant Garamond, 600 only (with Georgia, serif)
**Body Font:** DM Sans, 400 / 500 / 700 (with system sans)
**Mono Font:** DM Mono, 400 (with system monospace)

**Character:** A serif that speaks only when something is named; a humanist sans that does all the reading work; a mono that keeps the record honest. Titles read like specimen labels in a ledger; body copy stays quiet and unstyled so the images dominate.

### Hierarchy

- **Display** (Cormorant, 600, 30px, 1.25, −0.025em): the Design's name on the single-view empty plate — the page's content when there is no cover.
- **Title** (Cormorant, 600, 24px, 1.25, −0.025em): the History and New design screen titles, a Design's name on Detail and in the single view's panel, and a Library tile's name, which tightens to 28px leading to sit closer to its Status pill.
- **Subtitle** (Cormorant, 600, 20px, 1.25, −0.025em): the Detail and Edit headers, empty-state headings, and other second-order titles.
- **Title-small** (Cormorant, 600, 18px, 1.25): sheet and dialog titles.
- **Body** (DM Sans, 400, 16px, 1.5): descriptions, recorded values, notes, prose.
- **Body-small** (DM Sans, 400, 14px, 1.4): meta lines, secondary copy, muted values.
- **Label** (DM Sans, 500, 14px, 1.4): field labels, button text, stage names, materials.
- **Label-small** (DM Sans, 500, 12px, 1.2): badges, counts, stage tabs, micro-labels.
- **Mono** (DM Mono, 400, 14px, 1.4): dates, ids, measurements, constants — anything read as data rather than prose.
- **Mono-small** (DM Mono, 400, 12px, 1.2): note dates and other micro-data.

### Named Rules

**The Two Voices Rule.** Cormorant speaks only for titles — the names of screens, designs, and dialogs. Anything the Owner reads as information is DM Sans; anything read as data is DM Mono. Cormorant body text is forbidden.

## Layout

Portrait, phone-first, native stack navigation with OS headers hidden — every screen owns its header. The Library opens on its control band and no screen title: one outlined View button names the current view at the leading edge, with the paired Search and Filter actions and the settings gear on the same row; the gear opens the Density and Dark mode switches. The View button opens the menu that carries both arrangement choices — Group by and the Rejected designs view. Detail names the Design's Collection over its Category, with the actions menu opposite; Edit and History carry a ghost back chevron and their names in the serif voice. Content lives inside safe-area insets on every screen, with a 24px side margin, 24px section rhythm, 16px list rhythm, and 48px of breathing room at the end of every scroll.

The Library grid is density-driven, not breakpoint-driven: the Owner chooses the Library's density from the settings menu (persisted) — the single view at 1, or two designs per row — and the card width derives from the current viewport, so rotation reflows card width without ever breaking the column count. There are no Library breakpoints; density is a user decision, not a width decision. Four-up is not offered: a tile that narrow cannot hold the Design's name and Status pill at the type floor.

Grouping is the Owner's second arrangement decision, made inside the View menu: the Library shows one flat stream, or sections under their Collection labels with a 12px gap between tiles and a 24px gap between sections. The same menu holds the Rejected designs view, which swaps the body for rejected Designs and their latest reasons; the control bands stay put, so the switch never moves the page. The single view walks the same ordered list, holding the top-right corner with its position pill while the panel holds the bottom. The floating action button keeps its corner at every density and is absent on the rejected view; the single view's panel leaves that corner clear, and the grid reserves 68px (56px button + 12px gap) below its last row.

Forms are plain Warm Paper: each field sits under its own label in the muted voice and is stroked with Thread Line, with no card wrapper to fill. Where records share a list, one hairline box groups them — Edit's section rows, the Material uses table, and History's entry cards — and a missing value reads `Not set` rather than vanishing. The Design detail alone stands on Unbleached Paper and puts its stage cards back on Warm Paper. The create form and Edit open as full screens, and each form ends in 48px of breathing room above the keyboard. The create form reads Category and collection as that same outlined block and opens the same taxonomy sheet from it, so a list reads identically whether a Design is being created or edited. It closes on a ghost Cancel and a primary Create design at the foot of the form, the primary disabled until the name is present.

## Elevation & Depth

Quiet archival: depth is read from tone, not shadow. The three paper steps (Warm Paper → Unbleached Paper → Kraft Layer) plus Thread Line hairlines carry all hierarchy. Shadows are a 5% black whisper — `0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)` on resting cards, buttons, inputs, and selects; the centered dialog, its alert, and the menus that open above the page lift further (`0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)`). Nothing floats to demand attention.

### Shadow Vocabulary

- **Whisper** (`0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`): resting cards, buttons, inputs, and selects — barely there.
- **Dialog** (`0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)`): the centered dialog and alert, and the dropdown menus that open above the page — the deepest point in the system.

### Named Rules

**The Flat-Archive Rule.** A surface's importance is read from its tone, never from its shadow. If a shadow exists at all it stays ≤ 5% black; glass effects, large blurs, and decorative drop shadows do not enter this system. A sheet opened above another takes one tone step deeper in light and one step lighter in dark, so the stack reads as depth in both appearances without gaining a shadow.

**The Single-View Carve-Out.** The single view's details panel is the one surface allowed to blur, and it blurs only the photography directly beneath it — a frost at intensity 50 over a 60% paper panel. No card, sheet, bar, menu, or control blurs; nothing blurred sits over a paper surface.

## Shapes

Soft specimen-jar geometry: corners ascend with size — 6px on small details, 8px on buttons and inputs, 10px on compact thumbs, tabs, and segmented controls, 14px on cards, sections, dialogs, and menus, 16px on all four corners of a floating paper sheet. Status is always a full pill (9999px). The dashed frame is the system's plate signature: an empty stage, an add-image card, a missing cover, the pager with no image, and every bottom sheet's inset frame draw it — a plate that holds nothing is a hole drawn as a hole, never decorated over. The frames that state an absence — a missing cover, an empty pager, a sheet's plate, a loading gallery — use Faded Thread (4.5:1 on Kraft) rather than the Thread Line hairline so the state is readable; the add card and a missing thumb, which invite a press rather than report a state, use the quieter Thread Line.

Photography keeps a fixed stage: 4:5 for Library covers on tiles, 3:4 for the inset pager plate and for journey thumbs, and the image detail fits the whole image inside a bounded stage. On the pager the stage is fixed and the image is fitted whole inside it — a 3:4 image fills the plate, while a taller or wider reference keeps every edge on photography black. The layout never stretches to the image.

### Named Rules

**The Pill Rule.** Pills are for state and selection — badges, counters, toggles. Rectangles are for containers and controls. A pill never carries a sentence; a rectangle never carries a status.

## Motion & Micro-interaction

Motion is quiet and decelerating: overlays fade in over 200ms and out over 150ms (Reanimated, honoring the system Reduce Motion setting); the stage row opens and closes on the shared 200ms linear layout transition; a sheet settles in 200ms; the stage tabs' Deep Wood fill travels to its tab in 180ms on a strong ease-out; press feedback is an instant tonal shift (a button darkens to 90%) or, on a Library card, a 0.98 dip with a 5% ink wash held for 120ms before the route opens — the delete control alone adds a 0.97 dip in 120ms to its tonal wash, so destruction answers in the hand. Edit's editable rows take the Kraft press wash alone on the system press state: a tonal shift on press-in, released on press-out, with no dip, no scale, and no held timer. The journey counter's stage word cross-fades with a 6px downward settle when the pager crosses into another stage. The delete control's first press replaces the trash with the confirm word in a 160ms cross-fade, the button's own width settling around it inside the quiet budget; reduced motion resolves the swap on the spot and keeps the tonal wash. Switching a section cross-fades the incoming section in 200ms and settles the switcher's mark in 150ms — Detail's wood rule, Edit's Deep Wood fill — so the change reads twice over without a slide. Nothing bounces, nothing loops, nothing moves for decoration. Every route keeps the platform's default screen transition; the Library's Detail arrival is the one override: the screen fades while its content settles from a 0.96 zoom, in 200ms, on that route only.

### Named Rules

**The Quiet Turn Rule.** Motion never announces — it only arrives and leaves, in 200ms or less. Every animation honors the system Reduce Motion setting with a crossfade or an instant cut.

## Voice & Content Strategy

- **Tone of voice:** Frank, first-person, precise — the Owner's own voice, as recorded in PRODUCT.md. No exclamation marks, no marketing warmth, no filler.
- **Capitalization:** Sentence case everywhere — titles, buttons, labels — except the Status vocabulary, whose Title Case labels (Concept, In Development, Approved, Produced, Rejected, Archived) are fixed by `GLOSSARY.md`.
- **Terminology:** `GLOSSARY.md` is canonical and binding (Design, Specification, Creative Direction, History, Status, Material use, Library, Owner, Image note). A term not in it is not a term; its avoid-lists apply (never "photo" for an Image, never "user" for the Owner).
- **Button and action labels:** Verb phrases naming the outcome — "Create a design", "Add images to Prototype", "Save note". Never "OK", "Submit", or "Done" alone.
- **Empty, loading, and error states:** One quiet line plus one action — "The library is empty" / "Designs you add will appear here."; the rejected view answers with "Nothing has been rejected" / "Designs you reject will appear here." and "View the library", and carries no Add action; a missing value reads "Not set"; History with no entries reads "Nothing has changed yet." Errors are plain and name what failed, in Rejection Red: "The images could not be added." / "The image could not be removed."
- **Destruction:** Notes and Material uses delete in two steps: the first press replaces the trash with the confirm word — "Delete" or "Remove" — as a Rejection Red button, and the second press deletes. An image asks its one question — "Remove this image and its notes?" — with Keep and Remove. A Status move that ends a Design is one red "Reject design" action, not the two-step row.
- **Decisions:** the dated detail block reads `Latest decision · Nov 28, 2026`, then `Rejected · {reason}` (or `Rejected · no reason recorded`) and `Potential improvements: …`. Its action is "Add a decision"; the sheet saves with "Save decision", disabled while both fields are empty.
- **Numbers, dates, and units:** Short dates via the system formatter ("Nov 23, 2026"); History entries add hour and minute; note dates use the mono face. Saves are never announced — no toasts, no banners; History is a screen the Owner opens.

## Components

The library is uniwind + rn-primitives with shadcn-style slot names; every color below resolves through the slot table in Colors.

### Buttons

- **Character:** Calm, workmanlike, never loud.
- **Shape:** Rounded rectangle (8px), 40px tall, 8px internal gap, icon 20px; the small size is 36px tall and the large size 44px.
- **Primary:** Deep Wood fill with Unbleached Paper text, 16px horizontal padding. Sanded Wood stays for the marks — the selected thumb, the section rule, the radio and checkbox — because a 14px label on its mid-tone sits at the edge of legibility.
- **Press:** Instant tonal shift — primary darkens to 90%. Disabled is 50% opacity.
- **Outline / Ghost / Icon:** Thread Line border on Warm Paper; ghost and icon variants are transparent until pressed, when they take the Kraft tint. Icon buttons are 40×40. Destructive is Rejection Red with white in light and ink in dark.
- **Delete:** the one destructive control: a 16px trash glyph in a 40×40 ghost icon button, Faded Thread at rest. On the first press the glyph is replaced by the confirm word — "Delete" or "Remove" — in a Rejection Red destructive button, and that same button deletes on the second press. No delete fires on the first press, and no separate cue pretends to be the button.

### Status badges

- **Character:** The system's state vocabulary, worn as a pill.
- **Shape:** Full pill, 2px 8px padding, Label-small type. Concept and Archived wear the 1px Thread Line hairline; the filled variants carry no visible border.
- **Variants:** Approved and Produced (Deep Wood + Unbleached Paper ink), In Development (Muslin Sage + white in light, ink in dark), Rejected (Rejection Red + white in light, ink in dark), Concept and Archived (no fill of their own + Ink Thread + Thread Line hairline, so they read on whatever paper holds them).

### Tabs & toggles

- **Library controls:** One outlined View button names the view the screen is on — a small muted "View" label above the current value — and opens the menu that holds both arrangement choices: Group by, a radio between the flat Design stream and Collection sections, and View, the Rejected designs checkbox, whose unchecked row draws its empty box before the first check. A 48×48 outlined gear after the paired Search and Filter opens the settings menu: Density, a switch drawn as one rectangle and two columns in one outlined shell, then Dark mode, the same shell with a sun and a moon. The side showing the current state takes the Kraft fill, each row is a 48dp target with its switch trailing, and toggling either keeps the menu open. Search and Filter share one outlined shell at 50% opacity and carry a "Coming soon" hint for a screen reader until their screens exist.
- **Section tabs:** Detail sets them as a two-column index across the sheet: the open label in Ink Thread over a 2px Sanded Wood selection rule, the other in Faded Thread over the shared Thread Line hairline. Each half is the tab's whole target, and a press takes the Kraft tint. Edit sets the same two sections on one Kraft trough with the open segment filled solid Deep Wood under Unbleached Paper ink; a press fades that fill in rather than tinting the segment. Both mark the switch by fading their wood rule or their fill in 150ms, and both switch one record in place. At an accessibility text scale of 1.5 or more the halves can no longer hold their labels, so both switchers stack one section per row; no label ever breaks inside a word.

### Cards

- **Character:** Paper mounts for photography and records.
- **Corner style:** 14px (10px for thumbs, tabs, and the pager plate).
- **Background:** Unbleached Paper with a Thread Line hairline and the whisper shadow.
- **Structure:** Cover-first tiles — a 4:5 image block on top, then the Design's name in the title face and the Status pill at the bottom; the grid leaves taxonomy to the single view.
- **Rejected tile:** the same cover-first tile, but the latest Decision's reason sits where the Status pill would, in the muted voice and clipped to two lines; the single view carries it whole. Every tile in that view is Rejected, so no Status pill is needed.
- **Press:** Whole card is the button; pressed cards dip to 0.98 and take a 5% ink wash, held 120ms before Detail opens.

### Inputs / Fields

- **Style:** Thread Line stroke on Warm Paper, 8px radius, 40px tall, DM Sans body type; the placeholder is Faded Thread, at half strength on native and at full strength on web, and the field's own label always carries the name, so a placeholder is never the only label.
- **Focus:** On web, the stroke shifts to Sage with a 3px 50% Sage ring; native fields carry no glow.
- **Disabled:** 50% opacity. Errors sit beneath the field in Rejection Red, 14px.
- **Read row:** Edit reads every field before it opens. The value sits as text with one trailing 16px pencil in Faded Thread — top-right on the name and description blocks, after the value on a Specification or Creative direction row — and a press takes the Kraft press wash on press-in, released on press-out, with no dip, no scale, and no held timer. A value that wraps keeps its pencil on its first line, and a row that cannot change carries neither pencil nor wash.
- **The blocks:** The name is an outlined block — Thread Line, the field radius, 16px padding, the name in the title voice and the pencil top-right — and opening it swaps in one Input in the same footprint; Description is the same block in Body type. Category and collection is one outlined block, 12px under the Status pill, showing the combined summary or "No category or collection", and it opens the taxonomy sheet. Each block is named 8px above it in the muted voice — "Design name", "Category and collection", "Description" — so a filled block never reads as an unlabelled field; the Category label takes 12px under the Status pill, and the Description label 16px under the Category block. Status is the exception the grammar never touches: a pill alone on its line, outside every outline and outline group, 8px under the name block, with no pencil, no press, and no destination.
- **Keeping the keyboard:** Each row's Input is mounted underneath from the start, hidden but focusable, so a press moves focus into the next row before the previous one unmounts. Moving between text rows keeps the keyboard up; opening a sheet, leaving the screen, or switching section tabs may dismiss it.

### Menus and dialogs

- **Actions menu:** The Detail's kebab opens the History and Edit routes and Change status on Unbleached Paper at 8px radius with the Dialog shadow; each row is an icon and its label, and a press takes the Kraft tint. The Library's View control opens the same menu shell for Group by and the Rejected designs view; its settings gear opens the same shell for Density and Dark mode.
- **Dialogs:** Centered on a 50% black overlay, Warm Paper content at 10px radius, 24px padding, a Thread Line border, the dialog shadow, and a ghost close X top-right; fading in 200ms, out 150ms.

### History

- **Event cards:** One History entry: Thread Line hairline box (14px radius, 16px/12px padding) with the timestamp in Faded Thread, then the recorded sections as label + lines. Read-only by construction; a correction is a new card.

### The journey rail (signature)

One rounded tab row on the detail's Unbleached Paper ground: four equal tabs, all four always visible, each carrying its stage label over a picture glyph and its image count, so an empty stage reads 0 where work is missing. The row is Warm Paper inside a Thread Line hairline at the 14px radius, and the thin divider between two tabs shows only where no fill touches it. The selected tab takes the Deep Wood fill with Unbleached Paper ink and the 10px radius in both schemes — the one fill in the system that carries light text, because a 12px label never sits on Sanded Wood's mid-tone — and the rest stay Warm Paper with the count in Faded Thread. The fill travels to its tab in 180ms on a strong ease-out and the selected label takes the cream ink with it; a press dips the tab's content 4% in 110ms and moves no fill. The active stage's row sits beneath the tabs as one horizontal line of 3:4 thumbs (10px radius; the selected one carries a 2px Sanded Wood border) ending in the dashed add-card. Pressing another stage starts its row at its oldest image; pressing the selected stage closes the row.

### The gallery pager (signature)

The Detail's visual home, on the detail's Unbleached Paper ground: a 3:4 plate inset to the page's gutters, carrying a Thread Line hairline and a 10px radius, walking every image in order and bounded at both ends. The stage is photography black when it holds an image, and the image is fitted whole on it — a 3:4 photograph fills the stage, while a screenshot, receipt or whiteboard keeps its edges on black. The journey counter sits top-left as a translucent-black pill with a 15% white hairline — the stage name in 12px semibold white, then `· 7 / 19`; the stage word cross-fades as a swipe crosses into another stage. The notes button sits at the bottom right as a matching pill with a notebook glyph and the count; it opens the notes sheet. The stage block beneath the pager is the thumbnail navigation: the active stage's row lists its images oldest first and ends in the dashed add-card. With no image selected, the stage becomes a Kraft mount with the dashed frame: `No photography yet` when the journey is empty, `No {Stage} images yet` when the chosen stage is; a journey with no images shows neither counter nor notes button.

### Paper sheets (signature)

The current image's notes open in one bottom sheet: a floating Unbleached Paper card, inset 12px from the screen's sides, under its status bar, and above its bottom safe area, its content detent following the card's measured height, with no paper card floating above the page. All four corners take the sheet's 16px radius, so the card reads as a plate laid over the screen rather than a panel joined to its edge. Every sheet is a plate: an inset dashed frame in Faded Thread, 8px inside the card's edge, and a 24px body gutter on every side, so the frame stands 16px clear of the content all the way around and reads as the plate's rim rather than a second border beside every field. Fields keep 16px between them; the title and the closing row each stand a 24px section clear of what they bracket. A sheet opened above another steps one tone deeper — Kraft, then the deep Kraft — so the stack gains depth without a shadow; the tone clamps at the deepest step. The card settles in 200ms, inside the Quiet Turn budget, and no sheet draws a drag handle. The header carries `Notes (n)` and a ghost X; Add note expands the inline composer beneath it. The composer's field is Warm Paper on the sheet with a Thread Line stroke, and focus turns the stroke Sage; the caret and selection follow the same Sage. The composer is keyboard-aware, keeps its draft through a refusal, and disables Save while the draft is empty; only the list below scrolls, so the header and composer never leave the screen. Notes read oldest first with the same two-step delete. Note dates are Mono-small in Faded Thread, note text Body in Ink Thread, and an armed note's trash becomes a Rejection Red "Delete" button.

The same wrapper carries Edit's four sheets and the choice sheets they open, the create form's taxonomy and new-entry sheets, and the status and decision sheets; none of them draws a drag handle. Each opens with its title in the serif voice and one ghost X, labelled after its sheet — "Close category and collection", "Close add material", "Close material", "Close new material", "Close new category", "Close new collection", "Close status", "Close decision". The taxonomy sheet holds Category and Collection as two select-shelled fields, the same on the create form and in Edit; a field opens its own choice sheet above it — one tone deeper, the options in one Thread Line box, the chosen row filled solid Deep Wood under Unbleached Paper ink and the row that clears the choice in Faded Thread until it is chosen — and a choice writes at once; the picker closes back to the taxonomy sheet below, which stays open. On the create form, each field carries a ghost "New category" or "New collection" action beneath it, and a new-entry sheet stacks above the taxonomy sheet as one focused name field whose Return submits, plus the Collection's optional year; Add to list completes it, and Cancel or the header's X returns to the taxonomy sheet's fields untouched; a completed create selects the new entry there. A choice sheet pins its title and X above a list that scrolls alone, so a long list never carries the way out off the top, and the title counts what the field offers, so a list clipped at the plate edge still says how much sits below it. Closing that sheet, or any sheet, takes the keyboard with it — even when the page beneath still holds the field that opened it. Add material sets Material, which opens the same choice sheet, over a ghost "New material" action, then Colour and Role — the three roles drawn as one radio row each inside a Thread Line box, the mark trailing where the choice lists carry their selected fill — and closes on a footer of ghost Cancel and primary "Add to design". Edit material writes those three fields as they change and is left by its header's X or its footer's Done, which flushes the typed colour; the Material use's two-step trash sits at the footer's leading edge, Faded Thread at rest and becoming the Rejection Red "Remove" button once armed. New material stacks above Add material as one focused name field whose Return submits; Add to list completes it, and Cancel or the header's X returns to the Add sheet's Material, Colour, and Role untouched. Opening a choice sheet dismisses the keyboard first, so a picker never slides up under keys the Colour field already raised. Every sheet's fields stay above the keyboard.

### Status and decision sheets (signature)

The Status sheet keeps the four Statuses that carry a Design onward — Concept, In Development, Approved, Produced — in one Thread Line box, each row the whole 44dp target, the current one filled Deep Wood with a check and Unbleached Paper ink. Rejected ends the Design rather than moving it on, so it sits a full section below that list in a box of its own; its row carries a chevron and opens the why fields instead of writing at once, while the rows above stay put and the current check stays with them. An open rejection form takes the Kraft tint on the Rejected row and continues into the shared Reason and Potential improvements fields, closed by the destructive "Reject design" action in the footer. Deep Wood marks where the Design is; Rejection Red marks the one way it ends.

The decision block — present when a Design has a latest decision or is Rejected without one — sits directly under Detail's identity and above the gallery: a Thread Line box (14px radius, 16px/12px padding) with `Latest decision · {date}` in Mono-small, `Rejected · {reason}` or `Rejected · no reason recorded` in Body, and `Potential improvements: …` in the muted voice. "Add a decision" belongs only to a Rejected Design; it opens a sheet prefilled from the latest decision, with the same two optional fields and "Save decision" disabled until one has text. The block reads the latest decision Event, not the current Status, so a revived Design keeps the rejection it records.

**The Separate Exit Rule.** The one Status that ends a Design never shares a box with the Statuses that move it onward. Its own row opens the why; a press meant for Produced must not land on the ending.

### The image detail (signature)

A full-screen black photography surface with white ink. The stage label sits top-left at 12px semibold 70% white, with a ghost close control opposite. The image is fit whole inside a bounded half-screen stage, inset to the screen's 24px margin, and a file that cannot be read keeps the dashed frame there with one line saying so — never a glyph. Classification is one pill per kind: the selected pill is white with black text; the rest are 40% white strokes that fill to 10% white when pressed. Notes read on the black surface with 60% white dates and 15% white hairlines. Remove waits as red text at the end of the page, under its hairline; it asks its one question in a 14px white/10 block, and a failed removal says so beside the control. Rejection Red lifts to Photography Red on this surface, because the light scheme's red does not reach the readable floor on black. No paper surface enters this screen.

### The Library's floating action

One 56px Deep Wood circle with a 24px plus glyph in the corner at every density, opening the create screen in one press. Add belongs to the active Library alone, so the rejected view carries no FAB. It keeps its corner as the density changes, and the single view's panel leaves that corner clear.

### The single view (signature)

The Library at density 1: one full-page Design at a time, on a bounded horizontal pager that opens on the first and stops at both ends. The Cover fills the page edge to edge. Over photography a details panel frosts only the image beneath it — a 60% Warm Paper layer at blur intensity 50 — carrying the Design's name in the title voice, then its Status pill beside the one taxonomy line in the mono face; the record row stops short of the FAB's corner, and the panel's bottom padding clears the home indicator. The rejected view's panel drops the Status pill — every Design here is Rejected — and puts the latest Decision's date and the taxonomy line in the record row, with the reason whole beneath; with no FAB over that view, the reason keeps the panel's full width. A Design with no Cover keeps the same page with the named plate: the dashed frame is inset on Kraft and ends above a plain paper caption with a Thread Line above it, so the plate's frame is never clipped. The position counter holds the top-right as a pill reading `3 / 12` — translucent black with white ink over photography, Kraft with Ink Thread over the plate — and it is chrome, not a control.

### Empty covers

One dashed frame for every missing Cover, drawn on a Kraft Layer mount and inset so it never touches the card or page edge. The frame uses Faded Thread for contrast. A single-view page sets the Design's name inside it in the display face and says "No photography yet"; a tile keeps the name in the card body and says "No cover" at the 12px floor. The pager's own frame says "No photography yet", or "No {Stage} images yet" for an empty chosen stage, and carries no Design name — the identity block above already names it. No glyph, no illustration.

## Do's and Don'ts

### Do:

- **Do** resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- **Do** separate with Thread Line hairlines and group with one hairline box or a Kraft mount; let tone carry the hierarchy.
- **Do** give every editable row one trailing pencil in Faded Thread and the Kraft press wash; Status carries neither.
- **Do** mark every empty attach point with the dashed frame — an empty stage, a missing cover, an add action — and use Faded Thread when the frame must be read against Kraft.
- **Do** keep Cormorant for titles only, DM Sans for information, DM Mono for dates, ids, and measurements.
- **Do** put persistent chrome over photography in translucent-black pills with white ink, and keep persistent paper chrome off the photograph.
- **Do** use fades of 200ms or less that honor the system Reduce Motion setting.
- **Do** lay out inside safe-area insets and end every scroll in 48px of breathing room.
- **Do** write empty and error states plainly, in sentence case, with one action — and name terminology from `GLOSSARY.md`.

### Don't:

- **Don't** introduce any accent hue beyond wood, sage, and red.
- **Don't** lift a card with a shadow heavier than the 5% whisper; no glass, no gradients, no blur backdrops — the single view's details panel may blur only the photography beneath it.
- **Don't** set a status in anything but a pill — never a rectangle, a banner, or a colored row.
- **Don't** fill an empty stage with illustration or icon decoration; the dashed frame is the empty state.
- **Don't** place persistent paper chrome on a photograph; use the translucent-black pill. Only a menu or sheet the Owner opens may be paper over an image.
- **Don't** announce a save with a toast or a banner; History is a screen the Owner opens.
- **Don't** animate an entrance longer than 200ms, or with a spring that bounces.
- **Don't** add a second pure white or a black fill to the paper world; Warm Paper is its one white. Black is photography's ground and the scrim behind a sheet or dialog, never a paper surface.
