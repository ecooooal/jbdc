/**
 * Designs — the Design record module. It owns the editable field set, name
 * validation, identity and timestamps on create, and the `search_text` every
 * write rebuilds.
 */
export { DESIGN_EDITABLE_FIELDS, designFieldLabel } from './lib/fields';
export type { DesignEditableField } from './lib/fields';
export {
  addMaterialUse,
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  designNameProblem,
  getDesign,
  getDesignDetail,
  InvalidDesignNameError,
  InvalidMaterialUseError,
  listDesigns,
  listMaterialUses,
  updateDesign,
} from './lib/records';
export type {
  AddMaterialUseInput,
  CreateDesignInput,
  Design,
  DesignDetail,
  DesignFields,
  MaterialUse,
  UpdateDesignInput,
} from './lib/records';
export { designStatusLabel } from './lib/status';
