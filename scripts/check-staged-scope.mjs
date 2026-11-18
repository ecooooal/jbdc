#!/usr/bin/env node
/**
 * Staged-scope guard.
 *
 * Steering and tooling config is not ticket code: `AGENTS.md`, `CLAUDE.md`,
 * `.opencode/**` and `.agents/**` travel alone. A commit that stages them
 * beside anything else is almost always a broad `git add`, and it leaks the
 * user's own edits into a ticket commit. Runs first in pre-commit, so it fails
 * in a moment rather than after `pnpm check`.
 *
 * A genuine mixed commit can set `ALLOW_MIXED_STEERING=1`.
 */
import { execFileSync } from 'node:child_process';

const STEERING = [/^AGENTS\.md$/, /^CLAUDE\.md$/, /^\.opencode\//, /^\.agents\//];

const isSteering = (path) => STEERING.some((pattern) => pattern.test(path));

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const steering = staged.filter(isSteering);
const other = staged.filter((path) => !isSteering(path));

if (steering.length > 0 && other.length > 0 && process.env.ALLOW_MIXED_STEERING !== '1') {
  console.error('Steering and tooling config travels alone. This commit stages:');
  for (const path of steering) console.error(`  steering: ${path}`);
  for (const path of other) console.error(`  other:    ${path}`);
  console.error('\nUnstage one side, or set ALLOW_MIXED_STEERING=1 for a genuine mixed commit.');
  process.exit(1);
}
