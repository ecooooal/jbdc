# Library screen — critique follow-up plan

Source critique: `.impeccable/critique/2026-11-23T16-52-12Z__src-features-library-components-library-screen-tsx.md`
Target: `src/features/library/components/library-screen.tsx` (the Library screen, tickets #71–75).

**Scope agreed:** all five priority issues.
**Design intent agreed:** the portfolio voice — Design names in Cormorant; Collection headers become a quieter label. This reverses today's inverted hierarchy (serif Collection h4 above sans Design names).

**Follow-up (2026-11-24):** the first four P1s landed. The second critique
(`2026-11-23T20-18-35Z`) carries the current work: the grid's inverted voice,
and the 4-up tile. **4-up is dropped (approved):** a 4-up tile at the type floor
cannot hold the Design's name and the full Status pill. Density is now 1 / 2;
the typeset pass gives the 2-up tile the Cormorant name, equal-height tiles
whose Status pills align, and no four-up lane.

**Distill (2026-11-24):** the 2-up tile stops at the Cover, the Cormorant name,
and the Status pill; the mono taxonomy line moved to the single view, because
a wrapped line made row heights volatile. The density control draws the layouts
(one page / two columns) instead of numerals, and the FAB holds one corner at
every density while the single-view panel reserves it.

**Clarify (2026-11-24):** the Owner rejected a screen title as noise — the
Library is the only screen and the app opens on it — so the header keeps its
controls. The grouping choice gains a visible "Group by" label with "Design" /
"Collection" as its values, and Search and Filter are drawn as one paired
control in the density control's segmented shell. Both stay disabled with a
"Coming soon" hint until their screens exist; the pair holds the right side of
the single header row.

## Evidence base

Reviewed on the attached Android phone (1080×2400 @ 440 dpi) running Expo Go, in light and dark, densities 1 / 2 / 4, both groupings, and font scale 1.0 and 1.3. The MIUI "Tools" floating gear in screenshots is OS chrome, not this app.

Current state to leave alone unless a ticket says otherwise: light theme, the Design grouping, density 2, font scale 1.0. The persisted theme choice was changed from follow-system to light during the review; the FAB toggle has no path back to follow-system.

## Work order

Accessibility and theme chrome first (contained, verifiable), then empty covers, then the FAB, then the grid hierarchy. All five should land before this screen is considered done.

---

## 1. [P1] Empty covers: one honest empty state

**Problem.** Most cards on the first screen have no cover. The grid draws a `bg-muted` block with a 20dp t-shirt glyph; the single view draws a full-screen beige void whose dashed frame is `border-border` #E8E5DF on `bg-muted` #F2EBDD — measured **1.06:1** — with its top and bottom edges hidden under the header and panel. It reads as a failed image load. Violates DESIGN.md: "the dashed frame is the empty state" and "don't fill an empty stage with illustration or icon decoration."

**Change.**
- One empty-cover component used by the grid, the single view, and any future surface.
- Inset dashed frame at ≥3:1 against its fill; Design name in Cormorant inside it (the name is the content when there is no photography); a quiet "No photography yet" in muted DM Sans.
- Remove the `Shirt` icon placeholder from `library-card.tsx`.
- Keep the dashed frame visible at the page edges (inset, not clipped by header/panel).
- The single-view page counter is black `bg-black/60`; on a no-cover page it sits over paper, against "only blacks live over photography." Give it a paper-appropriate pill on non-photography pages.

**Files:** `src/features/library/components/library-card.tsx`, `single-view-page.tsx`, `single-view.tsx`.

**Done when:** a no-cover Design reads as a deliberate, named empty page at density 1 and as a named empty tile at 2; frame contrast ≥3:1; no t-shirt icon anywhere.

---

## 2. [P1] The FAB owns add without hiding it

**Problem.** Add is two taps on an ellipsis. Expanded actions are icon-only circles with no labels or scrim. Disabled Settings sits nearest the FAB; Add sits farthest. In dark mode over photography the outline actions nearly disappear. Tapping a card behind the open menu navigates, and the menu is still open on return (verified). The disabled gear renders as a translucent circle over card text.

**Change.**
- Stack order: Add nearest the FAB, theme next, Settings farthest (or make the collapsed FAB a direct Add if the brief is reopened — do not change the brief without asking).
- Short DM Sans labels for each action.
- Outside-tap dismissal, close on navigation and on blur; do not leave the menu open after a Detail round-trip.
- Disabled Settings gets an explicit "Coming soon" treatment, not only 50% opacity, and must not sit ghosted over content.
- Opaque paper surface for actions over photography; the single-view panel carve-out shows what is allowed over photos.
- Keep motion inside the 200ms quiet budget.

**Files:** `src/features/library/components/library-fab.tsx`, `library-screen.tsx` (close on navigation where the menu is consumed).

**Done when:** the speed dial is legible over photography in both themes, Add's label is visible, outside tap closes it, and Back from a Detail returns to a closed FAB.

---

## 3. [P1] Platform floors: touch, contrast, type scale

**Problem.** Density segments **23×36dp**; grouping trigger **117×40dp**; Search/Filter **40×40dp** — all under Android's 48×48dp (and iOS 44pt). At 1.3× font the header row does not wrap and the Filter icon clips off-screen; names truncate mid-word. Card meta is **4.37:1** (#77736C on #F8F6F2); the 60%-opacity "No category / No collection" is **2.22:1**. Density-4 status is **10px**. Section headers are `h4` while card titles are `h3`, inverting screen-reader order.

**Change.**
- Every header control reaches 48dp of touch height; visual size may stay compact.
- Announce the header may wrap/scroll at large text; verify at 1.3× and 2×.
- Darken the muted token on card surfaces or raise meta to 15px+ to reach 4.5:1; make placeholder meta readable or omit it.
- Keep Status in a pill at every density (see item 5).
- Collection heading level 3, Design titles level 4 — fix the roles, not just the styles.

**Files:** `src/features/library/components/library-screen.tsx`, `density-control.tsx`, `grouping-select.tsx`, `library-card.tsx`, `src/global.css` (muted token if it changes), `src/shared/components/ui/text.tsx` only if the role map requires it.

**Done when:** measured targets ≥48dp, meta ≥4.5:1, header intact at 1.3× and 2×, screen-reader outline reads Collection → Design.

---

## 4. [P1] Theme reaches the system chrome

**Problem.** In dark mode the status-bar strip and the gesture-navigation strip stay white while every in-app surface is dark. Fails ticket #75's own acceptance criterion that navigation chrome follows the theme.

**Change.** Drive the Android window background, status bar, and navigation bar appearance from the resolved scheme (config-plugin or `expo-navigation-bar` approach), not only the in-app `StatusBar` style. Verify on a development build rather than Expo Go, then on the device in both themes.

**Files:** `src/app/_layout.tsx`, `app.json` (edge-to-edge/navigation-bar styling).

**Done when:** no light band remains in dark mode at the top or bottom of any route.

---

## 5. [P2] Grid information design, portfolio voice

**Problem.** No screen title; the grouping trigger reads as a filter field. 16px sans names under 20px serif Collection headers. Category and Collection are unlabeled gray lines whose order must be memorized; the Collection repeats on every card inside its own section. Wrapping titles make cards 16–20dp taller than their row (44px at 4-up, 55px at 2-up), producing ragged rows. At 4-up Status becomes bare 10px text. Search/Filter occupy permanent prime header space while dead. Density sits on the right although `docs/ui-improve.md` specifies it left beside grouping.

**Change (portfolio voice).**
- Design names in Cormorant at 2-up, at the largest size the tile can hold legibly; Collection headers become a quiet DM Sans label (or DM Mono) with a hairline, not a serif heading that outranks the work. (4-up is dropped; see the follow-up note.)
- Group metadata into one labeled line (`Outerwear · owidjd (2022)`) or set it in DM Mono so the eye can classify it; drop the Collection line inside a Collection section.
- Give every tile a fixed metadata area so card bottoms align in every row; keep Status a pill at every density.
- Add a screen title, or restyle the grouping trigger so it reads as the screen's label rather than a filter field.
- Put density beside grouping as planned; decide whether disabled Search/Filter ships at all (they are the only hint at the future Rejected door, so if they stay, explain them).
- Consider sticky Collection headers for long seasons.

**Files:** `library-screen.tsx`, `library-card.tsx`, `density-control.tsx`, `single-view-page.tsx` (name voice consistency).

**Done when:** the grid reads as the same product as the single view, rows align, and a Design's name is the loudest thing in its tile.

---

## Not in this pass

- Building the Rejected/Archived archive or enabling Search/Filter. The Library deliberately hides both (`query.ts`); GLOSSARY defines the Library as active work and the PRD puts Rejected in its own section. Record the question, don't fix it here.
- The Detail screen's History/Edit text buttons (called out in `docs/ui-improve.md` but outside this critique).
- The 120ms press hold: spec'd behaviour; revisit only if it feels slow after the above.

## Verification

Run the repo's documented checks (`docs/EXPO-COMMANDS.md`) plus the Library's test seams. Then re-render on the device: light and dark, densities 1/2, both groupings, font scale 1.0 and 1.3, and a no-cover Design in single view. Re-run `$impeccable critique` on the same target to compare against **24/40 (first run)**.
