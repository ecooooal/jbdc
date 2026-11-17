# The Design history module holds no session state

Issue #15 (and #8 before it) says the Design history module snapshots the editable fields when Edit opens and diffs them on close. Taken literally, that puts a live snapshot inside a module: module-global mutable state that survives across screens, cannot be reset between tests without a test-only hook, and contradicts "State lives in reducers" in `CODING_STANDARDS.md`. The module is pure instead: `diffDesignFields(before, after)` and `appendEditEvent(db, designId, diff)` each do one transformation, and the **Edit screen holds the snapshot** for the lifetime it already owns, committing on unmount, navigation away, or `AppState` background. The coalescing contract is unchanged and still the module's: one `edit` Event per session, none when nothing changed. Only the snapshot's home moved.

## Consequences

- `diffDesignFields` is a pure function, so coalescing, null-as-empty, and no-change are tested without a screen or a database.
- A hard process kill loses the Event while keeping the field edits, as #15 accepts. Nothing in the module can recover a snapshot the screen did not survive, and nothing pretends to.
- Any future screen that edits a Design must hold its own snapshot; the module will not remember one for it.
- If a second editing surface appears, the snapshot lifecycle becomes a real seam. That is the point to introduce an adapter, not before.

## Amendment

`appendEditEvent(db, designId, diff)` is now internal to `recordEdit(db, designId, before, after)`: the module still performs the same two pure transformations behind one call, and `diffDesignFields` stays exported and pure. The decision is unchanged; only the entry point moved, so a caller can no longer write an Event without a diff to justify it.

The snapshot then moved from a ref in the component to `editDesignReducer`'s state (`sessionStart`), which is still the Edit surface's own state rather than the History module's. The boundary is now the visit, not the app's foreground state: leaving the app flushes a draft but records nothing, and the visit's one Event is written when the screen closes.

The entry point now takes the visit's changes as one object, `recordEdit(db, designId, { before, after, materialUses }, now)`, where `materialUses` is the visit's `{ before, after }` pair of Material uses. The module diffs that pair into the diff's `materials` key — the uses the visit added, removed, and corrected — so every Material use the visit touched travels in the same Event as the fields it changed (#27, #29). The pair arrives whole, so a caller cannot pass one side and have every use recorded as added or removed by omission. The module still holds no snapshot and still performs one diff per visit.

Whether a visit changed anything is now decided here and nowhere else. The visit used to test the row and its uses for change before declaring an Event, so Edit kept a second rule for emptiness beside the diff that stores it; a difference between the two decided whether an Event existed at all. The visit now always hands over both pairs — the close declares the Event whether or not the row moved — and `recordEdit` returns null when its diff is empty. The rule that decides "nothing changed" and the diff that is written are the same code.

The code now uses the word the docs already used. The snapshot state, the close event, and the effect that records it are `visitStart`, `visit-closed`, and `record-visit`, and the entry point takes a `Visit`. The Material uses arrive as a `MaterialUsesPair` — before and after, one value. The stored JSON keys (`materials`, `added`, `removed`, `changed`) did not move, because ADR-0002 makes them a public contract.
