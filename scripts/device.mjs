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
 *   pnpm device swipe up 0.4
 *   pnpm device text "Revisit the seam"
 *   pnpm device key BACK
 *   pnpm device font 2.0
 *   pnpm device shot /tmp/opencode/screen.png
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
    const flags = node.clickable ? "\ttap" : "";
    console.log(`${node.label}\t${node.className}\t${node.bounds}${flags}`);
  }
  if (visible.length === 0) console.error(`No label matches "${filter}".`);
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
 * that is still animating gets time to expose its labels before the tap.
 */
async function tap(label, waitMs = 0) {
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

  adb(["shell", "input", "tap", String(point.x), String(point.y)]);
  console.log(`tapped "${found[0].label}" at ${point.x},${point.y}`);
}

function shot(path = "/tmp/opencode/screen.png") {
  writeFileSync(path, adb(["exec-out", "screencap", "-p"]));
  console.log(path);
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

switch (command) {
  case "ui":
    list(args[0]);
    break;
  case "tap": {
    const waitIndex = args.indexOf("--wait");
    if (!args[0] || args[0].startsWith("--")) {
      throw new Error('Usage: pnpm device tap "<label>" [--wait <ms>]');
    }
    const wait = Number(args[waitIndex + 1] ?? 0);
    await tap(args[0], Number.isFinite(wait) ? Math.max(0, wait) : 0);
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
  case "shot":
    shot(args[0]);
    break;
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
