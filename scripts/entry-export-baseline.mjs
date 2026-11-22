/**
 * Entry exports that predate `check-entry-exports.mjs`.
 *
 * The rule — an entry point exports only what another package imports — landed
 * in CODING_STANDARDS.md after these packages had already broken it. The check
 * records that debt once so it can gate every new export; the list only
 * shrinks, by deleting a name as its package is cleaned. A name listed here
 * that is no longer unused is ignored.
 */
export const baseline = {
  "src/features/database/expo.ts": [
    "DATABASE_NAME",
    "openAppDatabase",
    "openAppDatabaseWithLiveReads",
  ],
  "src/features/database/index.ts": ["DESIGN_EVENT_KINDS"],
  "src/features/database/react.tsx": ["LiveReadResult", "LiveReadStatus"],
  "src/features/library/index.ts": [
    "DEFAULT_LIBRARY_STATUSES",
    "LIBRARY_GRID_GAP",
    "LibraryDesign",
    "LibraryRows",
    "libraryDesignsRead",
    "libraryGrid",
  ],
  "src/features/library/react.ts": ["LibraryCard", "LibraryDesigns", "useLibraryDesigns"],
  "src/features/materials/index.ts": [
    "CreateMaterialInput",
    "MaterialsRows",
    "listMaterials",
    "materialsRead",
    "readMaterialNames",
  ],
  "src/features/materials/react.ts": ["Materials"],
  "src/features/settings/index.ts": ["DEFAULT_CARD_DENSITY", "Settings", "createSettings"],
  "src/features/taxonomy/index.ts": [
    "COLLECTION_YEAR_MAX",
    "COLLECTION_YEAR_MIN",
    "Category",
    "Collection",
    "CreateCategoryInput",
    "CreateCollectionInput",
    "TaxonomyRows",
    "listCollections",
    "taxonomyRead",
  ],
  "src/features/taxonomy/react.ts": ["Taxonomy"],
};
