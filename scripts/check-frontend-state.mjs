#!/usr/bin/env node
/**
 * Frontend-state guard.
 *
 * `docs/FRONTEND_STATE.md` says every screen decision lives in a pure reducer.
 * Two rules are mechanical enough to check here:
 *
 *   - a file keeps at most four `useState` calls;
 *   - at most one `useEffect`/`useLayoutEffect` in a file touches one of that
 *     file's own `useState` setters.
 *
 * Reducer files get one more: no React and no database access, directly or
 * through an import chain. A reducer that imports `./records` has smuggled in
 * drizzle even though the reducer never names it.
 *
 * The script scans `src/features/**` and `src/app/**`, skips tests, and runs in
 * pre-commit and CI beside `check-feature-boundaries.mjs`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const SOURCE_FILE = /\.(?:ts|tsx)$/;
const TEST_FILE = /\.test\.(?:ts|tsx)$/;
const REDUCER_FILE = /-reducer\.tsx?$/;

/** `useState` is the only hook this guard counts; `useReducer` takes over. */
const MAX_USE_STATE_CALLS = 4;
const MAX_EFFECTS_THAT_SET_STATE = 1;

/** Packages a reducer may never reach: React renders, drivers own the database. */
function isForbiddenPackage(specifier) {
  return (
    specifier === 'react' ||
    specifier === 'react-dom' ||
    specifier.startsWith('react-native') ||
    specifier === 'expo-sqlite' ||
    specifier === 'better-sqlite3'
  );
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function scriptPath(path) {
  return toPosix(relative(ROOT, path));
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests') continue;
      yield* sourceFiles(full);
    } else if (SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) {
      yield full;
    }
  }
}

function parse(file) {
  const text = readFileSync(file, 'utf8');

  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

function callName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;

  return null;
}

function moduleSpecifiers(sourceFile) {
  const specifiers = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;

      // `import type { … }` is erased at runtime and cannot reach a driver.
      if (clause?.isTypeOnly) continue;

      const bindings = clause?.namedBindings;
      const hasValueBinding =
        clause?.name !== undefined ||
        (bindings !== undefined &&
          (ts.isNamespaceImport(bindings) ||
            (ts.isNamedImports(bindings) &&
              bindings.elements.some((element) => !element.isTypeOnly))));
      const isSideEffectImport = clause === undefined;

      if ((hasValueBinding || isSideEffectImport) && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifiers.push(statement.moduleSpecifier.text);
      }
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly || !statement.moduleSpecifier) continue;

      const clause = statement.exportClause;
      const hasValueExport =
        clause === undefined ||
        (ts.isNamespaceExport(clause)
          ? true
          : clause.elements.some((element) => !element.isTypeOnly));

      if (hasValueExport && ts.isStringLiteral(statement.moduleSpecifier)) {
        specifiers.push(statement.moduleSpecifier.text);
      }
    }
  }

  return specifiers;
}

function isSourceFile(path) {
  try {
    return statSync(path).isFile() && SOURCE_FILE.test(path);
  } catch {
    return false;
  }
}

function candidatePaths(base) {
  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
}

/** The source file a relative or `@/` specifier names, or null for a package. */
function resolveSourceFile(importer, specifier) {
  let base;

  if (specifier.startsWith('@/')) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(importer), specifier);
  else return null;

  return candidatePaths(base).find(isSourceFile) ?? null;
}

function isDatabaseFile(file) {
  return toPosix(relative(SRC, file)).startsWith('features/database/');
}

function forbiddenDependency(importer, specifier, seen = new Set()) {
  if (isForbiddenPackage(specifier)) return specifier;

  const target = resolveSourceFile(importer, specifier);
  if (!target) return null;
  if (isDatabaseFile(target)) return scriptPath(target);
  if (seen.has(target)) return null;

  seen.add(target);

  for (const next of moduleSpecifiers(parse(target))) {
    const found = forbiddenDependency(target, next, seen);
    if (found) return found;
  }

  return null;
}

function scanStateHooks(sourceFile) {
  let useStateCalls = 0;
  const setters = new Set();
  const effects = [];

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);

      if (name === 'useState') {
        useStateCalls += 1;

        const declaration = node.parent;
        if (ts.isVariableDeclaration(declaration) && ts.isArrayBindingPattern(declaration.name)) {
          const setter = declaration.name.elements[1];
          if (setter && ts.isBindingElement(setter) && ts.isIdentifier(setter.name)) {
            setters.add(setter.name.text);
          }
        }
      }

      if (name === 'useEffect' || name === 'useLayoutEffect') {
        effects.push(node);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  let effectsThatSetState = 0;
  for (const effect of effects) {
    let referencesSetter = false;

    function findSetter(node) {
      if (referencesSetter) return;
      if (ts.isIdentifier(node) && setters.has(node.text)) {
        referencesSetter = true;
        return;
      }

      ts.forEachChild(node, findSetter);
    }

    findSetter(effect);
    if (referencesSetter) effectsThatSetState += 1;
  }

  return { useStateCalls, effectsThatSetState };
}

function violationsFor(file) {
  const sourceFile = parse(file);
  const violations = [];
  const { useStateCalls, effectsThatSetState } = scanStateHooks(sourceFile);

  if (useStateCalls > MAX_USE_STATE_CALLS) {
    violations.push(
      `use-state: ${useStateCalls} useState calls (max ${MAX_USE_STATE_CALLS}); move the surface's decisions into a reducer`
    );
  }

  if (effectsThatSetState > MAX_EFFECTS_THAT_SET_STATE) {
    violations.push(
      `effect-sets-state: ${effectsThatSetState} effects write the file's own state (max ${MAX_EFFECTS_THAT_SET_STATE}); that transition belongs in a reducer`
    );
  }

  if (REDUCER_FILE.test(file)) {
    for (const specifier of moduleSpecifiers(sourceFile)) {
      const target = forbiddenDependency(file, specifier);
      if (target) {
        violations.push(
          `reducer-purity: imports ${specifier}, which reaches ${target}; reducers hold no React and no database access`
        );
      }
    }
  }

  return violations;
}

function main() {
  const violations = [];

  for (const file of sourceFiles(SRC)) {
    for (const violation of violationsFor(file)) {
      violations.push(`${scriptPath(file)}: ${violation}`);
    }
  }

  if (violations.length > 0) {
    console.error(`Frontend state violations (${violations.length}):\n`);
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }

  console.log('Frontend state OK.');
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) main();
