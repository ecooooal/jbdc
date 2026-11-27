/**
 * History — the append-only Events kept for one Design. It owns the edit diff
 * format (`{ field: { from, to } }`, null meaning empty, plus a `materials` key
 * carrying the Material uses the visit added, removed, or corrected), the
 * sections a card groups its lines under, the one Event→card derivation that
 * turns an Event into a card's labelled lines, the one call that records a
 * visit's changes, and the read order. The editable field set is the Design's
 * (`DESIGN_EDITABLE_FIELDS`). History holds no visit state: the Edit screen
 * owns the snapshot (ADR-0004).
 */
export { listDesignEvents, recordEdit, recordImageChange } from "./lib/events";
export type { DesignEvent } from "./lib/events";
