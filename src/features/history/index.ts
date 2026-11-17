/**
 * History — the append-only Events kept for one Design. It owns the edit diff
 * format (`{ field: { from, to } }`, null meaning empty, plus a `materials` key
 * carrying the Material uses the visit added, removed, or corrected), the one
 * call that records a visit's changes, and the read order. The editable field
 * set and the sections a card groups under are the Design's
 * (`DESIGN_EDITABLE_FIELDS`, `DESIGN_HISTORY_SECTIONS`). History holds no
 * visit state: the Edit screen owns the snapshot (ADR-0004).
 */
export {
  diffDesignFields,
  diffMaterialUses,
  listDesignEvents,
  materialUseLines,
  recordEdit,
} from './lib/events';
export type {
  DesignEditDiff,
  DesignEvent,
  DesignFieldChange,
  MaterialUsesDiff,
  MaterialUseCorrection,
  MaterialUseLine,
  RecordedMaterialUse,
  Visit,
} from './lib/events';
