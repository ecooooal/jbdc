/**
 * Taxonomy — the owner-managed list of Categories and Collections. It owns
 * name trimming and the optional Collection year; screens only pick from it.
 */
export {
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  listCategories,
  readTaxonomyNames,
  readTaxonomyNamesFrom,
  TAXONOMY_NAME_MAX_LENGTH,
  taxonomyLabel,
} from "./lib/records";
export type { TaxonomyNames } from "./lib/records";
