---
name: JBDC — Fashion Design Catalog
description: The Atelier Ledger — a warm paper-and-wood design system for one designer's private design catalog.
colors:
  background: "#FFFFFF"
  surface: "#F8F6F2"
  surface-secondary: "#F2EBDD"
  foreground: "#292724"
  foreground-secondary: "#77736C"
  border: "#E8E5DF"
  wood: "#B38A64"
  wood-foreground: "#292724"
  green: "#687C68"
  green-foreground: "#FFFFFF"
  destructive: "#B94B45"
  destructive-foreground: "#FFFFFF"
  dark:
    background: "#242424"
    surface: "#303030"
    surface-secondary: "#424242"
    foreground: "#F0EEE9"
    foreground-secondary: "#B5B0A7"
    border: "#444444"
    wood: "#D1B18A"
    wood-foreground: "#292724"
    green: "#A4B69A"
    green-foreground: "#242424"
    destructive: "#E27770"
    destructive-foreground: "#242424"
typography:
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.2
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
  chip-stage-active:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  hero:
    backgroundColor: "{colors.surface-secondary}"
    rounded: "{rounded.2xl}"
    height: "300px"
---

# Design System: JBDC — The Atelier Ledger

## Overview

**Creative North Star: "The Atelier Ledger"**

JBDC is one designer's private catalog of her own clothing designs, and the interface reads as her bound studio notebook: warm paper surfaces, a wood-toned accent for the things that matter, serif titles like specimen labels. The photography is the artwork; the chrome is the furniture around it. The feel is warm, unhurried, precise — a working archive, not a showcase.

The system is quiet archival. Depth comes from paper tonal steps and hairline borders, never from shadow play; press feedback is a tonal shift, not a bounce; motion is a short fade that honors the system Reduce Motion setting. Color is spent on meaning only: Sanded Wood marks confirmed work and primary actions, Muslin Sage marks work in progress and active selection, Rejection Red marks what did not proceed. Everything else is paper and ink.

The normative token source is `docs/design-token.md` (committed 2026-11-23). **Wiring status:** the component library in code is uniwind + rn-primitives (shadcn-style slot names), but `src/global.css` still carries the scaffold palette and the three typefaces are not yet bundled. New screens follow this document; converging `global.css` and loading the fonts is a separate wiring chore, not a design decision.

**Key Characteristics:**

- Paper tonal hierarchy — Warm Paper page, Unbleached Paper cards, Kraft Layer insets — instead of shadows
- Cormorant Garamond titles over DM Sans body; DM Mono for ids, measurements, constants
- Two accents with fixed meanings: Sanded Wood (confirmed/primary), Muslin Sage (in-progress/active); red is rejection only
- Hairline Thread Line borders everywhere; dashed borders are the signature for empty attach points
- Photography leads at fixed ratios: 4:5 hero, 3:4 thumbs, square compact covers
- Fades ≤ 200ms, honoring Reduce Motion; nothing bounces or loops

## Colors

A warm, low-saturation paper palette whose only saturated voices are two accents with fixed meanings.

### Primary

