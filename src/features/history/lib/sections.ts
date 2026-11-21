import {
  DESIGN_IDENTITY_FIELDS,
  DESIGN_SECTIONS,
  type DesignEditableField,
  type DesignSectionTab,
} from "@/features/designs";

/**
 * What one History card groups its lines under. Materials carries uses and
 * Images carries image-change lines; neither holds editable fields.
 */
export type DesignHistorySection = "identity" | DesignSectionTab | "materials" | "images";

export type DesignHistorySectionDefinition = {
  section: DesignHistorySection;
  label: string;
  fields: readonly DesignEditableField[];
};

/** The Images section: it carries image-change lines rather than fields. */
export const HISTORY_IMAGES_SECTION: DesignHistorySectionDefinition = {
  section: "images",
  label: "Images",
  fields: [],
};

/**
 * The five sections a History card groups its lines under, in reading order.
 * Identity has no tab on the Design; the other two take their fields from the
 * Design's `DESIGN_SECTIONS`, so a field cannot land in two sections. Materials
 * holds Material use lines rather than fields: uses live in their own table.
 * Images holds image-change lines rather than fields: an Image action writes its
 * own Event, not a visit diff.
 */
export const DESIGN_HISTORY_SECTIONS: readonly DesignHistorySectionDefinition[] = [
  { section: "identity", label: "Identity", fields: DESIGN_IDENTITY_FIELDS },
  ...DESIGN_SECTIONS.map(({ tab, label, fields }) => ({
    section: tab,
    label,
    fields: fields.map(({ field }) => field),
  })),
  { section: "materials", label: "Materials", fields: [] },
  HISTORY_IMAGES_SECTION,
];
