/**
 * The seven Specification fields, in the order Edit and Detail read them. Each
 * entry carries the label the owner sees and the PRD wording its editor uses
 * as a placeholder. Measurements is one multiline field, not a per-size table:
 * the design is one aggregate and a visit is one diff.
 *
 * The module has no runtime import, so the reducer and the screens can both
 * read it without reaching the database.
 */
export const SPECIFICATION_FIELDS = [
  {
    field: "silhouette",
    label: "Silhouette",
    placeholder: "Overall clothing shape",
    multiline: false,
  },
  {
    field: "neckline",
    label: "Neckline",
    placeholder: "Neckline design",
    multiline: false,
  },
  {
    field: "sleeveType",
    label: "Sleeve type",
    placeholder: "Sleeve construction",
    multiline: false,
  },
  {
    field: "garmentDetails",
    label: "Garment details",
    placeholder: "Pockets, buttons, zippers, pleats, etc.",
    multiline: true,
  },
  {
    field: "sizeRange",
    label: "Size range",
    placeholder: "Intended size range",
    multiline: false,
  },
  {
    field: "measurements",
    label: "Measurements",
    placeholder: "Relevant clothing measurements",
    multiline: true,
  },
  {
    field: "constructionNotes",
    label: "Construction notes",
    placeholder: "Additional production or sewing notes",
    multiline: true,
  },
] as const;

export type SpecificationField = (typeof SPECIFICATION_FIELDS)[number]["field"];
