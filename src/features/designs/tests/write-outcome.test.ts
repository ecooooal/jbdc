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

describe('a write outcome', () => {
  test('every stored change becomes its own event, in the order declared', () => {
    expect(
      writeOutcome(
        attempt({ fields: { name: 'Wool coat' } }, stored([{ kind: 'fields', design: STORED }]))
      )
    ).toEqual([{ type: 'drafts-written', design: STORED, patch: { name: 'Wool coat' } }]);

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
    ]);
  });

  test('a refused write restores each change it declared', () => {
    expect(
      writeOutcome(
        attempt(
          { fields: { name: '   ' } },
          { kind: 'refused', field: 'name', message: 'A design needs a name.' }
        )
      )
    ).toEqual([{ type: 'field-refused', field: 'name', message: 'A design needs a name.' }]);

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
    ).toEqual([{ type: 'material-use-add-refused', message: 'A material use needs a colour.' }]);
  });

  test('a write that found no Design row says so, whatever it changed', () => {
    expect(
      writeOutcome(
        attempt({ fields: { name: 'Linen shirt' } }, { kind: 'design-missing' })
      )
    ).toEqual([{ type: 'nothing-stored', designId: DESIGN_ID }]);
    expect(
      writeOutcome(
        attempt({ uses: [{ kind: 'remove', useId: WOOL_USE.id }] }, { kind: 'design-missing' })
      )
    ).toEqual([{ type: 'nothing-stored', designId: DESIGN_ID }]);
  });

  test('a removal reports the use as removed whether it deleted it or found it gone', () => {
    expect(
      writeOutcome(
        attempt({ uses: [{ kind: 'remove', useId: WOOL_USE.id }] }, stored([{ kind: 'remove', materialUse: WOOL_USE }]))
      )
    ).toEqual([
      { type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: WOOL_USE.id }, now: NOW },
    ]);
    expect(
      writeOutcome(
        attempt(
          { uses: [{ kind: 'remove', useId: 'use-gone' }] },
          stored([{ kind: 'use-missing', useId: 'use-gone' }])
        )
      )
    ).toEqual([
      { type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: 'use-gone' }, now: NOW },
    ]);
  });
});
