/**
 * Designs — the Design record module. It owns the editable field set, name
 * validation, identity and timestamps on create, the `search_text` every
 * edit rebuilds, the Status move and the Events a rejection and a later
 * decision record, and the one Status label rule.
 */
export { DESIGN_EDITABLE_FIELDS, DESIGN_IDENTITY_FIELDS, designFieldLabel } from "./lib/fields";
export type { DesignEditableField } from "./lib/fields";
export { DESIGN_SECTIONS } from "./lib/sections";
export type { DesignSectionTab } from "./lib/sections";
export { createDesign, getDesign, writeDesign } from "./lib/records";
export type { DesignFields, MaterialUse, MaterialUsesPair } from "./lib/records";
export { designStatusLabel } from "./lib/status";
export { changeStatus, recordDecision } from "./lib/status-writes";
