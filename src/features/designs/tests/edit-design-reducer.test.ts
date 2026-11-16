import { createReducerTester } from '@/shared/testing/reducer-tester';
import {
  createInitialEditDesignState,
  editDesignReducer,
  unwrittenFields,
} from '../lib/edit-design-reducer';
import type { DesignFields } from '../lib/records';

const DESIGN_ID = 'design-silk-slip';
const DRESS = 'category-dress';
const KNITWEAR = 'category-knitwear';
const NOW = 1_700_000_000_000;
const LATER = NOW + 60_000;

const DESIGN: DesignFields = {
  name: 'Silk slip dress',
  description: 'Bias cut',
  categoryId: DRESS,
  collectionId: null,
};

/** A visit that has read its Design and is ready to edit. */
function session() {
  const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

  tester.send({ type: 'design-loaded', design: DESIGN });

  return tester;
}

describe('edit design reducer', () => {
  test('starts unseeded, with the Design it edits and no baseline yet', () => {
    expect(createInitialEditDesignState(DESIGN_ID)).toEqual({
      designId: DESIGN_ID,
      isSeeded: false,
      isClosed: false,
      name: '',
      description: '',
      categoryId: null,
      collectionId: null,
      savedName: '',
      savedDescription: null,
      savedCategoryId: null,
      savedCollectionId: null,
      sessionStart: null,
      error: null,
    });
  });

  test('seeds the drafts, the row values, and the visit baseline from the first read', () => {
    expect(session().getState()).toEqual({
      designId: DESIGN_ID,
      isSeeded: true,
      isClosed: false,
      name: 'Silk slip dress',
      description: 'Bias cut',
      categoryId: DRESS,
      collectionId: null,
      savedName: 'Silk slip dress',
      savedDescription: 'Bias cut',
      savedCategoryId: DRESS,
      savedCollectionId: null,
      sessionStart: DESIGN,
      error: null,
    });
  });

  test('a later live read does not overwrite what the owner is typing', () => {
    const tester = session();
    tester.send({ type: 'name-changed', name: 'Wool coat' });

    const editing = tester.getState();
    tester.send({ type: 'design-loaded', design: DESIGN });

    expect(tester.getState()).toBe(editing);
  });

  test('typing a name clears the previous refusal', () => {
    const tester = session();

    tester.send({
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });
    tester.send({ type: 'name-changed', name: 'Wool coat' });

    expect(tester.getState()).toMatchObject({ name: 'Wool coat', error: null });
  });

  test('a saved name is trimmed and becomes the value a refusal restores', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: '  Wool coat  ' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({
      name: 'Wool coat',
      savedName: 'Wool coat',
      error: null,
    });

    tester.send({
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });

    expect(tester.getState()).toMatchObject({
      name: 'Wool coat',
      savedName: 'Wool coat',
      error: { field: 'name', message: 'A design needs a name.' },
    });
  });

  test('choosing a Category updates the draft until the write confirms it', () => {
    const tester = session();

    tester.send({ type: 'category-chosen', categoryId: KNITWEAR });
    expect(tester.getState()).toMatchObject({ categoryId: KNITWEAR, savedCategoryId: DRESS });

    tester.send({
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: KNITWEAR },
    });
    expect(tester.getState()).toMatchObject({ categoryId: KNITWEAR, savedCategoryId: KNITWEAR });
  });

  test('a refused selection falls back to the committed one', () => {
    const tester = session();

    tester.send({ type: 'category-chosen', categoryId: KNITWEAR });
    tester.send({ type: 'collection-chosen', collectionId: 'collection-spring' });
    tester.send({ type: 'field-refused', field: 'categoryId', message: 'This design is not here.' });
    tester.send({
      type: 'field-refused',
      field: 'collectionId',
      message: 'This design is not here.',
    });

    expect(tester.getState()).toMatchObject({
      categoryId: DRESS,
      collectionId: null,
      savedCategoryId: DRESS,
      savedCollectionId: null,
    });
  });

  test('clearing a selection is a draft like any other', () => {
    const tester = session();

    tester.send({ type: 'category-chosen', categoryId: null });

    expect(tester.getState()).toMatchObject({ categoryId: null, savedCategoryId: DRESS });
  });

  test('a cleared description comes back as an empty draft, not the text null', () => {
    const tester = session();

    tester.send({ type: 'description-changed', description: '' });
    tester.send({
      type: 'field-saved',
      field: 'description',
      design: { ...DESIGN, description: null },
    });

    expect(tester.getState()).toMatchObject({
      description: '',
      savedDescription: null,
      error: null,
    });
  });

  test('a saved field leaves the other drafts where they are', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'description-changed', description: 'Heavy twill' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({ name: 'Wool coat', description: 'Heavy twill' });
  });

  test('the drafts that still differ from the row are what a flush writes', () => {
    const tester = session();
    expect(unwrittenFields(tester.getState())).toBeNull();

    tester.send({ type: 'name-changed', name: '  Wool coat  ' });
    tester.send({ type: 'description-changed', description: ' Heavy twill ' });

    expect(unwrittenFields(tester.getState())).toEqual({
      name: 'Wool coat',
      description: ' Heavy twill ',
    });
  });

  test('a blank name is never pending, but a real description still is', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: '   ' });
    tester.send({ type: 'description-changed', description: 'Heavy twill' });

    expect(unwrittenFields(tester.getState())).toEqual({ description: 'Heavy twill' });
  });

  test('clearing the description is a pending write', () => {
    const tester = session();

    tester.send({ type: 'description-changed', description: '' });

    expect(unwrittenFields(tester.getState())).toEqual({ description: '' });
  });

  test('a draft written by leaving the app becomes the value a later refusal restores', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    tester.send({ type: 'drafts-written', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({ name: 'Wool coat', savedName: 'Wool coat' });
  });
});

