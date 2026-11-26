/**
 * The seven Creative direction fields, in the order Edit and Detail read them.
 * Each entry carries the label the owner sees and the example its editor uses
 * as a placeholder. Description says what the design is; Concept says what it
 * is trying to do.
 *
 * The module has no runtime import, so the reducer and the screens can both
 * read it without reaching the database.
 */
export const CREATIVE_DIRECTION_FIELDS = [
  {
    field: "concept",
    label: "Concept",
    placeholder: "What the design is trying to do",
    multiline: true,
  },
  {
    field: "mood",
    label: "Mood",
    placeholder: "Intended atmosphere or emotion",
    multiline: false,
  },
  {
    field: "inspiration",
    label: "Inspiration",
    placeholder: "What inspired the design",
    multiline: true,
  },
  {
    field: "intendedFeeling",
    label: "Intended feeling",
    placeholder: "How the clothing should make someone feel",
    multiline: true,
  },
  {
    field: "audience",
    label: "Audience",
    placeholder: "Who the design is for",
    multiline: false,
  },
  {
    field: "styling",
    label: "Styling",
    placeholder: "Suggested accessories and styling",
    multiline: true,
  },
  {
    field: "palette",
    label: "Palette",
    placeholder: "Intended colour combinations",
    multiline: false,
  },
] as const;

export type CreativeDirectionField = (typeof CREATIVE_DIRECTION_FIELDS)[number]["field"];
