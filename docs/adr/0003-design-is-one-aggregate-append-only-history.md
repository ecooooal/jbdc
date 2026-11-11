# A Design is one aggregate, and its history is append-only

The PRD proposes nine tables, three of which (`designs`, `specifications`, `creative_directions`) are 1:1 and always read together. v1 collapses them into a single `designs` row and keeps a separate append-only `design_events` table (`status_change` | `decision` | `edit` | `note`) instead of the PRD's `design_revisions` and `design_decisions`. Only Category, Collection, Image, Material, and Event are separate tables. Material is separate because it repeats: a design uses several fabrics, where the rest of the specification is singular. Rationale: one atomic write per save, and search over "materials + mood + collection" becomes one column instead of three joins — which is exactly the PRD's own search requirement. Events merge too because changing status to Rejected *is* recording a reason; two tables would make the owner write the same thing twice.

## Consequences

- Sectioned forms are a UI concern only; they do not imply separate storage.
- Automatic edits are one event per editing session carrying a field diff, recorded silently. Nothing prompts, nothing announces a save — the owner opens a History screen when they want to know what changed.
- Because events are immutable, §8's "changes should not silently overwrite historical decision records" is satisfied structurally.
- Soft delete on designs doubles as a sync tombstone, so UUID primary keys plus `updated_at` make a future sync addable without rewriting foreign keys. Tombstones were not built; they fall out of deletion.
- The event diff is the only protection against overwriting a field: soft delete covers deletion, nothing else covers a destructive edit.
- **Six statuses, not the PRD's seven.** §4.6's Prototype status is cut: a physical sample can exist while the design is still In Development, so the two facts cannot share one value, and alternating between them writes churn into the History. Samples are recorded as `prototype` images. This is a deliberate deviation from the PRD, not an omission.
