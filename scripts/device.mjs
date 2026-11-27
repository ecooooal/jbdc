#!/usr/bin/env node
/**
 * Device checks.
 *
 * The Library's visual work is verified on a development build, where every
 * check used to be a hand-written `adb` + `uiautomator` pipeline: dump the
 * hierarchy, pull it, parse it with an ad-hoc script, then guess a coordinate.
 * This prints the labels the screen exposes and taps them by name, so one
 * verification round is one command.
 *
 *   pnpm device ui [filter]
 *   pnpm device tap "More actions"
 *   pnpm device tap "Rejected" --wait 2000
 *   pnpm device tap "Dark mode" --shot /tmp/opencode/dark.png
 *   pnpm device swipe up 0.4
 *   pnpm device text "Revisit the seam"
 *   pnpm device key BACK
 *   pnpm device font 2.0
 *   pnpm device shot /tmp/opencode/screen.png
 *   pnpm device shot /tmp/opencode/menu.png --crop "[310,460][1014,807]"
 *   pnpm device state
 *   pnpm device db backup /tmp/opencode/jbdc.db
 *   pnpm device db restore /tmp/opencode/jbdc.db
 *
 * `db` needs a debug build: it reads and writes the app's files with `run-as`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [, , command, ...args] = process.argv;
let attached;
let packageName;
let screen;

const DATABASE = "jbdc.db";
const DATABASE_SUFFIXES = ["", "-wal", "-shm"];
const DEFAULT_DATABASE_BACKUP = "/tmp/opencode/jbdc.db";
const DEFAULT_SHOT = "/tmp/opencode/screen.png";

/** How long to let a tap's press feedback clear before watching for its result. */
const PRESS_SETTLE_MS = 700;

/** The beat between screenshots, long enough for a frame to render. */
const FRAME_BEAT_MS = 120;

/** How long a tap's capture waits for the change, and for the change to hold still. */
const CHANGE_TIMEOUT_MS = 5000;
const FRAME_STILL_TIMEOUT_MS = 2000;

/** A raw `screencap` starts with width, height, pixel format, and colorspace. */
const RAW_HEADER_BYTES = 16;

/** The share of the screen the status bar and the navigation bar take. */
const CONTENT_TOP = 0.07;
const CONTENT_BOTTOM = 0.05;

const TAP_USAGE =
  'Usage: pnpm device tap "<label>" [--wait <ms>] [--shot <path>] [--crop <region>]';
const SHOT_USAGE = "Usage: pnpm device shot [path] [--crop x,y,w,h | [x1,y1][x2,y2]]";

/** The development build's application id, as `app.json` declares it. */
function appPackage() {
  if (packageName) return packageName;
  const app = JSON.parse(readFileSync(new URL("../app.json", import.meta.url)));
  packageName = app.expo?.android?.package;
  if (!packageName) throw new Error("app.json has no expo.android.package.");
  return packageName;
}

/** The device `adb` commands target: `ANDROID_SERIAL`, else the first attached. */
function serial() {
  if (process.env.ANDROID_SERIAL) return process.env.ANDROID_SERIAL;
  if (attached) return attached;

  const devices = execFileSync("adb", ["devices"], { encoding: "utf8" })
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([id, state]) => id && state === "device");

  if (devices.length === 0) {
    throw new Error("No device attached. Start a development build, or set ANDROID_SERIAL.");
  }

  attached = devices[0][0];
  return attached;
}

