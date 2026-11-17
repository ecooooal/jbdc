import { CREATIVE_DIRECTION_FIELDS } from './creative-direction-fields';
import { DESIGN_IDENTITY_FIELDS, type DesignEditableField } from './fields';
import { SPECIFICATION_FIELDS } from './specification-fields';

/** One row's definition, as the two field lists declare it. */
export type DesignSectionFieldDefinition =
  | (typeof SPECIFICATION_FIELDS)[number]
  | (typeof CREATIVE_DIRECTION_FIELDS)[number];

/** A field in one of the two long sections Edit and Detail show. */
export type DesignSectionField = DesignSectionFieldDefinition['field'];

/**
 * The two sections, in the order Edit and Detail read them. The tab key, the
 * owner-facing label, and the field list live together so a section is added
 * in one place.
 */
export const DESIGN_SECTIONS = [
  { tab: 'specification', label: 'Specification', fields: SPECIFICATION_FIELDS },
  { tab: 'creativeDirection', label: 'Creative direction', fields: CREATIVE_DIRECTION_FIELDS },
] as const;

export type DesignSectionTab = (typeof DESIGN_SECTIONS)[number]['tab'];

/** Whether a tab primitive's string names one of the sections. */
export function isDesignSectionTab(value: string): value is DesignSectionTab {
  return DESIGN_SECTIONS.some((section) => section.tab === value);
}

/** What one History card groups its lines under. Materials carries uses, not fields. */
export type DesignHistorySection = 'identity' | DesignSectionTab | 'materials';

export type DesignHistorySectionDefinition = {
  section: DesignHistorySection;
  label: string;
  fields: readonly DesignEditableField[];
};

/**
 * The four sections a History card groups its lines under, in reading order.
 * Identity has no tab; the other two take their fields from `DESIGN_SECTIONS`,
 * so a field cannot land in two sections. Materials holds Material use lines
 * rather than fields: uses live in their own table.
 */
export const DESIGN_HISTORY_SECTIONS: readonly DesignHistorySectionDefinition[] = [
  { section: 'identity', label: 'Identity', fields: DESIGN_IDENTITY_FIELDS },
  ...DESIGN_SECTIONS.map(({ tab, label, fields }) => ({
    section: tab,
    label,
    fields: fields.map(({ field }) => field),
  })),
  { section: 'materials', label: 'Materials', fields: [] },
];
