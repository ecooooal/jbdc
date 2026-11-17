import { writeOutcome, type EditDesignEffect } from '../lib/edit-design-reducer';
import { EMPTY_DESIGN_FIELDS } from '../lib/fields';
import type { DesignFields, MaterialUse } from '../lib/records';

const DESIGN_ID = 'design-silk-slip';
const NOW = 1_700_000_000_000;

const STORED: DesignFields = { ...EMPTY_DESIGN_FIELDS, name: 'Wool coat' };

const WOOL_USE: MaterialUse = {
  id: 'use-wool',
  designId: DESIGN_ID,
  materialId: 'material-wool',
  materialName: 'Wool',
  colour: 'Charcoal',
  role: 'main',
  createdAt: NOW,
};

type DraftsWrite = Extract<EditDesignEffect, { type: 'write-drafts' }>;
type MaterialUseWrite = Extract<EditDesignEffect, { type: 'write-material-use' }>;
type RemovalWrite = Extract<EditDesignEffect, { type: 'remove-material-use' }>;

const DRAFTS: DraftsWrite = {
  type: 'write-drafts',
  designId: DESIGN_ID,
  patch: { name: 'Wool coat' },
  now: NOW,
};

const MATERIAL_USE: MaterialUseWrite = {
  type: 'write-material-use',
  designId: DESIGN_ID,
  useId: WOOL_USE.id,
  patch: { colour: 'Black' },
  now: NOW,
};

const REMOVAL: RemovalWrite = {
  type: 'remove-material-use',
  designId: DESIGN_ID,
  useId: WOOL_USE.id,
  now: NOW,
};

describe('a write outcome', () => {
  test('a write that stored a row becomes the event carrying what it stored', () => {
    expect(writeOutcome({ ...DRAFTS, report: { kind: 'stored', value: STORED } })).toEqual({
      type: 'drafts-written',
      design: STORED,
      patch: DRAFTS.patch,
    });
    expect(writeOutcome({ ...MATERIAL_USE, report: { kind: 'stored', value: WOOL_USE } })).toEqual(
      { type: 'material-use-saved', materialUse: WOOL_USE }
    );
    expect(writeOutcome({ ...REMOVAL, report: { kind: 'stored', value: WOOL_USE } })).toEqual({
      type: 'material-use-removed',
      useId: WOOL_USE.id,
    });
  });

  test('a write that refused becomes the refusal the visit restores', () => {
    expect(
      writeOutcome({
        ...DRAFTS,
        report: { kind: 'refused', message: 'A design needs a name.' },
      })
    ).toEqual({ type: 'field-refused', field: 'name', message: 'A design needs a name.' });
    expect(
      writeOutcome({
        ...MATERIAL_USE,
        report: { kind: 'refused', message: 'A material use needs a colour.' },
      })
    ).toEqual({
      type: 'material-use-refused',
      useId: MATERIAL_USE.useId,
      message: 'A material use needs a colour.',
    });
  });

  test('a write that found no row says so, whichever write it was', () => {
    expect(writeOutcome({ ...DRAFTS, report: { kind: 'nothing-stored' } })).toEqual({
      type: 'nothing-stored',
    });
    expect(writeOutcome({ ...MATERIAL_USE, report: { kind: 'nothing-stored' } })).toEqual({
      type: 'nothing-stored',
    });
    expect(writeOutcome({ ...REMOVAL, report: { kind: 'nothing-stored' } })).toEqual({
      type: 'nothing-stored',
    });
  });
});
