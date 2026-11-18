/**
 * Designs — the Design record module. It owns the editable field set, name
 * validation, identity and timestamps on create, and the `search_text` every
 * write rebuilds.
 */
export {
  DESIGN_EDITABLE_FIELDS,
  DESIGN_IDENTITY_FIELDS,
  designFieldLabel,
} from './lib/fields';
export type { DesignEditableField } from './lib/fields';
export { DESIGN_SECTIONS, isDesignSectionTab } from './lib/sections';
export type { DesignSectionTab } from './lib/sections';
export { materialUseRoleLabel } from './lib/material-use-role';
export {
  createDesign,
  designDetailRead,
  DESIGN_NAME_MAX_LENGTH,
  designNameProblem,
  getDesign,
  getDesignDetail,
  InvalidDesignNameError,
  InvalidMaterialUseError,
  listDesigns,
  listMaterialUses,
  writeDesign,
} from './lib/records';
export type {
  AddMaterialUseInput,
  CreateDesignInput,
  Design,
  DesignChanges,
  DesignDetail,
  DesignDetailRows,
  DesignFields,
  DesignWriteResult,
  MaterialUse,
  MaterialUseChange,
  MaterialUsesPair,
  UpdateDesignInput,
  UpdateMaterialUseInput,
} from './lib/records';
export { designStatusLabel } from './lib/status';
