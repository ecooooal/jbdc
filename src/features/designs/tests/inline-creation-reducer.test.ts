import {
  clearInlineRefusal,
  createInitialInlineCreationState,
  inlineCreationReducer,
  inlineCreationResult,
  type InlineCreationEvent,
  type InlineCreationState,
} from '../lib/inline-creation-reducer';

class NameRefusal extends Error {}
class YearRefusal extends Error {}
class Bug extends Error {}

function send(state: InlineCreationState, ...facts: InlineCreationEvent[]): InlineCreationState {
  return facts.reduce(inlineCreationReducer, state);
}

describe('inline creation slice', () => {
  test('starts closed with no name and no refusal', () => {
    expect(createInitialInlineCreationState()).toEqual({ open: false, name: '', error: null });
  });

  test('opening clears a previous draft and refusal, and closing clears the new one', () => {
    const typed = send(
      createInitialInlineCreationState(),
      { type: 'opened' },
      { type: 'name-changed', name: 'Knitwear' },
      { type: 'refused', message: 'Already in the list.' }
    );

    expect(typed).toEqual({ open: true, name: 'Knitwear', error: 'Already in the list.' });

    const reopened = send(typed, { type: 'opened' });

    expect(reopened).toEqual({ open: true, name: '', error: null });

    const closed = send(reopened, { type: 'name-changed', name: 'Silk' }, { type: 'closed' });

    expect(closed).toEqual({ open: false, name: '', error: null });
  });

  test('a refusal keeps the typed name and the panel open; typing clears the message', () => {
    const refused = send(
      createInitialInlineCreationState(),
      { type: 'opened' },
      { type: 'name-changed', name: 'Silk crêpe' },
      { type: 'refused', message: 'That name is taken.' }
    );

    expect(refused).toEqual({ open: true, name: 'Silk crêpe', error: 'That name is taken.' });
    expect(send(refused, { type: 'name-changed', name: 'Silk crêpe 2' })).toEqual({
      open: true,
      name: 'Silk crêpe 2',
      error: null,
    });
  });

  test('clearing a refusal keeps the typed name and the panel open', () => {
    const refused = send(
      createInitialInlineCreationState(),
      { type: 'opened' },
      { type: 'name-changed', name: 'Silk crêpe' },
      { type: 'refused', message: 'That name is taken.' }
    );

    expect(clearInlineRefusal(refused)).toEqual({
      open: true,
      name: 'Silk crêpe',
      error: null,
    });
  });

  test('a created id closes the panel and clears the draft and refusal', () => {
    const created = send(
      createInitialInlineCreationState(),
      { type: 'opened' },
      { type: 'name-changed', name: 'Knitwear' },
      { type: 'refused', message: 'Taken.' },
      { type: 'created', id: 'category-knitwear' }
    );

    expect(created).toEqual({ open: false, name: '', error: null });
  });

  test('the create adapter reports the id a create stored', () => {
    expect(inlineCreationResult(() => ({ id: 'material-silk' }), NameRefusal)).toEqual({
      type: 'created',
      id: 'material-silk',
    });
  });

  test('the create adapter reports a refusal message and rethrows other errors', () => {
    const refused = inlineCreationResult<{ id: string }>(
      () => {
        throw new YearRefusal('A collection year must be a whole number.');
      },
      NameRefusal,
      YearRefusal
    );

    expect(refused).toEqual({ type: 'refused', message: 'A collection year must be a whole number.' });

    const bug = new Bug('not a refusal');
    expect(() => inlineCreationResult(() => { throw bug; }, NameRefusal)).toThrow(bug);
  });
});
