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

<!-- impeccable:design-map -->
Name: JBDC — Fashion Design Catalog
Colors: primary: wood #B38A64; secondary: green #687C68; neutral: background #FFFFFF; destructive: destructive #B94B45; primary: selection #8A6642; neutral: surface #F8F6F2 (+16 more in the sidecar)
Fonts: Cormorant Garamond (display, title, subtitle, title-sm); DM Sans (body, body-sm, label, label-sm); DM Mono (mono, mono-sm)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, 2xl 48px, grid-gap 12px, screen-margin 24px
Radius: sm 6px, md 8px, lg 10px, xl 14px, 2xl 16px, full 9999px
North Star: "The Atelier Ledger"
Rules:
- The Ink-and-Paper Rule. Color is state, not decoration.
- The Detail Ground Rule. The Design detail is the one page that inverts the mat: Unbleached Paper underfoot, Warm Paper for its cards and stage tabs.
- The Two Voices Rule. Cormorant speaks only for titles — the names of screens, designs, and dialogs.
- The Flat-Archive Rule. A surface's importance is read from its tone, never from its shadow.
- The Pill Rule. Pills are for state and selection — badges, counters, toggles.
- The Quiet Turn Rule. Motion never announces — it only arrives and leaves, in 200ms or less.
- The Separate Exit Rule. The one Status that ends a Design never shares a box with the Statuses that move it onward.
Elevation:
- Whisper: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)
- Dialog: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)
Don't:
- Don't introduce any accent hue beyond wood, sage, and red.
- Don't lift a card with a shadow heavier than the 5% whisper; no glass, no gradients, no blur backdrops — the single view's details panel may blur only the photography beneath it.
- Don't set a status in anything but a pill — never a rectangle, a banner, or a colored row.
- Don't fill an empty stage with illustration or icon decoration; the dashed frame is the empty state.
- Don't place persistent paper chrome on a photograph; use the translucent-black pill.
- Don't announce a save with a toast or a banner; History is a screen the Owner opens.
- Don't animate an entrance longer than 200ms, or with a spring that bounces.
- Don't add a second pure white or a black fill to the paper world; Warm Paper is its one white.
Do:
- Do resolve every color through the slot table in Colors — wood is `primary`, sage is `secondary`, Kraft is `muted`/`accent`.
- (+8 more)
Map: src/global.css
Map: docs/design-token.md
Map: GLOSSARY.md
Full: .impeccable/design-full.md (read a section when you need its detail)
