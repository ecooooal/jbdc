/**
 * History — the append-only Events kept for one Design. It owns the edit diff
 * format (`{ field: { from, to } }`, null meaning empty) and the read order.
 * It holds no session state: the Edit screen owns the snapshot (ADR-0004).
 */
export {
  appendEditEvent,
  diffDesignFields,
  listDesignEvents,
} from './lib/events';
export type {
  DesignEditDiff,
  DesignEditableField,
  DesignEvent,
  DesignFieldChange,
  DesignFieldValues,
} from './lib/events';
