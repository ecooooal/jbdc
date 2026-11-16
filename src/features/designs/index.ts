/**
 * Designs — the Design record module. It owns the editable field set, name
 * validation, identity and timestamps on create, and the `search_text` every
 * write rebuilds.
 */
export {
  createDesign,
  DESIGN_EDITABLE_FIELDS,
  DESIGN_NAME_MAX_LENGTH,
  designNameProblem,
  getDesign,
  getDesignDetail,
  InvalidDesignNameError,
  listDesigns,
  updateDesign,
} from './lib/records';
export type {
  CreateDesignInput,
  Design,
  DesignDetail,
  DesignEditableField,
  DesignFields,
  UpdateDesignInput,
} from './lib/records';
export { designStatusLabel } from './lib/status';
