/**
 * Designs — the Design record module. It owns name validation, identity and
 * timestamps on create, and the `search_text` every write rebuilds.
 */
export {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  getDesign,
  InvalidDesignNameError,
  listDesigns,
} from './lib/records';
export type { CreateDesignInput, Design } from './lib/records';
export { designStatusLabel } from './lib/status';
