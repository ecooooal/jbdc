---
name: JBDC — Fashion Design Catalog
description: The Atelier Ledger — a warm paper-and-wood design system for one designer's private design catalog.
colors:
  background: "#FFFFFF"
  surface: "#F8F6F2"
  surface-secondary: "#F2EBDD"
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
  overlay: "rgba(0, 0, 0, 0.60)"
  overlay-foreground: "#FFFFFF"
  dark:
    background: "#242424"
    surface: "#303030"
    surface-secondary: "#424242"
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
    backgroundColor: "{colors.wood}"
    textColor: "{colors.wood-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-sm:
    backgroundColor: "{colors.wood}"
    textColor: "{colors.wood-foreground}"
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
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0"
  card-inset:
    backgroundColor: "{colors.surface-secondary}"
    rounded: "{rounded.xl}"
    padding: "16px"
  badge-confirmed:
    backgroundColor: "{colors.wood}"
    textColor: "{colors.wood-foreground}"
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
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-stage:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 12px 4px 4px"
  chip-stage-active:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 12px 4px 4px"
  notes-button:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.overlay-foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 12px"
  fab:
    backgroundColor: "{colors.wood}"
    textColor: "{colors.wood-foreground}"
    rounded: "{rounded.full}"
    height: "56px"
    width: "56px"
  sheet:
    backgroundColor: "{colors.surface}"
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

The system is quiet archival. Depth comes from paper tonal steps and hairline borders, never from shadow play; press feedback is a tonal shift, not a bounce; motion is a short fade that honors the system Reduce Motion setting, with one small zoom-fade into a design's Detail. Color is spent on meaning only: Sanded Wood marks confirmed work and primary actions, Muslin Sage marks work in progress and active selection, Rejection Red marks what did not proceed. Everything else is paper and ink.

Photography has its own surface: a full-bleed black stage where the image runs edge to edge and every control becomes a translucent-black pill with white ink. The paper world never floats over a photograph; the only thing allowed to blur is the single view's details panel, and it blurs only the cover beneath it.

The palette is live in `src/global.css`; Cormorant Garamond 600, DM Sans 400/500/700, and DM Mono 400 are bundled at the root. `docs/design-token.md` records the core paper and accent values.

**Key Characteristics:**

- Paper tonal hierarchy — Warm Paper page, Unbleached Paper cards, Kraft Layer insets — instead of shadows; the Design detail alone inverts the mat, Unbleached Paper underfoot and Warm Paper for its cards
- Cormorant Garamond titles over DM Sans body; DM Mono for dates, ids, measurements, constants
- Two accents with fixed meanings: Sanded Wood (confirmed/primary/selection), Muslin Sage (in-development/active); red is rejection and destruction only
- Hairline Thread Line borders everywhere; dashed frames are the signature for empty attach points and missing covers
- Photography leads on fixed stages: a 3:4 edge-to-edge journey pager that fits the whole image, 4:5 Library covers, 3:4 journey thumbs
- Fades ≤ 200ms, honoring Reduce Motion; nothing bounces or loops

## Colors

A warm, low-saturation paper palette whose only saturated voices are two accents with fixed meanings, plus a black photography surface with its own white-ink chrome.

### Primary

