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

<!-- impeccable:design-map -->
Name: JBDC — Fashion Design Catalog
Colors: primary: wood #B38A64; secondary: green #687C68; neutral: background #FFFFFF; destructive: destructive #B94B45; neutral: surface #F8F6F2; neutral: surface-secondary #F2EBDD; neutral: photography #000000; neutral: overlay rgba(0, 0, 0, 0.60) (+8 more)
Fonts: Cormorant Garamond (display, title, subtitle, title-sm); DM Sans (body, body-sm, label, label-sm); DM Mono (mono, mono-sm)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, 2xl 48px, grid-gap 12px, screen-margin 24px
Radius: sm 6px, md 8px, lg 10px, xl 14px, 2xl 16px, full 9999px
North Star: "The Atelier Ledger"
Rules:
- The Ink-and-Paper Rule. Color is state, not decoration.
- The Overlay Exception. Over photography, persistent chrome is a translucent-black pill; only a menu or sheet the Owner opens may be paper.
- The Two Voices Rule. Cormorant speaks only for titles — the names of screens, designs, and dialogs.
- The Flat-Archive Rule. A surface's importance is read from its tone, never from its shadow.
- The Single-View Carve-Out. The single view's details panel is the one surface that blurs — only the photography beneath it; no card, sheet, bar, or control blurs.
- The Pill Rule. Pills are for state and selection — badges, stage chips, counters, toggles.
- The Quiet Turn Rule. Motion never announces — it only arrives and leaves, in 200ms or less.
- The Detail Ground Rule. The Design detail alone stands on Unbleached Paper; its cards return to Warm Paper.
Elevation:
- Whisper: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)
- Dialog: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05) — the centered dialog, the deepest point in the system.
Don't:
- Don't introduce any accent hue beyond wood, sage, and red.
- Don't lift a card with a shadow heavier than the 5% whisper; no glass, no gradients, no blur backdrops — the single view's details panel may blur only the photography beneath it.
- Don't set a status in anything but a pill — never a rectangle, a banner, or a colored row.
- Don't fill an empty stage with illustration or icon decoration; the dashed frame is the empty state.
- Don't place persistent paper chrome on a photograph; use the translucent-black pill. Only a menu or sheet the Owner opens may be paper over an image.
- Don't announce a save with a toast or a banner; History is a screen the Owner opens.
- Don't animate an entrance longer than 200ms, or with a spring that bounces.
- Don't add a second pure white or a true black to the paper world; Warm Paper is its one white, and the only black lives over photography.
Do:
- Do resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- Do separate with Thread Line hairlines and group with Kraft Layer insets; let tone carry the hierarchy.
- Do mark every empty attach point with the dashed frame — an empty stage, a missing cover, an add action.
- Do keep Cormorant for titles only, DM Sans for information, DM Mono for dates, ids, and measurements.
- (+4 more)
Map: docs/design-token.md
Map: src/global.css
Map: GLOSSARY.md
Full: .impeccable/design-full.md (read a section when you need its detail)
