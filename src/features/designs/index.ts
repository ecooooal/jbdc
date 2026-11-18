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
  addMaterialUse,
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
  removeMaterialUse,
  updateDesign,
  updateMaterialUse,
} from './lib/records';
export type {
  AddMaterialUseInput,
  CreateDesignInput,
  Design,
  DesignDetail,
  DesignDetailRows,
  DesignFields,
  MaterialUse,
  MaterialUsesPair,
  UpdateDesignInput,
  UpdateMaterialUseInput,
} from './lib/records';
export { designStatusLabel } from './lib/status';
