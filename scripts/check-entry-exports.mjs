#!/usr/bin/env node
/**
 * Entry-point export check.
 *
 * `CODING_STANDARDS.md`: an entry point exports only what another package
 * imports. A name only the package's own tree uses belongs in `lib/`, where it
 * cannot enter the contract by accident.
 *
 * Every specifier is resolved to a path, so `@/features/images`, a relative
 * walk, and `@/features/images/react` all reach the entry they name. An import
 * from inside the owning package is not a consumer: the test is whether some
 * file outside it imports the name.
 *
 * Run in pre-commit and CI. Names come from the TypeScript parser, so
 * `export … from`, `export type`, aliases, and `export *` all resolve.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { baseline } from "./entry-export-baseline.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

const SOURCE_FILE = /\.(?:ts|tsx)$/;
// `index.ts`, `react.ts|tsx`, `testing.ts`, `expo.ts` are a package's entries.
const ENTRY_FILE = /^(?:index|react|testing|expo)\.tsx?$/;

function toPosix(path) {
  return path.split(sep).join("/");
}

function fileAt(path) {
  try {
    return statSync(path).isFile() ? path : null;
  } catch {
    return null;
  }
}

/** Absolute path of the module a relative or `@/` specifier names; null otherwise. */
function resolveModule(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = resolve(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;

  return (
    fileAt(base) ??
    fileAt(`${base}.ts`) ??
    fileAt(`${base}.tsx`) ??
    fileAt(join(base, "index.ts")) ??
    fileAt(join(base, "index.tsx"))
  );
}

/** The feature package a repo-relative path belongs to, or null. */
function packageOf(pathRel) {
  const match = /^src\/features\/([^/]+)\//.exec(pathRel);
  return match ? match[1] : null;
}

function parse(path) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
}

function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

/**
 * Every name an entry file exports, in source order. Star re-exports are
 * expanded through the target file so a moved name is still checked.
 */
function exportsOf(entry, seen = new Set()) {
  if (seen.has(entry)) return [];
  seen.add(entry);

  const source = parse(entry);
  const exported = [];
  const push = (name, node) => exported.push({ name, line: lineOf(source, node) });

  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;

      if (statement.moduleSpecifier) {
        const target = resolveModule(entry, statement.moduleSpecifier.text);
        if (!target) continue;

        if (clause && ts.isNamedExports(clause)) {
          for (const element of clause.elements) push(element.name.text, element);
        } else if (clause && ts.isNamespaceExport(clause)) {
          push(clause.name.text, clause);
        } else {
          exported.push(...exportsOf(target, seen));
        }
        continue;
      }

      if (clause && ts.isNamedExports(clause)) {
        for (const element of clause.elements) push(element.name.text, element);
      }
      continue;
    }

    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      push("default", statement);
      continue;
    }

    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;

    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
      push("default", statement);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) push(declaration.name.text, declaration);
      }
      continue;
    }

    if ("name" in statement && statement.name && ts.isIdentifier(statement.name)) {
      push(statement.name.text, statement.name);
    }
  }

  return exported;
}

/** Names a statement takes from `entry`, or `"*"` when it takes the whole module. */
function importedNames(statement) {
  const names = [];

  if (ts.isImportDeclaration(statement) && statement.importClause) {
    const clause = statement.importClause;
    if (clause.name) names.push("default");
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.push("*");
    else if (clause.namedBindings) {
      for (const element of clause.namedBindings.elements) {
        names.push((element.propertyName ?? element.name).text);
      }
    }
    return names;
  }

  if (ts.isExportDeclaration(statement)) {
    const clause = statement.exportClause;
    if (clause && ts.isNamedExports(clause)) {
      for (const element of clause.elements) {
        names.push((element.propertyName ?? element.name).text);
      }
    } else if (clause && ts.isNamespaceExport(clause)) names.push("*");
    else names.push("*");
  }

  return names;
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const full = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (SOURCE_FILE.test(entry.name)) yield full;
  }
}

export function collectViolations() {
  /** repo-relative entry path → exported names. */
  const entries = new Map();
  /** repo-relative entry path → names another package imports. */
  const consumed = new Map();

  for (const packageDirectory of readdirSync(join(SRC, "features"), { withFileTypes: true })) {
    if (!packageDirectory.isDirectory()) continue;

    for (const file of readdirSync(join(SRC, "features", packageDirectory.name))) {
      if (!ENTRY_FILE.test(file)) continue;

      const path = join(SRC, "features", packageDirectory.name, file);
      const pathRel = toPosix(relative(ROOT, path));
      entries.set(pathRel, exportsOf(path));
      consumed.set(pathRel, new Set());
    }
  }

  for (const file of sourceFiles(SRC)) {
    const importerRel = toPosix(relative(ROOT, file));

    for (const statement of parse(file).statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;

      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;

      const target = resolveModule(file, specifier.text);
      if (!target) continue;

      const targetRel = toPosix(relative(ROOT, target));
      if (!entries.has(targetRel)) continue;
      if (packageOf(importerRel) === packageOf(targetRel)) continue;

      for (const name of importedNames(statement)) consumed.get(targetRel).add(name);
    }
  }

  const violations = [];

  for (const [entry, exported] of entries) {
    const used = consumed.get(entry);
    if (used.has("*")) continue;

    for (const { name, line } of exported) {
      if (used.has(name)) continue;
      violations.push({
        entry,
        name,
        message: `${entry}:${line}  \`${name}\` is not imported by any file outside ${dirname(entry)}; keep it in lib/`,
      });
    }
  }

  return violations;
}

function main() {
  const violations = collectViolations();
  const allowed = (entry, name) => baseline[entry]?.includes(name) ?? false;
  const fresh = violations.filter(({ entry, name }) => !allowed(entry, name));

  if (fresh.length > 0) {
    console.error(`Entry-point export violations (${fresh.length}):\n`);
    for (const { message } of fresh) console.error(`  ${message}`);
    console.error(
      "\nA new export belongs in lib/ until another package imports it. A pre-existing one\n" +
        "goes in scripts/entry-export-baseline.mjs only because the check arrived late.",
    );
    process.exit(1);
  }

  const baselined = violations.length;
  console.log(
    `Entry-point exports OK.${baselined > 0 ? ` ${baselined} pre-existing still unused.` : ""}`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) main();
