import { CREATIVE_DIRECTION_FIELDS } from './creative-direction-fields';
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
