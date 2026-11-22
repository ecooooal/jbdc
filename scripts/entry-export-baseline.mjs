/**
 * Entry exports that predate `check-entry-exports.mjs`.
 *
 * The rule — an entry point exports only what another package imports — landed
 * in CODING_STANDARDS.md after these packages had already broken it. The check
 * records that debt once so it can gate every new export; the list only
 * shrinks, by deleting a name as its package is cleaned. It is empty now: every
 * entry point tells the truth.
 */
export const baseline = {};