- **Sanded Wood** (`wood`, #B38A64 light / #D1B18A dark): the single primary accent. Primary actions, the Approved and Produced status badge, and selection borders (the picked journey thumb, the active stage chip's edge). Ink Thread text sits on it in both modes. Rare by design — well under 10% of any screen.

### Secondary

- **Muslin Sage** (`green`, #687C68 light / #A4B69A dark): work in progress and active state. The In Development status badge, the border of the selected stage chip, and active/selected marks. White text on it in light mode, ink in dark.

### Tertiary

- **Rejection Red** (`destructive`, #B94B45 light / #E27770 dark): rejection and destruction only — the Rejected status badge, destructive actions, error text. Never decoration.

### Neutral

- **Warm Paper** (`background`, #FFFFFF light / #242424 dark): the page behind everything. Pure white in light mode is deliberate: it is the mat the archive sits on, not a SaaS canvas.
- **Unbleached Paper** (`surface`, #F8F6F2 / #303030): every resting surface content sits on — cards, tiles, dialogs.
- **Kraft Layer** (`surface-secondary`, #F2EBDD / #424242): the inset group one step into a surface — form sections, field tables, image placeholders, the fill of a selected stage chip.
- **Ink Thread** (`foreground`, #292724 / #F0EEE9): primary text — the ink of the ledger.
- **Faded Thread** (`foreground-secondary`, #77736C / #B5B0A7): secondary text — labels, meta lines, counts, quiet descriptions.
- **Thread Line** (`border`, #E8E5DF / #444444): hairline borders and input strokes.

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
| `secondary` | Muslin Sage |
| `secondary-foreground` | White (light) / ink (dark) on sage |
| `destructive` | Rejection Red |
| `border`, `input` | Thread Line |

### Named Rules

**The Ink-and-Paper Rule.** Color is state, not decoration. Wood = confirmed and primary, Sage = in-progress and active, Red = rejection and destruction. No third accent hue ever enters the system; everything else is paper and ink.

**The Overlay Exception.** Over photography only, chips may use translucent black (`rgba(0,0,0,0.6)`) with white text. Nowhere else does true black appear in the paper world.

## Typography

**Display/Title Font:** Cormorant Garamond (with Georgia, serif)
**Body Font:** DM Sans (with system sans)
**Label Font:** DM Sans, medium weight
**Mono Font:** DM Mono (with system monospace)

**Character:** A serif that speaks only when something is named; a humanist sans that does all the reading work; a mono that keeps the record honest. Titles read like specimen labels in a ledger; body copy stays quiet and unstyled so the images dominate.

### Hierarchy

- **Title** (Cormorant Garamond, 600, 24px, 1.25, −0.01em): screen titles and a design's name — the moments the ledger names something.
- **Title-small** (Cormorant Garamond, 600, 18px, 1.2): dialog and sheet titles.
- **Body** (DM Sans, 400, 16px, 1.5): descriptions, recorded values, prose.
- **Body-small** (DM Sans, 400, 14px, 1.4): meta lines, secondary copy.
- **Label** (DM Sans, 500, 14px, 1.4): field labels, button text, stage names, materials.
- **Label-small** (DM Sans, 500, 12px, 1.2): badges, chips, counts, micro-labels.
- **Mono** (DM Mono, 400, 14px, 1.4): ids, measurements, constants — anything read as data rather than prose.

### Named Rules

**The Two Voices Rule.** Cormorant speaks only for titles — the names of screens, designs, and dialogs. Anything the Owner reads as information is DM Sans; anything read as data is DM Mono. Cormorant body text is forbidden.

## Layout

Portrait, phone-first, native stack navigation with OS headers hidden — every screen owns its header: serif title left, icon controls right, back is a ghost chevron. Content lives inside safe-area insets on every screen, with a 24px side margin, 24px section rhythm, 16px list rhythm, and 48px of breathing room at the end of every scroll.

The Library grid is density-driven, not breakpoint-driven: the Owner chooses the Library's density (persisted) — the single view at 1, two or four designs per row — and the card width derives from the current viewport, so rotation reflows card width without ever breaking the column count. There are no media breakpoints in the system; density is a user decision, not a width decision.

Forms and recorded sections group into inset blocks — one tonal step (Kraft Layer) or a hairline border inside the card — so a half-filled design reads as intentional rather than incomplete: empty sections simply say "Nothing recorded yet."

## Elevation & Depth

Quiet archival: depth is read from tone, not shadow. The three paper steps (Warm Paper → Unbleached Paper → Kraft Layer) plus Thread Line hairlines carry all hierarchy. Shadows are a 5% black whisper — `0 1px 2px rgba(0,0,0,0.05)` on resting cards, buttons, and inputs; the centered dialog alone lifts further (a large soft shadow, still 5% black). Nothing floats to demand attention.

### Shadow Vocabulary

- **Whisper** (`0 1px 2px rgba(0,0,0,0.05)`): resting cards, buttons, inputs — barely there.
- **Dialog** (large soft shadow at 5% black): the centered dialog, the deepest point in the system.

### Named Rules

**The Flat-Archive Rule.** A surface's importance is read from its tone, never from its shadow. If a shadow exists at all it stays ≤ 5% black; glass effects, large blurs, and decorative drop shadows do not enter this system.

**The Single-View Carve-Out.** The single view's details panel is the one surface allowed to blur, and it blurs only the photography directly beneath it. No card, sheet, bar, or control blurs; nothing blurred sits over a paper surface.

## Shapes

Soft specimen-jar geometry: corners ascend with size — 6px on small controls' details, 8px on buttons and inputs, 10px on dialogs and list cards, 14px on cards, 16px on the hero. Status is always a full pill (9999px). Dashed Thread Line borders are the system's signature for emptiness: an empty stage, an add-image card, a missing cover all show the same dashed frame — a hole is drawn as a hole, never decorated over.

Photography keeps fixed ratios: 4:5 for the hero, 3:4 for journey thumbs and add cards, square for compact covers. The image crops to the frame; the layout never stretches to the image.

### Named Rules

**The Pill Rule.** Pills are for state and selection — badges, stage chips, toggles. Rectangles are for containers and controls. A pill never carries a sentence; a rectangle never carries a status.

## Motion & Micro-interaction

Motion is quiet and decelerating: overlays fade in over 200ms and out over 150ms (Reanimated, honoring the system Reduce Motion setting); accordion-style reveals take 200ms; press feedback is an instant tonal shift (a button darkens to 90%, a Library card dips slightly and takes a faint ink wash) held for a beat so the Owner sees it before the route opens — the press itself never animates. Nothing bounces, nothing loops, nothing moves for decoration. Screen-to-screen transitions stay plain fades until a deliberate polish phase changes them.

### Named Rules

**The Quiet Turn Rule.** Motion never announces — it only arrives and leaves, in 200ms or less. Every animation honors the system Reduce Motion setting with a crossfade or an instant cut.

## Voice & Content Strategy

- **Tone of voice:** Frank, first-person, precise — the Owner's own voice, as recorded in PRODUCT.md. No exclamation marks, no marketing warmth, no filler.
- **Capitalization:** Sentence case everywhere — titles, buttons, labels, statuses.
- **Terminology:** `GLOSSARY.md` is canonical and binding (Design, Specification, Creative Direction, History, Status, Material use, Library, Owner). A term not in it is not a term; its avoid-lists apply (never "photo" for an Image, never "user" for the Owner).
- **Button and action labels:** Verb phrases naming the outcome — "Create a design", "Add images to Prototype". Never "OK", "Submit", or "Done" alone.
- **Empty, loading, and error states:** One quiet line plus one action — "The library is empty" / "Designs you add will appear here."; "Nothing recorded yet."; "Nothing has changed yet." Errors are plain and name what failed, in Rejection Red: "The images could not be added."
- **Numbers, dates, and units:** Short dates via the system formatter ("Nov 23, 2026"); History entries add hour and minute. Saves are never announced — no toasts, no banners; History is a screen the Owner opens.

## Components

The library is uniwind + rn-primitives with shadcn-style slot names; every color below resolves through the slot table in Colors.

### Buttons

- **Character:** Calm, workmanlike, never loud.
- **Shape:** Rounded rectangle (8px), 40px tall, 8px internal gap, icon 20px.
- **Primary:** Sanded Wood fill with Ink Thread text, 16px horizontal padding.
- **Press:** Instant tonal shift — primary darkens to 90%. Disabled is 50% opacity.
- **Outline / Ghost / Icon:** Thread Line border on Warm Paper; ghost and icon variants are transparent until pressed, when they take the Kraft tint.

### Status badges

- **Character:** The system's state vocabulary, worn as a pill.
- **Shape:** Full pill, 2px 8px padding, Label-small type.
- **Variants:** Confirmed (Sanded Wood + ink), In progress (Muslin Sage + white), Rejected (Rejection Red + white), Neutral (transparent, Thread Line border, ink — Concept, Archived, and date chips).

### Chips & toggles

- **Journey stage chip:** Pill with a 32px round thumbnail, stage name in Label-small semibold, and a muted count below. Unselected: Thread Line border on the page. Selected: Muslin Sage border on a Kraft fill.
- **Density control:** Outlined segmented pill group (1 / 2 / 4); the chosen segment takes the wood-tinted selected state.

### Cards

- **Character:** Paper mounts for photography and records.
- **Corner style:** 14px (10px for list rows and compact tiles).
- **Background:** Unbleached Paper with a Thread Line hairline and the whisper shadow.
- **Structure:** Cover-first tiles — image block on top, 12–16px text block below (name, then meta, then status pill). List row: 64px cover, name, one meta line, trailing badge.
- **Press:** Whole card is the button; pressed cards dip slightly and take a faint ink wash, held a beat before Detail opens.
- **Insets:** Grouped records inside a card sit on a Kraft Layer block (14px radius, 16px padding) — the current bordered rows are the scaffold precursor of this committed pattern.

### Inputs / Fields

- **Style:** Thread Line stroke on Warm Paper, 8px radius, 40px tall, DM Sans body type; placeholder at Faded Thread.
- **Focus:** The stroke and a subtle ring carry focus; no glow.
- **Disabled:** 50% opacity.

### The journey rail (signature)

One chip per image stage — inspiration, sketch, prototype, final — all four always visible, each carrying its newest thumb and its count, so an empty stage shows exactly where work is missing. The active stage opens a horizontal strip of 3:4 thumbs (10px radius; the selected one carries a 2px Sanded Wood border) ending in the dashed add-card.

### The gallery hero (signature)

A 4:5 image block at 16px radius on the Kraft Layer, with the stage name (semibold) pinned top-left and the position count top-right, both as translucent-black pills with white text. A tap opens full-screen; a swipe changes the image on release.

### The dashed add-card (signature)

3:4, 64px wide, Thread Line dashed border on Kraft, a plus icon and a 10px "Add" label. The system's only invitation to attach — every stage that can accept images ends in one.

### Event cards

One History entry: Thread Line hairline box (14px radius, 16px padding) with the timestamp in Faded Thread, then the recorded sections as label + lines. Read-only by construction; a correction is a new card.

### Dialogs

Centered on a 50% black overlay, Warm Paper content at 10px radius, 24px padding, the dialog shadow, a ghost close X top-right; fading in 200ms, out 150ms.

## Do's and Don'ts

### Do:

- **Do** resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- **Do** separate with Thread Line hairlines and group with Kraft Layer insets; let tone carry the hierarchy.
- **Do** mark every empty attach point with the dashed frame — an empty stage, a missing cover, an add action.
- **Do** keep Cormorant for titles only, DM Sans for information, DM Mono for ids and measurements.
- **Do** use fades of 200ms or less that honor the system Reduce Motion setting.
- **Do** lay out inside safe-area insets and end every scroll in 48px of breathing room.
- **Do** write empty and error states plainly, in sentence case, with one action — and name terminology from `GLOSSARY.md`.

### Don't:

- **Don't** introduce any accent hue beyond wood, sage, and red.
- **Don't** lift a card with a shadow heavier than the 5% whisper; no glass, no gradients, no blur backdrops — the single view's details panel may blur only the photography beneath it.
- **Don't** set a status in anything but a pill — never a rectangle, a banner, or a colored row.
- **Don't** fill an empty stage with illustration or icon decoration; the dashed frame is the empty state.
- **Don't** announce a save with a toast or a banner; History is a screen the Owner opens.
- **Don't** animate an entrance longer than 200ms, or with a spring that bounces.
- **Don't** use true black or pure white inside the paper world; the only blacks live over photography.
