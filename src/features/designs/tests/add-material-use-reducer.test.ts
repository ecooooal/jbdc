import {
  addMaterialUseReducer,
  canAddMaterialUse,
  createInitialAddMaterialUseState,
} from '../lib/add-material-use-reducer';

function opened() {
  return addMaterialUseReducer(createInitialAddMaterialUseState(), {
    type: 'inline-creation-opened',
  });
}

describe('add material use reducer', () => {
  test('starts empty, on the main role, and cannot add yet', () => {
    const state = createInitialAddMaterialUseState();

    expect(state).toEqual({
      materialId: null,
      colour: '',
      role: 'main',
      inlineCreationOpen: false,
      inlineName: '',
      inlineError: null,
      error: null,
    });
    expect(canAddMaterialUse(state)).toBe(false);
  });

  test('needs both a Material and a non-blank colour', () => {
    let state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'material-chosen',
      materialId: 'material-silk',
    });
    expect(canAddMaterialUse(state)).toBe(false);

    state = addMaterialUseReducer(state, { type: 'colour-changed', colour: '   ' });
    expect(canAddMaterialUse(state)).toBe(false);

    state = addMaterialUseReducer(state, { type: 'colour-changed', colour: ' Ivory ' });
    expect(canAddMaterialUse(state)).toBe(true);
  });

  test('changes the role', () => {
    const state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'role-chosen',
      role: 'other',
    });

    expect(state.role).toBe('other');
  });

  test('a Material created inline becomes the chosen Material and closes the form', () => {
    const state = addMaterialUseReducer(opened(), {
      type: 'material-created',
      materialId: 'material-silk',
    });

    expect(state).toMatchObject({
      materialId: 'material-silk',
      inlineCreationOpen: false,
      inlineName: '',
      inlineError: null,
    });
    expect(canAddMaterialUse({ ...state, colour: 'Ivory' })).toBe(true);
  });

  test('an inline refusal keeps the name draft and shows the message', () => {
    let state = addMaterialUseReducer(opened(), {
      type: 'inline-name-changed',
      name: 'Silk crêpe',
    });
    state = addMaterialUseReducer(state, {
      type: 'inline-creation-refused',
      message: 'That material is already in the list.',
    });

    expect(state).toMatchObject({
      inlineName: 'Silk crêpe',
      inlineError: 'That material is already in the list.',
    });

    state = addMaterialUseReducer(state, { type: 'inline-name-changed', name: 'Silk crêpe 2' });

    expect(state.inlineError).toBeNull();
  });

  test('closing inline creation clears its draft and message', () => {
    let state = addMaterialUseReducer(opened(), {
      type: 'inline-name-changed',
      name: 'Silk crêpe',
    });
    state = addMaterialUseReducer(state, {
      type: 'inline-creation-refused',
      message: 'A material needs a name.',
    });

    state = addMaterialUseReducer(state, { type: 'inline-creation-closed' });

    expect(state).toMatchObject({ inlineCreationOpen: false, inlineName: '', inlineError: null });
  });

  test('a use refusal shows its message until the field changes', () => {
    let state = addMaterialUseReducer(opened(), {
      type: 'use-creation-refused',
      message: 'A material use needs a colour.',
    });

    expect(state.error).toBe('A material use needs a colour.');

    state = addMaterialUseReducer(state, { type: 'colour-changed', colour: 'Ivory' });

    expect(state.error).toBeNull();
  });

  test('a created use returns the editor to its blank state', () => {
    let state = addMaterialUseReducer(createInitialAddMaterialUseState(), {
      type: 'material-chosen',
      materialId: 'material-silk',
    });
    state = addMaterialUseReducer(state, { type: 'colour-changed', colour: 'Ivory' });
    state = addMaterialUseReducer(state, { type: 'role-chosen', role: 'secondary' });

    state = addMaterialUseReducer(state, { type: 'use-created' });

    expect(state).toEqual(createInitialAddMaterialUseState());
  });
});
