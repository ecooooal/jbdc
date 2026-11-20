import {
  addMaterialUseReducer,
  canAddMaterialUse,
  createInitialAddMaterialUseState,
} from '../lib/add-material-use-reducer';

describe('add material use reducer', () => {
  test('starts empty, on the main role, with inline creation closed, and cannot add yet', () => {
    const state = createInitialAddMaterialUseState();

    expect(state).toEqual({
      materialId: null,
      colour: '',
      role: 'main',
      inline: { open: false, name: '', error: null },
      error: null,
    });
    expect(canAddMaterialUse(state)).toBe(false);
  });

  test('needs a Material; the colour is left to the record write', () => {
    const state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'material-chosen',
      materialId: 'material-silk',
    });
    expect(canAddMaterialUse(state)).toBe(true);

    const blank = addMaterialUseReducer(state, { type: 'colour-changed', colour: '   ' });
    expect(canAddMaterialUse(blank)).toBe(true);
  });

  test('changes the role', () => {
    const state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'role-chosen',
      role: 'other',
    });

    expect(state.role).toBe('other');
  });

  test('a Material created inline is selected and clears a stale use refusal', () => {
    let state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'use-creation-refused',
      message: 'A material use needs a colour.',
    });
    state = addMaterialUseReducer(state, {
      type: 'inline-fact',
      fact: { type: 'created', id: 'material-silk' },
    });

    expect(state).toMatchObject({
      materialId: 'material-silk',
      inline: { open: false, name: '', error: null },
      error: null,
    });
  });

  test('a use refusal clears when a choice changes', () => {
    let state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'use-creation-refused',
      message: 'A material use needs a colour.',
    });

    expect(state.error).toBe('A material use needs a colour.');

    state = addMaterialUseReducer(state, { type: 'colour-changed', colour: 'Ivory' });

    expect(state.error).toBeNull();
  });
});
