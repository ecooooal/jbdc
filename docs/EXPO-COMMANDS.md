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
screenshot to find coordinates. `ui` also reports `checked` and `selected`, so a
switch or radio is verified from text instead of a picture.

```bash
pnpm device ui [filter]                 # label, class, bounds, tap/checked/selected
pnpm device tap "More actions"          # tap a label, by exact text or content-desc
pnpm device tap "Rejected" --wait 2000  # wait for a sheet, then tap the label
pnpm device tap "Dark mode" --shot /tmp/opencode/dark.png  # tap, then capture its result
pnpm device swipe up 0.4                # swipe the centre; fraction and duration optional
pnpm device text "Revisit the seam"     # type into the focused field
pnpm device key BACK                    # send a key event
pnpm device font 2.0                    # set the system font scale; the app relaunches
pnpm device shot /tmp/opencode/screen.png                    # capture the screen now
pnpm device shot /tmp/opencode/menu.png --crop "[310,460][1014,807]"  # one region
pnpm device state                       # resumed activity, font scale, density
pnpm device db backup /tmp/opencode/jbdc.db
pnpm device db restore /tmp/opencode/jbdc.db
```

`shot` captures the frame as it is now. `tap --shot` waits out the press
feedback, then for the app's pixels to leave the frame the tap started from,
then for them to hold still; the status and navigation bars are ignored, since
the clock and battery animate on their own. A warning on stderr means the screen
never settled on the result, so the tap may have missed or the screen kept
moving. `--crop` takes `x,y,w,h` or the bounds `ui` printed, so one control
fills the frame.

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

## Images

Pillow, `pngjs`, `sharp`, and `ffmpeg` are not installed; ImageMagick is
(`brew install imagemagick` restores it on a fresh machine). Read a capture
directly when the whole screen is the question; crop when one control is:

```bash
magick identify /tmp/opencode/screen.png                      # dimensions
magick /tmp/opencode/screen.png -crop 400x300+100+800 +repage /tmp/opencode/close.png
magick compare -metric AE /tmp/opencode/before.png /tmp/opencode/after.png null:  # changed pixels
```

`pnpm device shot --crop` wraps the crop and prints the one path to read, so a
control fills the frame at a fraction of a full-screen capture. `compare` writes
its metric to stderr and exits 1 when the images differ.
