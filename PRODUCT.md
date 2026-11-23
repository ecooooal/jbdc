# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios, android

One shared design language across both platforms; native only.

## Users

The Owner — one independent clothing designer who creates the work and personally runs the creative process of a small fashion business. She uses the app alone: no other users, no accounts, no roles, no customers. Her work today is scattered across her camera roll, notebooks, saved posts, and screenshots, and none of her existing tools are built for her creative lifecycle — inventory tools track stock and e-commerce tools track orders.

## Product Purpose

JBDC is the Owner's private, local-first design catalog (Fashion Design Vault): one record of every clothing design she has documented, from first idea through production or rejection. It preserves not just what a design is, but why it exists, how it evolved, and why it ultimately succeeded or was rejected — so that no creative idea is lost simply because it wasn't produced. Success: months later, the Owner can find a design and understand its complete history, and a rejected design can be revived without retyping it.

## Positioning

Nothing the Owner uses today records intent. JBDC is built for one designer's creative lifecycle: a silent append-only history of what changed and why, a derived Cover so the grid reads like a portfolio with no bookkeeping, rejected designs that stay in the catalog with their reasons, and a whole-catalog export so her work survives the phone. There is no account, no network, and no second user; the app opens directly on the grid.

## Operating Context

Phone-first studio work: sketching, sample photos, fabric choices, and decisions happen on the device, in the moment, often mid-thought. The Owner browses by status first and collection second, or searches by typing part of a word ("crep" finds the crepe piece). Saving is silent — nothing prompts, toasts, or announces; History is a screen she opens when she wants it. The plain-zip export doubles as the cloud-backup path: saved to iCloud Drive or Drive from the share sheet, no backend.

## Capabilities and Constraints

- **Statuses.** Six — Concept, In Development, Approved, Produced, Rejected, Archived — with any transition allowed. Entering Rejected reveals an inline reason field; a blank reason is permitted.
- **Images.** Four kinds — inspiration, sketch, prototype, final — required and mutable (a photo taken as inspiration can become the final shot). The Cover is derived, never marked: the newest image of the highest kind present. Image notes are per-image commentary; they are never Events and die with their image.
- **Materials.** An Owner-managed list so "silk crêpe" is spelled one way across the catalog. A design's Material uses carry the colour and the role (main, secondary, other); colour is free text — searchable, not a filter facet.
- **Taxonomy.** Categories and Collections are Owner-managed, at most one per design, optional, and never required before a design can be created. Deleting either is a soft delete; existing designs keep rendering it.
- **Trash.** Its own destination: excluded from the library, search, and counts, and recoverable until a deliberate purge removes rows, Events, and image files. Archived is unrelated to Trash.
- **History.** Append-only and silent: one event table (status_change, decision, edit, note, image_change); edits coalesce into at most one Event per Visit with a before/after diff; structural image actions record immediately. Rows are never edited or deleted except at purge; a correction is a new Event.
- **Search.** Substring matching over a maintained search column, ordered by recency; status, collection, and material are the filters, text is the refinement. No FTS5.
- **Export and Restore.** Export writes a plaintext zip (`archive.json` + `images/`) wherever the Owner chooses; Restore replaces the entire catalog and shows the destructive counts first. Never a merge (ADR-0002). The JSON shape is a public contract.
- **Security.** No app-level encryption at rest: the OS protects the files, and no copy may claim otherwise (ADR-0001). UUID keys and timestamps everywhere, so a future sync can be added without rewriting foreign keys.
- **Platforms.** Native iOS and Android only, one shared design language across both; web and desktop are out of scope.
- **Out of scope** (recorded so it is not quietly assumed later): dashboard and analytics; Marketing Materials and their links to designs (the first post-MVP addition); accounts, sign-in, sync, and encryption at rest; merge-on-restore; full-text search ranking.

## Brand Commitments

`jbdc` is a placeholder identifier — JB is the person, DC is design catalog; "JBCD" in the PRD's final paragraph is a typo. The app's voice is the Owner's own: frank, first-person, precise, and honest about what the app does and does not protect. No logo or identity assets exist yet.

## Evidence on Hand

- Product intent: `docs/JBDC-PRD.md` — superseded where it conflicts; the tracker wins.
- Vocabulary: `GLOSSARY.md` — the canonical terms; a term not in it is not a term.
- Decisions: `docs/adr/` — ADR-0001 encryption deferred to the OS; ADR-0002 plaintext export, replace-only restore; ADR-0003 one design aggregate; ADR-0004 history holds no session state; ADR-0005 live reads declare watched tables.
- Scope: tracker issue #7 (MVP map) and its sub-issues.
- Visual reference: `docs/mockups/image-mockup-design.html`.
- A working implementation exists: deep-module features under `src/features/` (map in `src/features/README.md`).

Absences future work must not fabricate: no testimonials, no customers, no usage data, no analytics, no press — this is a private single-Owner app with no marketing surface.

## Product Principles

1. **Preserve every design.** A record exists even if the design never reaches production; rejected work stays useful material.
2. **Record intent alongside specs.** Technical fields alone do not preserve why a design exists.
3. **Never block mid-thought.** A name alone is a saved design; nothing interrupts to announce a save.
4. **Corrections are new Events.** The record of what really happened is never rewritten; History reads as work, not keystrokes.
5. **Honesty over comfort.** The app states plainly what it does and does not protect; no copy claims a safety that was not given.
