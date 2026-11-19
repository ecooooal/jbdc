#!/usr/bin/env node
/**
 * Test-size guard.
 *
 * A test file is a navigation unit: an agent working one concern opens it
 * whole. `docs/FRONTEND_STATE.md` caps it at 600 lines so no single test file
 * can grow back into a session's largest context spend.
 *
 * Runs from `pnpm check`, pre-commit, and CI.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const TEST_FILE = /\.test\.(?:ts|tsx)$/;
const MAX_TEST_LINES = 600;

function toPosix(path) {
  return path.split(sep).join('/');
}

function* testFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

    const full = join(directory, entry.name);
    if (entry.isDirectory()) yield* testFiles(full);
    else if (TEST_FILE.test(entry.name)) yield full;
  }
}

function lineCount(file) {
  const text = readFileSync(file, 'utf8');

  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

function main() {
  const oversized = [];

  for (const file of testFiles(SRC)) {
    const lines = lineCount(file);
    if (lines > MAX_TEST_LINES) oversized.push({ file: toPosix(relative(ROOT, file)), lines });
  }

  if (oversized.length > 0) {
    console.error(`Test files over ${MAX_TEST_LINES} lines (${oversized.length}):\n`);
    for (const { file, lines } of oversized) console.error(`  ${file}: ${lines} lines`);
    console.error('\nSplit the file by concern into siblings that share one fixtures module.');
    process.exit(1);
  }

  console.log(`Test sizes OK (limit ${MAX_TEST_LINES} lines).`);
}

main();
