#!/usr/bin/env node
/**
 * Feature-boundary check.
 *
 * `no-restricted-imports` matches the raw specifier, so an alias import
 * (`@/features/designs/lib/records`) is caught but a relative one that walks
 * into the same place (`../../designs/lib/records`) is not. This script
 * resolves every import to a path and enforces the boundaries there.
 *
 * Run in pre-commit and CI. ESLint still covers the alias and bare specifiers
 * for in-editor feedback.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const SOURCE_FILE = /\.(?:ts|tsx)$/;
// `import x from`, `export … from`, side-effect `import '…'`, `import('…')`,
// and `require('…')` all end in a quoted specifier.
const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

function toPosix(path) {
  return path.split(sep).join("/");
}

/** Absolute path for a relative or `@/` specifier; null for a bare package. */
function resolveSpecifier(importer, specifier) {
  if (specifier.startsWith("@/")) return resolve(SRC, specifier.slice(2));
  if (specifier.startsWith(".")) return resolve(dirname(importer), specifier);
  return null;
}

/**
 * The boundary rule a resolved import breaks, or null. Takes repo-relative,
 * posix paths so it can be exercised without touching the filesystem.
 */
export function boundaryViolation(importerRel, targetRel) {
  if (!importerRel.startsWith("src/")) return null;

  const segments = targetRel.split("/");

  // `src/features/<owner>/(lib|tests)/…` is private to <owner>.
  if (segments[0] === "src" && segments[1] === "features" && segments.length >= 4) {
    const owner = segments[2];
    const isPrivate = segments[3] === "lib" || segments[3] === "tests";
    const isOwnedByImporter = importerRel.startsWith(`src/features/${owner}/`);

    if (isPrivate && !isOwnedByImporter) {
      return `imports ${targetRel}; import the feature package entry point, not its lib/ or tests/`;
    }
  }

  // `src/app` is routing only: no shared UI, no feature components.
  if (importerRel.startsWith("src/app/")) {
    const isFeatureComponent =
      segments[0] === "src" &&
      segments[1] === "features" &&
      segments.length >= 4 &&
      segments[3] === "components";
    const isSharedComponent = targetRel.startsWith("src/shared/components/");

    if (isFeatureComponent || isSharedComponent) {
      return `imports ${targetRel}; src/app is routing only — render the screen from a feature entry point, and put UI in features/<feature>/components`;
    }
  }

  return null;
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const full = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (SOURCE_FILE.test(entry.name)) yield full;
  }
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function main() {
  const violations = [];

  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    const importerRel = toPosix(relative(ROOT, file));

    for (const match of text.matchAll(IMPORT_SPECIFIER)) {
      const target = resolveSpecifier(file, match[1]);
      if (!target) continue;

      const targetRel = toPosix(relative(ROOT, target));
      const violation = boundaryViolation(importerRel, targetRel);

      if (violation) {
        violations.push(`${importerRel}:${lineAt(text, match.index)}  ${violation}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Feature boundary violations (${violations.length}):\n`);
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }

  console.log("Feature boundaries OK.");
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) main();