describe('edit session boundary', () => {
  test('a visit that changed nothing declares no work at all', () => {
    const tester = session();

    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().isClosed).toBe(true);
  });

  test('closing after a draft writes it, then records the whole visit once', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, name: 'Wool coat' },
        now: NOW,
      },
    ]);
  });

  test('leaving the app writes the drafts but records nothing', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
    ]);
  });

  test('a visit backgrounded and later closed stays one Event against the open row', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    tester.send({ type: 'drafts-written', design: { ...DESIGN, name: 'Wool coat' } });
    tester.send({ type: 'session-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, name: 'Wool coat' },
        now: LATER,
      },
    ]);
  });

  test('a selection already written is recorded without a close-time write', () => {
    const tester = session();

    tester.send({ type: 'category-chosen', categoryId: KNITWEAR });
    tester.send({
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: KNITWEAR },
    });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, categoryId: KNITWEAR },
        now: NOW,
      },
    ]);
  });

  test('a net-zero visit restores the earlier value but writes no Event', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });
    tester.send({ type: 'name-changed', name: 'Silk slip dress' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Silk slip dress' },
        now: NOW,
      },
    ]);
  });

  test('a selection written away and back writes no Event', () => {
    const tester = session();

    tester.send({ type: 'category-chosen', categoryId: KNITWEAR });
    tester.send({
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: KNITWEAR },
    });
    tester.send({ type: 'category-chosen', categoryId: DRESS });
    tester.send({ type: 'field-saved', field: 'categoryId', design: DESIGN });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a second close declares nothing more', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: 'Wool coat' });
    tester.send({ type: 'session-closed', now: NOW });

    const firstClose = tester.getEffects();
    tester.send({ type: 'session-closed', now: LATER });

    expect(tester.getEffects()).toEqual(firstClose);
  });

  test('a close writes no blank name but still writes a valid description', () => {
    const tester = session();

    tester.send({ type: 'name-changed', name: '   ' });
    tester.send({ type: 'description-changed', description: 'Heavy twill' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { description: 'Heavy twill' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, description: 'Heavy twill' },
        now: NOW,
      },
    ]);
  });

  test('the recorded description is the stored one, not the raw draft', () => {
    const tester = session();

    tester.send({ type: 'description-changed', description: '  Heavy twill  ' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { description: '  Heavy twill  ' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, description: 'Heavy twill' },
        now: NOW,
      },
    ]);
  });

  test('a close before the read lands declares nothing', () => {
    const tester = createReducerTester(
      editDesignReducer,
      createInitialEditDesignState(DESIGN_ID)
    );

    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a background before the read lands declares nothing', () => {
    const tester = createReducerTester(
      editDesignReducer,
      createInitialEditDesignState(DESIGN_ID)
    );

    tester.send({ type: 'app-backgrounded', now: NOW });

    expect(tester.getEffects()).toEqual([]);
  });
});
