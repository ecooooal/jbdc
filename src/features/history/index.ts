/**
 * History — the append-only Events kept for one Design. It owns the edit diff
 * format (`{ field: { from, to } }`, null meaning empty), the one call that
 * records a session's changes, and the read order. The editable field set is
 * the Design's (`DESIGN_EDITABLE_FIELDS`); History iterates it. History holds
 * no session state: the Edit screen owns the snapshot (ADR-0004).
 */
export { diffDesignFields, listDesignEvents, recordEdit } from './lib/events';
export type {
  DesignEditDiff,
  DesignEvent,
  DesignFieldChange,
  EditSession,
  MaterialUseChange,
} from './lib/events';
