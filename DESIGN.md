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

<!-- impeccable:design-map -->
Name: JBDC — Fashion Design Catalog
Colors: primary: wood #B38A64; secondary: green #687C68; neutral: background #FFFFFF; destructive: destructive #B94B45; neutral: surface #F8F6F2; neutral: surface-secondary #F2EBDD (+6 more in the sidecar)
Fonts: Cormorant Garamond (title, title-sm); DM Sans (body, body-sm, label, label-sm); DM Mono (mono)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, grid-gap 12px, screen-margin 24px
Radius: sm 6px, md 8px, lg 10px, xl 14px, 2xl 16px, full 9999px
North Star: "The Atelier Ledger"
Rules:
- The Ink-and-Paper Rule. Color is state, not decoration.
- The Two Voices Rule. Cormorant speaks only for titles — the names of screens, designs, and dialogs.
- The Flat-Archive Rule. A surface's importance is read from its tone, never from its shadow.
- The Pill Rule. Pills are for state and selection — badges, stage chips, toggles.
- The Quiet Turn Rule. Motion never announces — it only arrives and leaves, in 200ms or less.
Elevation:
- Whisper: 0 1px 2px rgba(0,0,0,0.05)
- Dialog (large soft shadow at 5% black): the centered dialog, the deepest point in the system.
Don't:
- Don't introduce any accent hue beyond wood, sage, and red.
- Don't lift a card with a shadow heavier than the 5% whisper; no glass, no gradients, no blur backdrops.
- Don't set a status in anything but a pill — never a rectangle, a banner, or a colored row.
- Don't fill an empty stage with illustration or icon decoration; the dashed frame is the empty state.
- Don't announce a save with a toast or a banner; History is a screen the Owner opens.
- Don't animate an entrance longer than 200ms, or with a spring that bounces.
- Don't use true black or pure white inside the paper world; the only blacks live over photography.
Do:
- Do resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- Do separate with Thread Line hairlines and group with Kraft Layer insets; let tone carry the hierarchy.
- Do mark every empty attach point with the dashed frame — an empty stage, a missing cover, an add action.
- Do keep Cormorant for titles only, DM Sans for information, DM Mono for ids and measurements.
- (+3 more)
Map: docs/design-token.md
Map: src/global.css
Map: GLOSSARY.md
Full: .impeccable/design-full.md (read a section when you need its detail)
