import {
  canCreateDesign,
  collectionYearFromInput,
  createInitialNewDesignFormState,
  newDesignFormReducer,
  type NewDesignFormEvent,
  type NewDesignFormState,
} from '../lib/new-design-form-reducer';

const DRESS = 'category-dress';
const SPRING = 'collection-spring';

function send(state: NewDesignFormState, ...events: NewDesignFormEvent[]): NewDesignFormState {
  return events.reduce(newDesignFormReducer, state);
}

describe('new design form reducer', () => {
  test('starts with no name, no taxonomy, and no inline form', () => {
    expect(createInitialNewDesignFormState()).toEqual({
      name: '',
      categoryId: null,
      collectionId: null,
      inline: { open: false, name: '', error: null },
      inlineKind: null,
      inlineYear: '',
      error: null,
    });
  });

  test('a non-blank name is enough to create the design', () => {
    const empty = createInitialNewDesignFormState();

    expect(canCreateDesign(empty)).toBe(false);

    const named = send(empty, { type: 'name-changed', name: '  Silk slip dress ' });

    expect(named.name).toBe('  Silk slip dress ');
    expect(canCreateDesign(named)).toBe(true);
    expect(canCreateDesign(send(empty, { type: 'name-changed', name: ' \n\t ' }))).toBe(false);
  });

  test('choosing a category and a collection keeps each independent', () => {
    const chosen = send(
      createInitialNewDesignFormState(),
      { type: 'category-chosen', categoryId: DRESS },
      { type: 'collection-chosen', collectionId: SPRING }
    );

    expect(chosen.categoryId).toBe(DRESS);
    expect(chosen.collectionId).toBe(SPRING);

    const cleared = send(
      chosen,
      { type: 'category-chosen', categoryId: null },
      { type: 'collection-chosen', collectionId: null }
    );

    expect(cleared.categoryId).toBeNull();
    expect(cleared.collectionId).toBeNull();
  });

  test('opening the other picker replaces the inline draft and remembers which one', () => {
    const opened = send(createInitialNewDesignFormState(), {
      type: 'inline-opened',
      kind: 'category',
    });

    expect(opened.inline).toEqual({ open: true, name: '', error: null });
    expect(opened.inlineKind).toBe('category');

    const typed = send(
      opened,
      { type: 'inline-fact', fact: { type: 'name-changed', name: 'Knitwear' } },
      { type: 'inline-fact', fact: { type: 'refused', message: 'A category needs a name.' } }
    );

    expect(typed.inline).toEqual({ open: true, name: 'Knitwear', error: 'A category needs a name.' });

    const collection = send(typed, { type: 'inline-opened', kind: 'collection' });

    expect(collection.inline).toEqual({ open: true, name: '', error: null });
    expect(collection.inlineKind).toBe('collection');
    expect(collection.inlineYear).toBe('');
  });

  test('changing an inline field clears its refusal but keeps the panel open', () => {
    const refused = send(
      createInitialNewDesignFormState(),
      { type: 'inline-opened', kind: 'collection' },
      { type: 'inline-fact', fact: { type: 'refused', message: 'A collection needs a name.' } }
    );

    const typing = send(refused, {
      type: 'inline-fact',
      fact: { type: 'name-changed', name: 'Resort' },
    });

    expect(typing.inline).toEqual({ open: true, name: 'Resort', error: null });
    expect(typing.inlineKind).toBe('collection');

    const yearTyping = send(refused, { type: 'inline-year-changed', year: '2028' });

    expect(yearTyping.inline).toEqual({ open: true, name: '', error: null });
    expect(yearTyping.inlineYear).toBe('2028');
    expect(yearTyping.inlineKind).toBe('collection');
  });

  test('a category created inline is selected and closes the inline form', () => {
    const knitwear = 'category-knitwear';
    const state = send(
      createInitialNewDesignFormState(),
      { type: 'inline-opened', kind: 'category' },
      { type: 'inline-fact', fact: { type: 'name-changed', name: 'Knitwear' } },
      { type: 'inline-fact', fact: { type: 'created', id: knitwear } }
    );

    expect(state.categoryId).toBe(knitwear);
    expect(state.inline).toEqual({ open: false, name: '', error: null });
    expect(state.inlineKind).toBeNull();
  });

  test('a collection created inline is selected and keeps a chosen category', () => {
    const resort = 'collection-resort';
    const state = send(
      createInitialNewDesignFormState(),
      { type: 'category-chosen', categoryId: DRESS },
      { type: 'inline-opened', kind: 'collection' },
      { type: 'inline-fact', fact: { type: 'name-changed', name: 'Resort' } },
      { type: 'inline-fact', fact: { type: 'created', id: resort } }
    );

    expect(state.collectionId).toBe(resort);
    expect(state.categoryId).toBe(DRESS);
    expect(state.inlineKind).toBeNull();
    expect(state.inlineYear).toBe('');
  });

  test('closing inline creation drops its draft and keeps the chosen taxonomy', () => {
    const state = send(
      createInitialNewDesignFormState(),
      { type: 'category-chosen', categoryId: DRESS },
      { type: 'inline-opened', kind: 'category' },
      { type: 'inline-fact', fact: { type: 'name-changed', name: 'Knitwear' } },
      { type: 'inline-fact', fact: { type: 'closed' } }
    );

    expect(state.inline).toEqual({ open: false, name: '', error: null });
    expect(state.inlineKind).toBeNull();
    expect(state.categoryId).toBe(DRESS);
  });

  test('a refused design creation shows its message until the name changes', () => {
    const refused = send(createInitialNewDesignFormState(), {
      type: 'design-creation-refused',
      message: 'A design needs a name.',
    });

    expect(refused.error).toBe('A design needs a name.');

    const typed = send(refused, { type: 'name-changed', name: 'Wool coat' });

    expect(typed.error).toBeNull();
  });

  test('the year field is optional but never silently becomes zero', () => {
    expect(collectionYearFromInput('')).toBeNull();
    expect(collectionYearFromInput('   ')).toBeNull();
    expect(collectionYearFromInput(' 2027 ')).toBe(2027);
    expect(collectionYearFromInput('abc')).toBeNaN();
    expect(collectionYearFromInput('2027.5')).toBeNaN();
    expect(collectionYearFromInput('0x7ef')).toBeNaN();
    expect(collectionYearFromInput('2027e0')).toBeNaN();
  });
});