function adb(args, options = {}) {
  return execFileSync("adb", ["-s", serial(), ...args], {
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function dump() {
  adb(["shell", "uiautomator", "dump", "/sdcard/window.xml"]);
  return adb(["exec-out", "cat", "/sdcard/window.xml"], { encoding: "utf8" });
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  if (!match) return "";
  return match[1]
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

/** Every node whose text or accessibility label is non-empty. */
function nodes() {
  return [...dump().matchAll(/<node\b[^>]*>/g)]
    .map(([tag]) => ({
      label: attribute(tag, "content-desc") || attribute(tag, "text"),
      className: attribute(tag, "class").split(".").at(-1),
      bounds: attribute(tag, "bounds"),
      clickable: attribute(tag, "clickable") === "true",
      checked: attribute(tag, "checked") === "true",
      selected: attribute(tag, "selected") === "true",
    }))
    .filter((node) => node.label);
}

function center(bounds) {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const [, x1, y1, x2, y2] = match.map(Number);
  return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

function list(filter) {
  const needle = filter?.toLowerCase();
  const visible = nodes().filter((node) => !needle || node.label.toLowerCase().includes(needle));

  for (const node of visible) {
    const flags = [node.clickable && "tap", node.checked && "checked", node.selected && "selected"]
      .filter(Boolean)
      .map((flag) => `\t${flag}`)
      .join("");
    console.log(`${node.label}\t${node.className}\t${node.bounds}${flags}`);
  }
  if (visible.length === 0) {
    console.error(needle ? `No label matches "${filter}".` : "No nodes on screen.");
  }
}

function matches(label) {
  const visible = nodes();
  const exact = visible.filter((node) => node.label === label);
  const candidates =
    exact.length > 0 ? exact : visible.filter((node) => node.label.includes(label));
  // A pressable and the Text inside it often share a label; the pressable is
  // the one with bounds that take the tap.
  const clickable = candidates.filter((node) => node.clickable);
  return clickable.length > 0 ? clickable : candidates;
}

/**
 * Tap the one node whose label matches. With `--wait`, a sheet or a screen
 * that is still animating gets time to expose its labels before the tap. With
 * `--shot`, the screen is captured once the tap has changed it; `--crop`
 * narrows that capture to a region.
 */
async function tap(label, waitMs = 0, capture = {}) {
  const deadline = Date.now() + waitMs;
  let found = matches(label);

  while (found.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    found = matches(label);
  }

  if (found.length === 0) {
    console.error(`No label matches "${label}"${waitMs > 0 ? ` after ${waitMs}ms` : ""}.`);
    process.exit(1);
  }
  if (found.length > 1) {
    console.error(`"${label}" matches ${found.length} labels:`);
    for (const node of found) console.error(`  ${node.label}\t${node.bounds}`);
    process.exit(1);
  }

  const point = center(found[0].bounds);
  if (!point) {
    console.error(`Cannot read bounds for "${label}": ${found[0].bounds}`);
    process.exit(1);
  }

  // The app's pixels before the tap, so the capture can tell the result apart
  // from the screen the tap started from.
  const baseline = capture.path ? contentPixels(rawFrame()) : null;

  adb(["shell", "input", "tap", String(point.x), String(point.y)]);
  console.log(`tapped "${found[0].label}" at ${point.x},${point.y}`);

  if (capture.path) await shot(capture.path, { baseline, crop: capture.crop });
}

/**
 * Wait for the tap's result: the press feedback passes, the app's pixels leave
 * the frame the tap started from, then they hold still. False when the pixels
 * never change. The system bars are excluded, because the clock and battery
 * animate on their own and would pass for a tap's result.
 */
async function waitForChange(baseline) {
  await new Promise((resolve) => setTimeout(resolve, PRESS_SETTLE_MS));

  const deadline = Date.now() + CHANGE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (!contentPixels(rawFrame()).equals(baseline)) return waitForStill();
    await new Promise((resolve) => setTimeout(resolve, FRAME_BEAT_MS));
  }

  return false;
}

/** Wait until two frames a beat apart match; false when the screen keeps moving. */
async function waitForStill() {
  const deadline = Date.now() + FRAME_STILL_TIMEOUT_MS;
  let previous = null;

  while (Date.now() < deadline) {
    const current = contentPixels(rawFrame());
    if (previous && current.equals(previous)) return true;
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, FRAME_BEAT_MS));
  }

  return false;
}

/**
 * The app's pixels from a raw `screencap`, without the status and navigation
 * bars. The raw header is width, height, pixel format, and colorspace.
 */
function contentPixels(raw) {
  const width = raw.readUInt32LE(0);
  const height = raw.readUInt32LE(4);
  const top = Math.round(height * CONTENT_TOP);
  const bottom = Math.round(height * (1 - CONTENT_BOTTOM));
  return raw.subarray(RAW_HEADER_BYTES + width * 4 * top, RAW_HEADER_BYTES + width * 4 * bottom);
}

/**
 * The region `--crop` takes: `x,y,w,h`, or the bounds `pnpm device ui` prints.
 */
function parseCrop(value) {
  const bounds = value?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
  if (bounds) {
    const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  const parts = value?.split(",").map(Number);
  if (
    !parts ||
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0) ||
    parts[2] === 0 ||
    parts[3] === 0
  ) {
    throw new Error(`A crop is x,y,w,h or [x1,y1][x2,y2], not "${value ?? ""}". ${SHOT_USAGE}`);
  }

  const [x, y, width, height] = parts;
  return { x, y, width, height };
}

/** Crop a capture with ImageMagick; the region is read off `png:-`. */
function cropImage(image, region, path) {
  try {
    execFileSync(
      "magick",
      [
        "png:-",
        "-crop",
        `${region.width}x${region.height}+${region.x}+${region.y}`,
        "+repage",
        path,
      ],
      { input: image },
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("ImageMagick is missing: run `brew install imagemagick`.");
    }
    if (error.status) {
      throw new Error(`ImageMagick could not crop the capture. Check the region, ${SHOT_USAGE}`);
    }
    throw error;
  }
}

async function shot(path = DEFAULT_SHOT, { baseline, crop } = {}) {
  let image;

  if (baseline) {
    if (await waitForChange(baseline)) {
      image = frame();
    } else {
      console.error(
        "warning: the screen never settled on the tap's result; the capture may be stale or mid-transition.",
      );
      image = frame();
    }
  } else {
    image = frame();
  }

  if (crop) cropImage(image, crop, path);
  else writeFileSync(path, image);

  console.log(path);
}

/** The frame on screen now, as the PNG bytes `screencap` writes. */
function frame() {
  return adb(["exec-out", "screencap", "-p"]);
}

/** The same frame as raw pixels, for comparing without decoding a PNG. */
function rawFrame() {
  return adb(["exec-out", "screencap"]);
}

function state() {
  const activity = adb(["shell", "dumpsys", "activity", "activities"], {
    encoding: "utf8",
  })
    .split("\n")
    .find((line) => line.includes("topResumedActivity"));
  console.log(activity?.trim() ?? "topResumedActivity not found");
  console.log(
    `font_scale ${adb(["shell", "settings", "get", "system", "font_scale"], {
      encoding: "utf8",
    }).trim()}`,
  );
  console.log(adb(["shell", "wm", "density"], { encoding: "utf8" }).trim());
}

/** Physical screen size, cached for directional swipes. */
function screenSize() {
  if (screen) return screen;
  const match = adb(["shell", "wm", "size"], { encoding: "utf8" }).match(/(\d+)x(\d+)/);
  if (!match) throw new Error("Cannot read the screen size.");
  screen = { width: Number(match[1]), height: Number(match[2]) };
  return screen;
}

/** A swipe through the centre of the screen; `fraction` is how far it travels. */
function swipe(direction, fraction = 0.5, duration = 300) {
  const { width, height } = screenSize();
  const amount = Number(fraction);
  const ms = Number(duration);
  if (!(amount > 0 && amount <= 1)) throw new Error("swipe fraction must be between 0 and 1.");
  if (!(ms > 0)) throw new Error("swipe duration must be positive.");

  const x = Math.round(width / 2);
  const y = Math.round(height / 2);
  const dx = Math.round((width * amount) / 2);
  const dy = Math.round((height * amount) / 2);
  const gestures = {
    up: [x, y + dy, x, y - dy],
    down: [x, y - dy, x, y + dy],
    left: [x + dx, y, x - dx, y],
    right: [x - dx, y, x + dx, y],
  };
  const points = gestures[direction];

  if (!points)
    throw new Error("Usage: pnpm device swipe <up|down|left|right> [fraction] [duration]");

  adb(["shell", "input", "swipe", ...points.map(String), String(ms)]);
  console.log(`swiped ${direction} ${Math.round(amount * 100)}%`);
}

/** Type into the focused field. `input text` reads `%s` as a space. */
function typeText(value) {
  if (!value) throw new Error('Usage: pnpm device text "<text>"');
  adb(["shell", "input", "text", value.replaceAll(" ", "%s")]);
  console.log(`typed ${value.length} characters`);
}

function keyEvent(name) {
  if (!name) throw new Error("Usage: pnpm device key <BACK|HOME|ENTER|...>");
  const code = /^\d+$/.test(name) ? name : name.toUpperCase();
  adb(["shell", "input", "keyevent", code]);
  console.log(`sent ${code}`);
}

/** Set the system font scale; the activity relaunches to the Library. */
function setFont(scale) {
  if (!Number.isFinite(Number(scale)) || Number(scale) <= 0) {
    throw new Error("Usage: pnpm device font <scale>");
  }
  adb(["shell", "settings", "put", "system", "font_scale", scale]);
  console.log(`font_scale ${scale}; the activity relaunches to the Library`);
}

function stopApp() {
  adb(["shell", "am", "force-stop", appPackage()]);
}

function startApp() {
  adb(["shell", "monkey", "-p", appPackage(), "-c", "android.intent.category.LAUNCHER", "1"], {
    stdio: "ignore",
  });
}

/** One of the app's files, or null when the file is absent. */
function appFile(path) {
  try {
    return adb(["exec-out", "run-as", appPackage(), "cat", path]);
  } catch {
    return null;
  }
}

function hasAppFile(path) {
  try {
    adb(["shell", "run-as", appPackage(), "ls", path], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function assertSqlite(path) {
  const header = readFileSync(path).subarray(0, 16).toString("binary");
  if (header !== "SQLite format 3\u0000") throw new Error(`${path} is not a SQLite database.`);
}

/**
 * Snapshot the development build's database. The app is stopped first so the
 * WAL is quiet; `-wal` and `-shm` travel with the main file. The app is left
 * running afterwards.
 */
function backupDb(path = DEFAULT_DATABASE_BACKUP) {
  const database = `files/SQLite/${DATABASE}`;
  if (!hasAppFile(database)) throw new Error(`No ${database} on the device.`);

  stopApp();
  for (const suffix of DATABASE_SUFFIXES) {
    const data = appFile(`${database}${suffix}`);
    if (data) writeFileSync(`${path}${suffix}`, data);
  }
  if (!existsSync(path)) throw new Error(`Could not read ${database}.`);
  assertSqlite(path);
  startApp();

  console.log(`backed up ${DATABASE} to ${path} (and its -wal and -shm, when present)`);
}

/**
 * Put a snapshot back. The app is stopped, every remote database file is
 * removed, and only the files the backup actually has are copied back; a
 * missing WAL is better than a WAL from another run.
 */
function restoreDb(path = DEFAULT_DATABASE_BACKUP) {
  if (!existsSync(path)) throw new Error(`No backup at ${path}.`);
  assertSqlite(path);

  const database = `files/SQLite/${DATABASE}`;
  stopApp();

  for (const suffix of DATABASE_SUFFIXES) {
    const remote = `${database}${suffix}`;
    adb(["shell", "run-as", appPackage(), "rm", "-f", remote]);

    const local = `${path}${suffix}`;
    if (!existsSync(local)) continue;

    const staged = `/data/local/tmp/jbdc-restore${suffix}`;
    adb(["push", local, staged], { stdio: "ignore" });
    adb(["shell", "run-as", appPackage(), "cp", staged, remote]);
    adb(["shell", "run-as", appPackage(), "chmod", "600", remote]);
    adb(["shell", "rm", "-f", staged]);
  }

  startApp();
  console.log(`restored ${DATABASE} from ${path}`);
}

/** Read `args` as a label plus `--wait`, `--shot`, and `--crop`. */
function tapOptions(args) {
  let label;
  let wait = 0;
  let shotPath;
  let crop;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--wait" || arg === "--shot" || arg === "--crop") {
      index += 1;
      const value = args[index];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${arg} needs a value. ${TAP_USAGE}`);
      }
      if (arg === "--wait") wait = Math.max(0, Number(value) || 0);
      else if (arg === "--shot") shotPath = value;
      else crop = parseCrop(value);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}". ${TAP_USAGE}`);
    if (label !== undefined) throw new Error(`Unexpected "${arg}". ${TAP_USAGE}`);
    label = arg;
  }

  if (!label) throw new Error(TAP_USAGE);
  if (crop && !shotPath) throw new Error(`--crop needs --shot. ${TAP_USAGE}`);
  return { label, wait, shotPath, crop };
}

/** Read `args` as an optional path plus `--crop`. */
function shotOptions(args) {
  let path;
  let crop;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--crop") {
      index += 1;
      const value = args[index];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`--crop needs a region. ${SHOT_USAGE}`);
      }
      crop = parseCrop(value);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}". ${SHOT_USAGE}`);
    if (path !== undefined) throw new Error(`Unexpected "${arg}". ${SHOT_USAGE}`);
    path = arg;
  }

  return { path, crop };
}

switch (command) {
  case "ui":
    list(args[0]);
    break;
  case "tap": {
    const { label, wait, shotPath, crop } = tapOptions(args);
    await tap(label, wait, { path: shotPath, crop });
    break;
  }
  case "swipe":
    swipe(args[0], args[1], args[2]);
    break;
  case "text":
    typeText(args[0]);
    break;
  case "key":
    keyEvent(args[0]);
    break;
  case "font":
    setFont(args[0]);
    break;
  case "shot": {
    const { path, crop } = shotOptions(args);
    await shot(path, { crop });
    break;
  }
  case "state":
    state();
    break;
  case "db": {
    const [action, path] = args;
    if (action === "backup") backupDb(path);
    else if (action === "restore") restoreDb(path);
    else throw new Error("Usage: pnpm device db <backup|restore> [path]");
    break;
  }
  default:
    console.error("Usage: pnpm device <ui|tap|swipe|text|key|font|shot|state|db> [arguments]");
    process.exit(1);
}
