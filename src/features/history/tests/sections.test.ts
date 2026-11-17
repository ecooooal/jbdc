import { DESIGN_EDITABLE_FIELDS, DESIGN_SECTIONS } from '@/features/designs';
import { DESIGN_HISTORY_SECTIONS } from '../lib/sections';

function sectionFields(section: string) {
  return DESIGN_HISTORY_SECTIONS.find((entry) => entry.section === section)?.fields;
}

describe('DESIGN_HISTORY_SECTIONS', () => {
  test('Identity groups Name, Description, Category, and Collection', () => {
    expect(sectionFields('identity')).toEqual([
      'name',
      'description',
      'categoryId',
      'collectionId',
    ]);
  });

  test('Specification groups the fields its tab holds', () => {
    expect(sectionFields('specification')).toEqual(
      DESIGN_SECTIONS[0].fields.map(({ field }) => field)
    );
  });

  test('Creative direction groups the fields its tab holds', () => {
    expect(sectionFields('creativeDirection')).toEqual(
      DESIGN_SECTIONS[1].fields.map(({ field }) => field)
    );
  });

  test('Materials holds Material use lines, not fields', () => {
    expect(sectionFields('materials')).toEqual([]);
  });

  test('every editable field lands in exactly one section', () => {
    const grouped = DESIGN_HISTORY_SECTIONS.flatMap(({ fields }) => fields);

    expect([...grouped].sort()).toEqual([...DESIGN_EDITABLE_FIELDS].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});
