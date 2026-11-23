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
 *   pnpm device shot /tmp/opencode/screen.png
 *   pnpm device state
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [, , command, ...args] = process.argv;
let attached;

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

function tap(label) {
  const visible = nodes();
  const exact = visible.filter((node) => node.label === label);
  const partial = visible.filter((node) => node.label.includes(label));
  const matches = exact.length > 0 ? exact : partial;

  if (matches.length === 0) {
    console.error(`No label matches "${label}".`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(`"${label}" matches ${matches.length} labels:`);
    for (const node of matches) console.error(`  ${node.label}\t${node.bounds}`);
    process.exit(1);
  }

  const point = center(matches[0].bounds);
  if (!point) {
    console.error(`Cannot read bounds for "${label}": ${matches[0].bounds}`);
    process.exit(1);
  }

  adb(["shell", "input", "tap", String(point.x), String(point.y)]);
  console.log(`tapped "${matches[0].label}" at ${point.x},${point.y}`);
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

switch (command) {
  case "ui":
    list(args[0]);
    break;
  case "tap":
    if (!args[0]) throw new Error('Usage: pnpm device tap "<label>"');
    tap(args[0]);
    break;
  case "shot":
    shot(args[0]);
    break;
  case "state":
    state();
    break;
  default:
    console.error("Usage: pnpm device <ui|tap|shot|state> [argument]");
    process.exit(1);
}
