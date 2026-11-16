/**
 * Taxonomy — the owner-managed list of Categories and Collections. It owns
 * name trimming and the optional Collection year; screens only pick from it.
 */
export {
  COLLECTION_YEAR_MAX,
  COLLECTION_YEAR_MIN,
  createCategory,
  createCollection,
  InvalidCollectionYearError,
  InvalidTaxonomyNameError,
  listCategories,
  listCollections,
  readTaxonomyNames,
  TAXONOMY_NAME_MAX_LENGTH,
  taxonomyLabel,
} from './lib/records';
export type {
  Category,
  Collection,
  CreateCategoryInput,
  CreateCollectionInput,
  TaxonomyNames,
} from './lib/records';
