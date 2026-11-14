# The Design history module holds no session state

Issue #15 (and #8 before it) says the Design history module snapshots the editable fields when Edit opens and diffs them on close. Taken literally, that puts a live snapshot inside a module: module-global mutable state that survives across screens, cannot be reset between tests without a test-only hook, and contradicts "State lives in reducers" in `CODING_STANDARDS.md`. The module is pure instead: `diffDesignFields(before, after)` and `appendEditEvent(db, designId, diff)` each do one transformation, and the **Edit screen holds the snapshot** for the lifetime it already owns, committing on unmount, navigation away, or `AppState` background. The coalescing contract is unchanged and still the module's: one `edit` Event per session, none when nothing changed. Only the snapshot's home moved.

## Consequences

- `diffDesignFields` is a pure function, so coalescing, null-as-empty, and no-change are tested without a screen or a database.
- A hard process kill loses the Event while keeping the field edits, as #15 accepts. Nothing in the module can recover a snapshot the screen did not survive, and nothing pretends to.
- Any future screen that edits a Design must hold its own snapshot; the module will not remember one for it.
- If a second editing surface appears, the snapshot lifecycle becomes a real seam. That is the point to introduce an adapter, not before.
