import type { MaterialUse } from '../lib/records';
import {
  createInitialEditMaterialUseState,
  editMaterialUseReducer,
  materialUseChoices,
} from '../lib/edit-material-use-reducer';

const WOOL_USE: MaterialUse = {
  id: 'use-wool',
  designId: 'design-coat',
  materialId: 'material-wool',
  materialName: 'Wool',
  colour: 'Charcoal',
  role: 'main',
  createdAt: 10,
};

describe('edit material use reducer', () => {
  test('opens with the stored Material, colour, and role', () => {
    expect(createInitialEditMaterialUseState(WOOL_USE)).toEqual({
      materialId: WOOL_USE.materialId,
      colour: 'Charcoal',
      role: 'main',
      stored: WOOL_USE,
      error: null,
    });
  });

  test('the picker keeps the stored Material when the live list no longer has it', () => {
    const state = createInitialEditMaterialUseState(WOOL_USE);

    expect(materialUseChoices([{ id: 'material-silk', name: 'Silk crêpe' }], state)).toEqual([
      { id: 'material-silk', name: 'Silk crêpe' },
      { id: WOOL_USE.materialId, name: WOOL_USE.materialName },
    ]);
    expect(
      materialUseChoices([{ id: WOOL_USE.materialId, name: 'Merino' }], state)
    ).toEqual([{ id: WOOL_USE.materialId, name: 'Merino' }]);
  });

  test('changing a field updates the draft and clears the previous refusal', () => {
    let state = editMaterialUseReducer(createInitialEditMaterialUseState(WOOL_USE), {
      type: 'material-use-refused',
      message: 'A material use needs a colour.',
    });

    state = editMaterialUseReducer(state, { type: 'colour-changed', colour: 'Black' });
    expect(state).toMatchObject({ colour: 'Black', error: null });

    state = editMaterialUseReducer(state, { type: 'role-chosen', role: 'secondary' });
    expect(state).toMatchObject({ colour: 'Black', role: 'secondary' });

    state = editMaterialUseReducer(state, {
      type: 'material-chosen',
      materialId: 'material-silk',
    });
    expect(state).toMatchObject({ materialId: 'material-silk', role: 'secondary' });
  });

  test('a saved use becomes the row and clears the refusal', () => {
    const silkUse: MaterialUse = {
      ...WOOL_USE,
      materialId: 'material-silk',
      materialName: 'Silk crêpe',
      colour: 'Ivory',
      role: 'secondary',
    };
    const state = editMaterialUseReducer(createInitialEditMaterialUseState(WOOL_USE), {
      type: 'material-use-saved',
      materialUse: silkUse,
    });

    expect(state).toEqual({
      materialId: 'material-silk',
      colour: 'Ivory',
      role: 'secondary',
      stored: silkUse,
      error: null,
    });
  });

  test('a refusal restores the stored use and shows the message', () => {
    let state = editMaterialUseReducer(createInitialEditMaterialUseState(WOOL_USE), {
      type: 'colour-changed',
      colour: '   ',
    });
    state = editMaterialUseReducer(state, {
      type: 'material-use-refused',
      message: 'A material use needs a colour.',
    });

    expect(state).toMatchObject({
      materialId: WOOL_USE.materialId,
      colour: 'Charcoal',
      role: 'main',
      error: 'A material use needs a colour.',
    });
  });
});