- **Sanded Wood** (`wood`, #B38A64 light / #D1B18A dark): the single primary accent. Primary actions, the Approved and Produced status badge, the selected journey tab's and thumb's mark, and selection marks. Ink Thread text sits on it in both modes. Rare by design — well under 10% of any screen.
- **Deep Wood** (`selection`, #8A6642 both schemes): Sanded Wood one shade deeper, the fill under selected text in light and dark alike. It exists because a mid-tone wood cannot carry either its own ink or a light ink at 12px; the deeper fill takes Unbleached Paper text at 4.8:1. It is not a second accent, and it never appears as a half-tone or a gradient.

### Secondary

- **Muslin Sage** (`green`, #687C68 light / #A4B69A dark): work in progress and active state. The In Development status badge and the focus ring; active and selected marks where wood is not already the selection. White text on it in light mode, ink in dark.

### Tertiary

- **Rejection Red** (`destructive`, #B94B45 light / #E27770 dark): rejection and destruction only — the Rejected status badge, destructive actions, armed delete rows, and error text. Never decoration.

### Neutral

- **Warm Paper** (`background`, #FFFFFF light / #242424 dark): the page behind everything. Pure white in light mode is deliberate: it is the mat the archive sits on, not a SaaS canvas. The Design detail is the one page that gives its ground to Unbleached Paper and hands the cards Warm Paper, so the record reads as a sheet laid on the mat.
- **Unbleached Paper** (`surface`, #F8F6F2 / #303030): every resting surface content sits on — cards, tiles, sheets.
- **Kraft Layer** (`surface-secondary`, #F2EBDD / #424242): the inset group one step into a surface — form sections, field tables, image placeholders, the fill of a selected stage chip.
- **Ink Thread** (`foreground`, #292724 / #F0EEE9): primary text — the ink of the ledger.
- **Faded Thread** (`foreground-secondary`, #6E6A63 / #B5B0A7): secondary text — labels, meta lines, counts, quiet descriptions, placeholders.
- **Thread Line** (`border`, #E8E5DF / #444444): hairline borders, row dividers, and input strokes.
- **Photography Black** (`photography`, #000000): the full-screen image detail and the ground beneath a full-bleed image. It exists only on the photography surface.
- **Photography Ink** (`photography-ink`, #FFFFFF): white text and glyphs on the black surface.
- **Photography Overlay** (`overlay`, rgba(0, 0, 0, 0.60)): the translucent pill behind stage, position, note, and notes-count chrome over an image.
- **Overlay Ink** (`overlay-foreground`, #FFFFFF): text on a photography overlay pill.

The dark scheme is the same ledger by lamplight: paper goes near-black, accents lift instead of saturate, and Ink Thread becomes warm off-white. Both schemes are first-class; every screen is designed and checked in both.

The code's shadcn-style slot names resolve to this palette:

| Code slot | Resolves to |
| --- | --- |
| `background` | Warm Paper |
| `foreground`, `card-foreground`, `popover-foreground` | Ink Thread |
| `card`, `popover` | Unbleached Paper |
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
| `overlay` | Photography Overlay |
| `overlay-foreground` | Overlay Ink |

### Named Rules

**The Ink-and-Paper Rule.** Color is state, not decoration. Wood = confirmed, primary, and selection; Sage = in-progress, active, and focus; Red = rejection and destruction. No third accent hue ever enters the system; everything else is paper and ink.

**The Overlay Exception.** Over photography, persistent chrome is a translucent-black pill (`rgba(0,0,0,0.6)`) with white text; muted text runs at 60% white, hairlines at 15%, fills at 10%, and unselected strokes at 40%. A menu or sheet the Owner deliberately opens may be paper; chrome that merely sits on the image may not. Nowhere else does true black appear inside the paper world.

**The Detail Ground Rule.** The Design detail is the one page that inverts the mat: Unbleached Paper underfoot, Warm Paper for its cards and stage tabs. No other screen changes ground, and the inversion is light and dark alike.

## Typography

**Display/Title Font:** Cormorant Garamond, 600 only (with Georgia, serif)
**Body Font:** DM Sans, 400 / 500 / 700 (with system sans)
**Mono Font:** DM Mono, 400 (with system monospace)

**Character:** A serif that speaks only when something is named; a humanist sans that does all the reading work; a mono that keeps the record honest. Titles read like specimen labels in a ledger; body copy stays quiet and unstyled so the images dominate.

### Hierarchy

- **Display** (Cormorant, 600, 30px, 1.25, −0.025em): the Design's name on the single-view empty plate — the page's content when there is no cover.
- **Title** (Cormorant, 600, 24px, 1.25, −0.025em): screen titles, a Design's name on Detail and on a Library tile.
- **Subtitle** (Cormorant, 600, 20px, 1.25, −0.025em): the Detail header's Collection, empty-state headings, and other second-order titles.
- **Title-small** (Cormorant, 600, 18px, 1.25): sheet and dialog titles.
- **Body** (DM Sans, 400, 16px, 1.5): descriptions, recorded values, notes, prose.
- **Body-small** (DM Sans, 400, 14px, 1.4): meta lines, secondary copy, muted values.
- **Label** (DM Sans, 500, 14px, 1.4): field labels, button text, stage names, materials.
- **Label-small** (DM Sans, 500, 12px, 1.2): badges, chips, counts, micro-labels.
- **Mono** (DM Mono, 400, 14px, 1.4): dates, ids, measurements, constants — anything read as data rather than prose.
- **Mono-small** (DM Mono, 400, 12px, 1.2): note dates and other micro-data.

### Named Rules

**The Two Voices Rule.** Cormorant speaks only for titles — the names of screens, designs, and dialogs. Anything the Owner reads as information is DM Sans; anything read as data is DM Mono. Cormorant body text is forbidden.

## Layout

Portrait, phone-first, native stack navigation with OS headers hidden — every screen owns its header: serif title left, icon controls right, back is a ghost chevron. Content lives inside safe-area insets on every screen, with a 24px side margin, 24px section rhythm, 16px list rhythm, and 48px of breathing room at the end of every scroll.

The Library grid is density-driven, not breakpoint-driven: the Owner chooses the Library's density (persisted) — the single view at 1, or two designs per row — and the card width derives from the current viewport, so rotation reflows card width without ever breaking the column count. There are no Library breakpoints; density is a user decision, not a width decision. Four-up is not offered: a tile that narrow cannot hold the Design's name and Status pill at the type floor.

Grouping is the Owner's second arrangement decision: the Library shows one flat stream, or sections under their Collection labels with a 12px gap between tiles and a 24px gap between sections. The single view walks the same ordered list. The floating action button keeps its corner at every density; the single view's panel leaves that corner clear, and the grid reserves 68px (56px button + 12px gap) below its last row.

Forms and recorded sections group into inset blocks — one tonal step (Kraft Layer) or a hairline border inside the card — so a half-filled design reads as intentional rather than incomplete: empty sections simply say "Nothing recorded yet." The Design detail alone stands on Unbleached Paper and puts its stage cards back on Warm Paper. The create form and Edit open as full screens; the create form is a modal presentation, and each form ends in 48px of breathing room above the keyboard.

## Elevation & Depth

Quiet archival: depth is read from tone, not shadow. The three paper steps (Warm Paper → Unbleached Paper → Kraft Layer) plus Thread Line hairlines carry all hierarchy. Shadows are a 5% black whisper — `0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)` on resting cards, buttons, inputs, and selects; the centered dialog alone lifts further (`0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)`). Nothing floats to demand attention.

### Shadow Vocabulary

- **Whisper** (`0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`): resting cards, buttons, inputs, selects, and the FAB's paper action rows — barely there.
- **Dialog** (`0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)`): the centered dialog, the deepest point in the system.

### Named Rules

**The Flat-Archive Rule.** A surface's importance is read from its tone, never from its shadow. If a shadow exists at all it stays ≤ 5% black; glass effects, large blurs, and decorative drop shadows do not enter this system.

**The Single-View Carve-Out.** The single view's details panel is the one surface allowed to blur, and it blurs only the photography directly beneath it — a frost at intensity 50 over a 60% paper panel. No card, sheet, bar, menu, or control blurs; nothing blurred sits over a paper surface.

## Shapes

Soft specimen-jar geometry: corners ascend with size — 6px on small details, 8px on buttons and inputs, 10px on compact thumbs, tabs, and segmented controls, 14px on cards, sections, dialogs, and menus, 16px on the top corners of a paper sheet. Status is always a full pill (9999px). Dashed borders are the system's signature for emptiness: an empty stage, an add-image card, a missing cover, and the pager with no image all show the same dashed frame — a hole is drawn as a hole, never decorated over. The empty cover's dash uses Faded Thread (4.5:1 on Kraft) rather than the Thread Line hairline so the state is readable; the add card and empty stage use the quieter Thread Line.

Photography keeps a fixed stage: 4:5 for Library covers on tiles, 3:4 for the full-bleed journey pager and for journey thumbs, and the image detail fits the whole image inside a bounded stage. On the pager the stage is fixed and the image is fitted whole inside it — a 3:4 image fills the stage edge to edge, while a taller or wider reference keeps every edge on photography black. The layout never stretches to the image.

### Named Rules

**The Pill Rule.** Pills are for state and selection — badges, stage chips, counters, toggles. Rectangles are for containers and controls. A pill never carries a sentence; a rectangle never carries a status.

## Motion & Micro-interaction

Motion is quiet and decelerating: overlays fade in over 200ms and out over 150ms (Reanimated, honoring the system Reduce Motion setting); accordion-style reveals take 200ms; the stage tabs' Deep Wood fill travels to its tab in 180ms on a strong ease-out; press feedback is an instant tonal shift (a button darkens to 90%) or, on a Library card, a 0.98 dip with a 5% ink wash held for 120ms before the route opens — the press itself never animates. Edit's editable rows take the same 120ms beat as the Kraft press wash alone: a tonal shift on press-in, released on press-out, with no dip and no scale. The FAB's speed-dial rows rise and fade in inside the same 200ms budget. The journey counter's stage word cross-fades with a 6px downward settle when the pager crosses into another stage. Nothing bounces, nothing loops, nothing moves for decoration. Screen-to-screen transitions are plain fades, except the Library's Detail arrival: a 0.96 to 1 zoom inside the same 200ms fade, on that route only.

### Named Rules

**The Quiet Turn Rule.** Motion never announces — it only arrives and leaves, in 200ms or less. Every animation honors the system Reduce Motion setting with a crossfade or an instant cut.

## Voice & Content Strategy

- **Tone of voice:** Frank, first-person, precise — the Owner's own voice, as recorded in PRODUCT.md. No exclamation marks, no marketing warmth, no filler.
- **Capitalization:** Sentence case everywhere — titles, buttons, labels, statuses.
- **Terminology:** `GLOSSARY.md` is canonical and binding (Design, Specification, Creative Direction, History, Status, Material use, Library, Owner, Image note). A term not in it is not a term; its avoid-lists apply (never "photo" for an Image, never "user" for the Owner).
- **Button and action labels:** Verb phrases naming the outcome — "Create a design", "Add images to Prototype", "Save note". Never "OK", "Submit", or "Done" alone.
- **Empty, loading, and error states:** One quiet line plus one action — "The library is empty" / "Designs you add will appear here."; "Nothing recorded yet."; "Nothing has changed yet." Errors are plain and name what failed, in Rejection Red: "The images could not be added." / "The image could not be removed."
- **Destruction:** Notes delete in two steps: the first press arms the row with "Tap again to delete" in Rejection Red, the second deletes. An image asks its one question — "Remove this image and its notes?" — with Keep and Remove.
- **Numbers, dates, and units:** Short dates via the system formatter ("Nov 23, 2026"); History entries add hour and minute; note dates use the mono face. Saves are never announced — no toasts, no banners; History is a screen the Owner opens.

## Components

The library is uniwind + rn-primitives with shadcn-style slot names; every color below resolves through the slot table in Colors.

### Buttons

- **Character:** Calm, workmanlike, never loud.
- **Shape:** Rounded rectangle (8px), 40px tall, 8px internal gap, icon 20px; the small size is 36px tall and the large size 44px.
- **Primary:** Sanded Wood fill with Ink Thread text, 16px horizontal padding.
- **Press:** Instant tonal shift — primary darkens to 90%. Disabled is 50% opacity.
- **Outline / Ghost / Icon:** Thread Line border on Warm Paper; ghost and icon variants are transparent until pressed, when they take the Kraft tint. Icon buttons are 40×40. Destructive is Rejection Red with white text.

### Status badges

- **Character:** The system's state vocabulary, worn as a pill.
- **Shape:** Full pill, 2px 8px padding, Label-small type, 1px hairline border by default.
- **Variants:** Approved and Produced (Sanded Wood + ink), In Development (Muslin Sage + white in light, ink in dark), Rejected (Rejection Red + white), Concept and Archived (Warm Paper + Ink Thread + Thread Line border).

### Chips & toggles

- **Density control:** Outlined segmented group drawing the two layouts — one page, or two columns — instead of numerals; the chosen segment takes the Kraft selected state. Every segment keeps a 48dp touch target while its glyph stays 20px.
- **Section tabs:** Detail sets them as a two-column index across the sheet: the open label in Ink Thread over a 2px Sanded Wood selection rule, the other in Faded Thread over the shared Thread Line hairline. Each half is the tab's whole target, and a press takes the Kraft tint. Edit uses the filled Kraft trough with the selected segment raised on Warm Paper.

### Cards

- **Character:** Paper mounts for photography and records.
- **Corner style:** 14px (10px for compact thumbs and rows).
- **Background:** Unbleached Paper with a Thread Line hairline and the whisper shadow.
- **Structure:** Cover-first tiles — a 4:5 image block on top, then the Design's name in the title face and the Status pill at the bottom; the grid leaves taxonomy to the single view. List rows may carry a 64px cover, name, one meta line, and a trailing badge.
- **Press:** Whole card is the button; pressed cards dip to 0.98 and take a 5% ink wash, held 120ms before Detail opens.
- **Insets:** Grouped records inside a card sit on a Kraft Layer block (14px radius, 16px padding) or behind a hairline border.

### Inputs / Fields

- **Style:** Thread Line stroke on Warm Paper, 8px radius, 40px tall, DM Sans body type; the placeholder is Faded Thread at full strength so it clears 4.5:1 on both paper tones.
- **Focus:** On web, the stroke shifts to Sage with a 3px 25% Sage ring; native fields carry no glow.
- **Disabled:** 50% opacity. Errors sit beneath the field in Rejection Red, 14px.
- **Read row:** Edit reads every field before it opens. The value sits as text with one trailing 16px pencil in Faded Thread — top-right on the name and description blocks, after the value on a Specification or Creative direction row — and a press takes the Kraft press wash for the documented 120ms `press` beat, on press-in and released on press-out. The beat is reused, not re-tuned: no new duration, no dip, no scale. A value that wraps keeps its pencil on its first line, and a row that cannot change carries neither pencil nor wash.
- **The blocks:** The name is an outlined block — Thread Line, the field radius, 16px padding, the name in the title voice and the pencil top-right — and opening it swaps in one Input in the same footprint; Description is the same block in Body type. Category and collection is one outlined block, 12px under the Status pill, showing the combined summary or "No category or collection", and it opens the taxonomy sheet. The blocks sit 16px apart. Each block is named above it in the muted voice — "Design name", "Category and collection", "Description" — so a filled block never reads as an unlabelled field. Status is the exception the grammar never touches: a pill alone on its line, outside every outline and outline group, with no pencil, no press, and no destination.
- **Keeping the keyboard:** Each row's Input is mounted underneath from the start, hidden but focusable, so a press moves focus into the next row before the previous one unmounts. Moving between text rows keeps the keyboard up; opening a sheet, leaving the screen, or switching section tabs may dismiss it.

### Selects, menus, and dialogs

- **Select trigger:** The input's paper, stroke, 8px radius, and 40px height, with a 16px Faded Thread chevron. The popup is Unbleached Paper with a Thread Line hairline, 8px radius, and a 5% shadow.
- **Dialogs:** Centered on a 50% black overlay, Warm Paper content at 10px radius, 24px padding, a Thread Line border, the dialog shadow, and a ghost close X top-right; fading in 200ms, out 150ms.

### History

- **Event cards:** One History entry: Thread Line hairline box (14px radius, 16px/12px padding) with the timestamp in Faded Thread, then the recorded sections as label + lines. Read-only by construction; a correction is a new card.

### The journey rail (signature)

One rounded tab row on the detail's Unbleached Paper ground: four equal tabs, all four always visible, each carrying its stage label over a picture glyph and its image count, so an empty stage reads 0 where work is missing. The row is Warm Paper inside a Thread Line hairline at the 14px radius, and the thin divider between two tabs shows only where no fill touches it. The selected tab takes the Deep Wood fill with Unbleached Paper ink and the 10px radius in both schemes — the one fill in the system that carries light text, because a 12px label never sits on Sanded Wood's mid-tone — and the rest stay Warm Paper with the count in Faded Thread. The fill travels to its tab in 180ms on a strong ease-out and the selected label takes the cream ink with it; a press dips the tab's content 4% in 110ms and moves no fill. The active stage's row sits beneath the tabs as one horizontal line of 3:4 thumbs (10px radius; the selected one carries a 2px Sanded Wood border) ending in the dashed add-card. Pressing another stage starts its row at its oldest image; pressing the selected stage closes the row.

### The gallery pager (signature)

The Detail's visual home, on the detail's Unbleached Paper ground: a 3:4 plate inset to the page's gutters, carrying a Thread Line hairline and a 10px radius, walking every image in order and bounded at both ends. The stage is photography black when it holds an image, and the image is fitted whole on it — a 3:4 photograph fills the stage, while a screenshot, receipt or whiteboard keeps its edges on black. The journey counter sits top-left as a translucent-black pill with a 15% white hairline — the stage name in 12px semibold white, then `· 7 / 19`; the stage word cross-fades as a swipe crosses into another stage. The notes button sits at the bottom right as a matching pill with a notebook glyph and the count; it opens the notes sheet. The stage block beneath the pager is the thumbnail navigation: the active stage's row lists its images oldest first and ends in the dashed add-card. With no image selected, the stage becomes a Kraft mount with the dashed frame: `No photography yet` when the journey is empty, `No {Stage} images yet` when the chosen stage is; a journey with no images shows neither counter nor notes button.

### Paper sheets (signature)

The current image's notes open in one bottom sheet: Unbleached Paper, 16px top corners only, a content detent that follows its measured height, and no paper card floating above the page. The header carries `Notes (n)` and a ghost Close; Add note expands the inline composer beneath it. The composer's field is Warm Paper on the sheet with a Thread Line stroke, and focus turns the stroke Sage; the caret and selection follow the same Sage. The composer is keyboard-aware, keeps its draft through a refusal, and disables Save while the draft is empty; only the list below scrolls, so the header and composer never leave the screen. Notes read oldest first with the same two-step delete. Note dates are Mono-small in Faded Thread, note text Body in Ink Thread, and the armed line is 12px Rejection Red.

The same wrapper carries Edit's four sheets, and none of them draws a drag handle. Each opens with its title in the serif voice and one ghost Close whose visible text is "Close", labelled after its sheet — "Close category and collection", "Close add material", "Close material", "Close new material". The taxonomy sheet holds the two clearable selects, and a choice writes at once while the sheet stays open. Add material sets Material over a ghost "New material" action, then Colour and Role, and closes on a footer of ghost Cancel and primary "Add to design". Edit material writes those three fields as they change, and its footer is destructive "Remove material" beside a ghost Close. New material stacks above Add material as one focused name field whose Return submits; Cancel or Close returns to the Add sheet's Material, Colour, and Role untouched. Every sheet's fields stay above the keyboard.

### The image detail (signature)

A full-screen black photography surface with white ink. The stage label sits top-left at 12px semibold 70% white, with a ghost close control opposite. The image is fit whole inside a bounded half-screen stage. Classification is one pill per kind: the selected pill is white with black text; the rest are 40% white strokes that fill to 10% white when pressed. Notes read on the black surface with 60% white dates and 15% white hairlines. Remove asks its one question in a 14px white/10 block; a failed removal says so in Rejection Red beside the control. No paper surface enters this screen.

### The Library's floating action

One 56px Sanded Wood circle with a 24px glyph in the corner at every density. Opened, it stacks named paper rows above it — Settings (disabled, "Coming soon" pill), the light/dark theme flip, and Add design — each a 48dp-minimum row at 10px radius with a Thread Line border and the 5% whisper. The rows rise and fade in inside the quiet budget; a tap outside, an action, leaving the route, backgrounding the app, or Android Back shuts them.

### Empty covers

One dashed frame for every missing Cover, drawn on a Kraft Layer mount and inset so it never touches the card or page edge. The frame uses Faded Thread for contrast. A single-view page sets the Design's name inside it in the display face and says "No photography yet"; a tile keeps the name in the card body and says "No cover" at the 12px floor. The pager's own frame says "No photography yet", or "No {Stage} images yet" for an empty chosen stage, and carries no Design name — the identity block above already names it. No glyph, no illustration.

## Do's and Don'ts

### Do:

- **Do** resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- **Do** separate with Thread Line hairlines and group with Kraft Layer insets; let tone carry the hierarchy.
- **Do** give every editable row one trailing pencil in Faded Thread and the 120ms Kraft press wash; Status carries neither.
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
- **Don't** add a second pure white or a true black to the paper world; Warm Paper is its one white, and the only black lives over photography.
