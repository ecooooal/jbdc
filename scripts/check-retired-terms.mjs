#!/usr/bin/env node
/**
 * Rename-remainder guard.
 *
 * A rename is finished when every mention moved: the label, the comment beside
 * it, the doc line that describes it. The commit that renames a phrase adds a
 * row below, and this guard fails while a surviving copy of the old wording is
 * still on disk.
 *
 * Each row is the whole phrase, never the word. Density 2 and 4 are still two
 * and four designs per row, so `per row` is not retired — the density-1 wording
 * that named it is.
 *
 * Runs from `pnpm check`, pre-commit, and CI.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A phrase that was renamed, and what the code and docs say instead. */
const RETIRED = [
  {
    phrase: "1 / 2 / 4 per-row",
    replacement: "the density switch, which draws the single view at 1",
  },
  {
    phrase: "chooses 1, 2, or 4 designs per row",
    replacement: "chooses the Library's density",
  },
  {
    phrase: "ImageViewer",
    replacement: "ImageDetail",
  },
  {
    phrase: "useImageViewer",
    replacement: "useImageDetail",
  },
  {
    phrase: "viewer-reducer",
    replacement: "image-detail-reducer",
  },
  {
    phrase: "viewerReducer",
    replacement: "imageDetailReducer",
  },
  {
    phrase: "createInitialViewerState",
    replacement: "createInitialImageDetailState",
  },
  {
    phrase: "ViewerState",
    replacement: "ImageDetailState",
  },
  {
    phrase: "ViewerEvent",
    replacement: "ImageDetailEvent",
  },
  {
    phrase: "ViewerEffect",
    replacement: "ImageDetailEffect",
  },
  {
    phrase: "ViewerResult",
    replacement: "ImageDetailResult",
  },
  {
    phrase: "viewer-closed",
    replacement: "detail-closed",
  },
  {
    phrase: "Image viewer",
    replacement: "Image detail",
  },
  {
    phrase: "Close viewer",
    replacement: "Close image detail",
  },
];

/** Where prose and code are scanned; root-level Markdown is added below. */
const SCAN_DIRS = ["src", "docs", ".impeccable"];
const SCANNED_FILE = /\.(?:ts|tsx|md)$/;

/** The architecture map is a disposable working artifact, never shipped. */
const SKIPPED_DIRS = new Set(["node_modules", "architecture-reviews"]);

function* filesUnder(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;

    const full = join(directory, entry.name);
    if (entry.isDirectory()) yield* filesUnder(full);
    else if (SCANNED_FILE.test(entry.name)) yield full;
  }
}

function* scannedFiles() {
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) yield join(ROOT, entry.name);
  }
  for (const dir of SCAN_DIRS) yield* filesUnder(join(ROOT, dir));
}

function main() {
  const hits = [];

  for (const file of scannedFiles()) {
    const lines = readFileSync(file, "utf8").split("\n");

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      for (const { phrase, replacement } of RETIRED) {
        if (!lower.includes(phrase.toLowerCase())) continue;
        hits.push({ file: relative(ROOT, file), line: index + 1, phrase, replacement });
      }
    });
  }

  if (hits.length > 0) {
    console.error(`Retired phrases still on disk (${hits.length}):\n`);
    for (const { file, line, phrase, replacement } of hits) {
      console.error(`  ${file}:${line}  "${phrase}" -> ${replacement}`);
    }
    console.error("\nMove every mention to the replacement, in the commit that renamed it.");
    process.exit(1);
  }

  console.log(`Retired terms OK (${RETIRED.length} phrases).`);
}

main();
