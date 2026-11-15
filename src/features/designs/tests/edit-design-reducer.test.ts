import {
  createInitialEditDesignState,
  editDesignReducer,
  type EditDesignEvent,
  type EditDesignState,
} from '../lib/edit-design-reducer';

const DRESS = 'category-dress';
const SPRING = 'collection-spring';

const DESIGN = {
  name: 'Silk slip dress',
  description: 'Bias cut',
  categoryId: DRESS,
  collectionId: null,
};

function send(state: EditDesignState, ...events: EditDesignEvent[]): EditDesignState {
  return events.reduce(editDesignReducer, state);
}

function loaded(): EditDesignState {
  return send(createInitialEditDesignState(), { type: 'design-loaded', design: DESIGN });
}

describe('edit design reducer', () => {
  test('starts empty until the live read seeds it', () => {
    expect(createInitialEditDesignState()).toEqual({
      isSeeded: false,
      name: '',
      description: '',
      categoryId: null,
      collectionId: null,
      savedName: '',
      savedDescription: null,
      savedCategoryId: null,
      savedCollectionId: null,
      error: null,
    });
  });

  test('seeds the drafts and the committed values from the Design', () => {
    expect(loaded()).toEqual({
      isSeeded: true,
      name: 'Silk slip dress',
      description: 'Bias cut',
      categoryId: DRESS,
      collectionId: null,
      savedName: 'Silk slip dress',
      savedDescription: 'Bias cut',
      savedCategoryId: DRESS,
      savedCollectionId: null,
      error: null,
    });
  });

  test('a later live read does not overwrite what the owner is typing', () => {
    const editing = send(loaded(), { type: 'name-changed', name: 'Wool coat' });

    expect(
      send(editing, { type: 'design-loaded', design: { ...DESIGN, name: 'Silk slip dress' } })
    ).toBe(editing);
  });

  test('typing a name clears the previous refusal', () => {
    const refused = send(loaded(), {
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });

    expect(send(refused, { type: 'name-changed', name: 'Wool coat' })).toMatchObject({
      name: 'Wool coat',
      error: null,
    });
  });

  test('a saved name is trimmed and becomes the value a refusal restores', () => {
    const saved = send(
      loaded(),
      { type: 'name-changed', name: '  Wool coat  ' },
      {
        type: 'field-saved',
        field: 'name',
        design: { ...DESIGN, name: 'Wool coat' },
      }
    );

    expect(saved).toMatchObject({
      name: 'Wool coat',
      savedName: 'Wool coat',
      error: null,
    });

    const refused = send(saved, {
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });

    expect(refused).toMatchObject({
      name: 'Wool coat',
      savedName: 'Wool coat',
      error: { field: 'name', message: 'A design needs a name.' },
    });
  });

  test('choosing a Category updates the draft until the write confirms it', () => {
    const knitwear = 'category-knitwear';
    const chosen = send(loaded(), { type: 'category-chosen', categoryId: knitwear });

    expect(chosen.categoryId).toBe(knitwear);
    expect(chosen.savedCategoryId).toBe(DRESS);

    const saved = send(chosen, {
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: knitwear },
    });

    expect(saved).toMatchObject({ categoryId: knitwear, savedCategoryId: knitwear });
  });

  test('a refused selection falls back to the committed one', () => {
    const refused = send(
      loaded(),
      { type: 'category-chosen', categoryId: 'category-knitwear' },
      { type: 'collection-chosen', collectionId: SPRING },
      { type: 'field-refused', field: 'categoryId', message: 'This design is not here.' },
      { type: 'field-refused', field: 'collectionId', message: 'This design is not here.' }
    );

    expect(refused).toMatchObject({
      categoryId: DRESS,
      collectionId: null,
      savedCategoryId: DRESS,
      savedCollectionId: null,
    });
  });

  test('clearing a selection is a draft like any other', () => {
    expect(send(loaded(), { type: 'category-chosen', categoryId: null })).toMatchObject({
      categoryId: null,
      savedCategoryId: DRESS,
    });
  });

  test('a cleared description comes back as an empty draft, not the text null', () => {
    const saved = send(
      loaded(),
      { type: 'description-changed', description: '' },
      { type: 'field-saved', field: 'description', design: { ...DESIGN, description: null } }
    );

    expect(saved).toMatchObject({ description: '', savedDescription: null, error: null });
  });

  test('a saved field leaves the other drafts where they are', () => {
    const saved = send(
      loaded(),
      { type: 'name-changed', name: 'Wool coat' },
      { type: 'description-changed', description: 'Heavy twill' },
      {
        type: 'field-saved',
        field: 'name',
        design: { ...DESIGN, name: 'Wool coat' },
      }
    );

    expect(saved).toMatchObject({ name: 'Wool coat', description: 'Heavy twill' });
  });
});
