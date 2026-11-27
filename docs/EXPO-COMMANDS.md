## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
pnpm expo install <package>  # ALWAYS use instead of pnpm add — resolves SDK-compatible versions
pnpm start                   # start the dev server
pnpm lint                    # lint
pnpm typecheck               # typecheck
pnpm test                    # jest
pnpm check                   # typecheck + lint + both guards + tests
pnpm db:generate             # drizzle-kit generate + idempotency rewrite
npx expo-doctor              # diagnose dependency and config issues
pnpm expo install --fix      # fix incompatible package versions
npx @expo/agent-cli docs:search <query>  # search the synced SDK docs, file:line
npx @expo/agent-cli docs:sync            # refresh ~/.expo/agent-cli/docs
```

Run `pnpm check` before declaring any task done. It runs formatting, typecheck,
lint, the guard scripts, and the suite; the pre-push hook runs it once per
branch, and CI runs the same checks.

## Config plugins

A change under `expo.plugins` in `app.json` reaches native only through
prebuild. With an `android/` directory present, `expo run:android` skips
prebuild, so run `npx expo prebuild --platform android` and read the generated
file (for example `android/app/src/main/res/values/styles.xml`) before asking
for a rebuild.

## Device checks

`pnpm device` drives the attached development build. It replaces the
hand-written `uiautomator dump` + pull + parse + coordinate guess loop. Use
`ui` to locate a control and `shot` to judge the screen; do not read a
screenshot to find coordinates.

```bash
pnpm device ui [filter]                 # label, class, and bounds of visible nodes
pnpm device tap "More actions"          # tap a label, by exact text or content-desc
pnpm device tap "Rejected" --wait 2000  # wait for a sheet, then tap the label
pnpm device swipe up 0.4                # swipe the centre; fraction and duration optional
pnpm device text "Revisit the seam"     # type into the focused field
pnpm device key BACK                    # send a key event
pnpm device font 2.0                    # set the system font scale; the app relaunches
pnpm device shot /tmp/opencode/screen.png
pnpm device state                       # resumed activity, font scale, density
pnpm device db backup /tmp/opencode/jbdc.db
pnpm device db restore /tmp/opencode/jbdc.db
```

Changing `font_scale` relaunches the activity back to the Library and shows
Expo Router's "Open debugger to view warnings" toast; both are expected. Set
the scale before navigating.

`db backup` force-stops the app so the WAL is quiet, copies `jbdc.db`, `-wal`,
and `-shm` beside the path you give, and relaunches; `db restore` force-stops,
removes the remote files, copies the snapshot back, and relaunches. Keep the
three files together. Both need a debug build (`run-as`). Take a snapshot
before a verification pass that writes, and restore it afterwards.

A worktree's code needs its own build: run `pnpm android` in that worktree (it installs over the same app id),
then `pnpm device state` confirms it. For a JS-only change, start Metro in the worktree (`pnpm start`) and reuse
the installed build. Rebuild the main checkout when you return to it.

Set `ANDROID_SERIAL` when more than one device is attached.
