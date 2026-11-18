import { writeOutcome, type WriteAttempt } from '../lib/edit-design-reducer';
import { EMPTY_DESIGN_FIELDS } from '../lib/fields';
import type { ChangeOutcome, Design, DesignWriteResult, MaterialUse } from '../lib/records';

const DESIGN_ID = 'design-silk-slip';
const NOW = 1_700_000_000_000;

const STORED: Design = {
  ...EMPTY_DESIGN_FIELDS,
  id: DESIGN_ID,
  name: 'Wool coat',
  status: 'concept',
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};

const WOOL_USE: MaterialUse = {
  id: 'use-wool',
  designId: DESIGN_ID,
  materialId: 'material-wool',
  materialName: 'Wool',
  colour: 'Charcoal',
  role: 'main',
  createdAt: NOW,
};

/** The one stored answer a visit hands back for the changes the effect declared. */
function stored(outcomes: ChangeOutcome[]): DesignWriteResult {
  return { kind: 'stored', design: STORED, materialUses: [WOOL_USE], outcomes };
}

function attempt(
  changes: WriteAttempt['changes'],
  result: WriteAttempt['result'],
  now = NOW
): WriteAttempt {
  return { type: 'write-design', designId: DESIGN_ID, changes, now, result };
}

/** The one event that reports the write, closing every answer but a missing row. */
const SETTLED = { type: 'write-settled', designId: DESIGN_ID } as const;

describe('a write outcome', () => {
  test('every stored change becomes its own event, in the order declared, then one settle', () => {
    expect(
      writeOutcome(
        attempt({ fields: { name: 'Wool coat' } }, stored([{ kind: 'fields', design: STORED }]))
      )
    ).toEqual([
      { type: 'drafts-written', design: STORED, patch: { name: 'Wool coat' } },
      SETTLED,
    ]);

    expect(
      writeOutcome(
        attempt(
          {
            fields: { description: 'Heavy twill' },
            uses: [
              { kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } },
              { kind: 'add', input: { materialId: 'material-silk', colour: 'Ivory', role: 'other' } },
              { kind: 'remove', useId: 'use-lining' },
            ],
          },
          stored([
            { kind: 'fields', design: STORED },
            { kind: 'correct', materialUse: { ...WOOL_USE, colour: 'Black' } },
            {
              kind: 'add',
              materialUse: { ...WOOL_USE, id: 'use-silk', colour: 'Ivory', role: 'other' },
            },
            { kind: 'remove', materialUse: WOOL_USE },
          ])
        )
      )
    ).toEqual([
      { type: 'drafts-written', design: STORED, patch: { description: 'Heavy twill' } },
      {
        type: 'material-use-panel-fact',
        fact: { type: 'saved', materialUse: { ...WOOL_USE, colour: 'Black' } },
        now: NOW,
      },
      {
        type: 'material-use-added',
        materialUse: { ...WOOL_USE, id: 'use-silk', colour: 'Ivory', role: 'other' },
      },
      { type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: WOOL_USE.id }, now: NOW },
      SETTLED,
    ]);
  });

  test('a two-field patch refused by its name restores that field once, then settles', () => {
    expect(
      writeOutcome(
        attempt(
          { fields: { name: '   ', description: 'Heavy twill' } },
          { kind: 'refused', field: 'name', message: 'A design needs a name.' }
        )
      )
    ).toEqual([
      { type: 'field-refused', field: 'name', message: 'A design needs a name.' },
      SETTLED,
    ]);
  });

  test('a refused colour restores only the panel it refused, then settles', () => {
    expect(
      writeOutcome(
        attempt(
          { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: '   ' } }] },
          { kind: 'refused', field: 'colour', message: 'A material use needs a colour.' }
        )
      )
    ).toEqual([
      {
        type: 'material-use-panel-fact',
        fact: { type: 'refused', useId: WOOL_USE.id, message: 'A material use needs a colour.' },
        now: NOW,
      },
      SETTLED,
    ]);

    expect(
      writeOutcome(
        attempt(
          {
            uses: [{ kind: 'add', input: { materialId: 'material-wool', colour: '   ', role: 'main' } }],
          },
          { kind: 'refused', field: 'colour', message: 'A material use needs a colour.' }
        )
      )
    ).toEqual([{ type: 'material-use-add-refused', message: 'A material use needs a colour.' }, SETTLED]);
  });

  test('a refused write sends no removal for the use it collaterally removed', () => {
    expect(
      writeOutcome(
        attempt(
          {
            uses: [
              { kind: 'remove', useId: WOOL_USE.id },
              { kind: 'correct', useId: WOOL_USE.id, patch: { colour: '   ' } },
            ],
          },
          { kind: 'refused', field: 'colour', message: 'A material use needs a colour.' }
        )
      )
    ).toEqual([
      {
        type: 'material-use-panel-fact',
        fact: { type: 'refused', useId: WOOL_USE.id, message: 'A material use needs a colour.' },
        now: NOW,
      },
      SETTLED,
    ]);
  });

  test('a write that found no Design row ends the visit without a settle', () => {
    expect(
      writeOutcome(attempt({ fields: { name: 'Linen shirt' } }, { kind: 'design-missing' }))
    ).toEqual([{ type: 'design-missing', designId: DESIGN_ID }]);
    expect(
      writeOutcome(
        attempt({ uses: [{ kind: 'remove', useId: WOOL_USE.id }] }, { kind: 'design-missing' })
      )
    ).toEqual([{ type: 'design-missing', designId: DESIGN_ID }]);
  });

  test('a missing use is reported as use-missing and does not end the visit', () => {
    expect(
      writeOutcome(
        attempt(
          { uses: [{ kind: 'remove', useId: 'use-gone' }] },
          stored([{ kind: 'use-missing', useId: 'use-gone' }])
        )
      )
    ).toEqual([
      { type: 'material-use-panel-fact', fact: { type: 'use-missing', useId: 'use-gone' }, now: NOW },
      SETTLED,
    ]);
  });

  test('a removal reports the use it deleted', () => {
    expect(
      writeOutcome(
        attempt(
          { uses: [{ kind: 'remove', useId: WOOL_USE.id }] },
          stored([{ kind: 'remove', materialUse: WOOL_USE }])
        )
      )
    ).toEqual([
      { type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: WOOL_USE.id }, now: NOW },
      SETTLED,
    ]);
  });
});
