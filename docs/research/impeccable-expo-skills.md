# Research: impeccable + Expo companion skills

Date: 2026-11-22. Question: to use the [impeccable](https://impeccable.style) agent skill in this Expo app, do we need `expo-animation`, `expo-native-ui`, `expo-design-system`, or `expo-ui`?

## Verdict

**No. impeccable requires none of them.** The skill is [pbakaus/impeccable](https://github.com/pbakaus/impeccable) ("The design vocabulary for your coding agent" — by Paul Bakaus, Apache-2.0). It declares zero companion skills: its dependency manifest [`skills-lock.json`](https://raw.githubusercontent.com/pbakaus/impeccable/main/skills-lock.json) is empty (`{"version": 1, "skills": {}}`), and no `expo-*` skill is mentioned in its [README](https://github.com/pbakaus/impeccable), [SKILL.md](https://raw.githubusercontent.com/pbakaus/impeccable/main/.agents/skills/impeccable/SKILL.md), [reference files](https://github.com/pbakaus/impeccable/tree/main/.agents/skills/impeccable/reference) (including [`audit.native.md`](https://raw.githubusercontent.com/pbakaus/impeccable/main/.agents/skills/impeccable/reference/audit.native.md)), or [site docs](https://impeccable.style/llms.txt).

All four names are real skills with exactly those spellings — but they are **Expo's official skills** from the [`expo/skills`](https://github.com/expo/skills) repo, a separate project with no cross-reference to impeccable in either primary source. Pairing impeccable with them for an Expo app is plausible advice (they mirror impeccable's commands: motion ↔ `animate`, native styling ↔ `polish`, design system ↔ `document`/`extract`), but no primary source says it.

## impeccable on OpenCode — caveats

- Install: `npx impeccable install` (the installer explicitly detects OpenCode — [README](https://github.com/pbakaus/impeccable), [impeccable.style](https://impeccable.style)). Alternative: `npx skills add https://github.com/pbakaus/impeccable --skill impeccable` ([skills.sh](https://skills.sh/pbakaus/impeccable/impeccable)).
- The **automatic design-detector hook is not available on OpenCode** (Claude Code, Cursor, Codex, GitHub Copilot, Grok Build, Hermes Agent only — [README](https://github.com/pbakaus/impeccable)). On OpenCode you get the skill, its 24 commands, and the `npx impeccable detect` CLI.
- Native support is **alpha**: `audit` and `adapt` read SwiftUI / UIKit / Compose / **React Native** / Flutter source directly and score against built-in HIG / Material 3 references ([docs/context](https://impeccable.style/docs/context), [`audit.native.md`](https://raw.githubusercontent.com/pbakaus/impeccable/main/.agents/skills/impeccable/reference/audit.native.md)). Live Mode and the browser detector do not inspect native interfaces.
- Set `## Platform` in `PRODUCT.md` to `ios`, `android`, or `adaptive` to activate native guidance ([README](https://github.com/pbakaus/impeccable)).

## The four Expo skills — fit for this repo

Repo context: Expo SDK 58, `@expo/ui ~58.0.27`, full `@rn-primitives/*` set (react-native-reusables), `react-native-reanimated 4.7.1` + worklets + gesture-handler, Uniwind `^1.13.2` (Tailwind v4 for RN, tokens in `global.css`).

| Skill | Covers | impeccable requires? | Fit here |
| --- | --- | --- | --- |
| [`expo-animation`](https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-animation/SKILL.md) | RN/Expo animation: animate-or-not gate, thread choice, spring vs timing, gesture handoff, reduced motion, haptics; built with Reanimated + Gesture Handler + expo-haptics | No | ✅ Good — no styling conflict; repo already runs the exact stack it targets |
| [`expo-native-ui`](https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-native-ui/SKILL.md) | Native-feeling screens: HIG styling, semantic colors, native controls, SF Symbols, visual effects | No | ❌ Skip — its rule "**CSS and Tailwind are not supported - use inline styles**" directly contradicts this repo's Uniwind setup |
| [`expo-design-system`](https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-design-system/SKILL.md) | In-app design systems: token themes, reusable component conventions, hardcoded-color/spacing/font drift audits | No | ✅ Safe — "For Tailwind projects, keep tokens in `global.css`… **Never introduce a second system beside an existing one**"; defers to Uniwind |
| [`expo-ui`](https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-ui/SKILL.md) | The `@expo/ui` package: SwiftUI on iOS / Compose on Android; `BottomSheet`, `Picker`, `Slider`, `Switch`, `Menu`, `FieldGroup`, `List` defaults (SDK 56+) | No | ❌ Skip per decision below — "default to @expo/ui" guidance fights the react-native-reusables default |
| [`expo-data-fetching`](https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-data-fetching/SKILL.md) | Networking: `fetch`/`expo/fetch`, React Query/SWR, SecureStore auth tokens, NetInfo offline-first, retries, `EXPO_PUBLIC_` env config, Expo Router loaders | No | ✅ Safe — no conflict (repo has no remote-fetching stack); no current trigger (app is local-first, zero `fetch(` in `src`) — installed anyway per decision below |

## Decisions (2026-11-22)

1. **Components default to react-native-reusables (`@rn-primitives/*`)**, not `@expo/ui` → skip the `expo-ui` skill.
2. **`PRODUCT.md` platform: ios and android** → `adaptive` in impeccable's terms.
3. `expo-animation` is the only Expo skill with a clear positive fit; `expo-design-system` is optional and safe alongside Uniwind. `expo-native-ui` is ruled out by the Uniwind conflict.
4. **`expo-data-fetching` included anyway** — no conflict, but no current trigger: the app is local-first (SQLite + drizzle via the `src/features/database` port), nothing in `src` fetches remotely, and neither `docs/JBDC-PRD.md` nor `docs/MVP-SLICES.md` mentions an API. Kept in wait for remote work; its four-states + hydration-gating guidance is broadly useful. Prefers `expo/fetch` over axios.

## Install commands

**Expo skills: run 2026-11-22.** The skills CLI copied each skill into `.agents/skills/` with its `references/` and `agents/` subdirectories and added all three to `skills-lock.json` (source `expo/skills`). CLI quirk: the comma-separated form `-s expo-animation,expo-design-system` just prints the catalog and installs nothing — invoke once per skill:

```sh
npx skills@latest add expo/skills -s <skill> -a opencode -y
```

**impeccable: NOT run.** Commands for when it is:

```sh
npx impeccable install        # canonical; explicitly detects OpenCode
# then in the agent: /impeccable init
```

Sources: [pbakaus/impeccable README](https://github.com/pbakaus/impeccable), [impeccable.style](https://impeccable.style), [skills.sh listing](https://skills.sh/pbakaus/impeccable/impeccable), [expo/skills README](https://github.com/expo/skills), [docs.expo.dev/skills](https://docs.expo.dev/skills/), [skills.sh CLI docs](https://skills.sh/docs/cli), [opencode.ai/docs/skills](https://opencode.ai/docs/skills).

## Claims not verified

- No authenticated full-text search of `pbakaus/impeccable` for "expo" (GitHub code search requires auth). Every canonical surface was checked instead; none mentions an `expo-*` skill.
- The impeccable.style FAQ renders answers collapsed and its changelog fetch returned empty — the FAQ's question list contains no companion-skill topic, so the verdict stands, but answers were not read verbatim.
- `expo-design-system` names NativeWind/Tamagui/Restyle/Unistyles and "Tailwind projects" — Uniwind is not named. "Defers to Uniwind" is a mapping of its Tailwind-project guidance onto Uniwind's `global.css` model, not a statement in Expo's skill.
- `expo-tailwind-setup` appears in the [docs.expo.dev/skills](https://docs.expo.dev/skills/) table but does not exist in the `expo/skills` repo — stale docs entry. Tangential to this question.
