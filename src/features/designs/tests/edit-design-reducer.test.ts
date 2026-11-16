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

const EMPTY_SPECIFICATION = {
  silhouette: null,
  neckline: null,
  sleeveType: null,
  garmentDetails: null,
  sizeRange: null,
  measurements: null,
  constructionNotes: null,
} as const;

const EMPTY_CREATIVE_DIRECTION = {
  concept: null,
  mood: null,
  inspiration: null,
  intendedFeeling: null,
  audience: null,
  styling: null,
  palette: null,
} as const;

const DESIGN: DesignFields = {
  name: 'Silk slip dress',
  description: 'Bias cut',
  categoryId: DRESS,
  collectionId: null,
  ...EMPTY_SPECIFICATION,
  ...EMPTY_CREATIVE_DIRECTION,
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
      draft: {
        name: '',
        description: '',
        categoryId: null,
        collectionId: null,
        silhouette: '',
        neckline: '',
        sleeveType: '',
        garmentDetails: '',
        sizeRange: '',
        measurements: '',
        constructionNotes: '',
        concept: '',
        mood: '',
        inspiration: '',
        intendedFeeling: '',
        audience: '',
        styling: '',
        palette: '',
      },
      saved: {
        name: '',
        description: null,
        categoryId: null,
        collectionId: null,
        ...EMPTY_SPECIFICATION,
        ...EMPTY_CREATIVE_DIRECTION,
      },
      sessionStart: null,
      editing: null,
      tab: 'specification',
      error: null,
    });
  });

  test('seeds the drafts, the row values, and the visit baseline from the first read', () => {
    expect(session().getState()).toEqual({
      designId: DESIGN_ID,
      isSeeded: true,
      isClosed: false,
      draft: {
        name: 'Silk slip dress',
        description: 'Bias cut',
        categoryId: DRESS,
        collectionId: null,
        silhouette: '',
        neckline: '',
        sleeveType: '',
        garmentDetails: '',
        sizeRange: '',
        measurements: '',
        constructionNotes: '',
        concept: '',
        mood: '',
        inspiration: '',
        intendedFeeling: '',
        audience: '',
        styling: '',
        palette: '',
      },
      saved: DESIGN,
      sessionStart: DESIGN,
      editing: null,
      tab: 'specification',
      error: null,
    });
  });

  test('seeds Specification drafts from the stored values', () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: 'design-loaded',
      design: { ...DESIGN, silhouette: 'Relaxed A-line', measurements: 'Bust 96' },
    });

    expect(tester.getState().draft).toMatchObject({
      silhouette: 'Relaxed A-line',
      measurements: 'Bust 96',
      neckline: '',
    });
  });

  test('seeds Creative direction drafts from the stored values', () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: 'design-loaded',
      design: { ...DESIGN, concept: 'Sunday afternoons', palette: 'Ivory and cream' },
    });

    expect(tester.getState().draft).toMatchObject({
      concept: 'Sunday afternoons',
      palette: 'Ivory and cream',
      mood: '',
    });
  });

  test('a later live read does not overwrite what the owner is typing', () => {
    const tester = session();
    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });

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
    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });

    expect(tester.getState()).toMatchObject({ draft: { name: 'Wool coat' }, error: null });
  });

  test('one row is open at a time', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    expect(tester.getState().editing).toBe('silhouette');

    tester.send({ type: 'row-opened', row: 'neckline', now: NOW });
    expect(tester.getState().editing).toBe('neckline');

    tester.send({ type: 'row-closed' });
    expect(tester.getState().editing).toBeNull();
  });

  test('opening another row writes the draft the owner is leaving', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'text-changed', field: 'silhouette', value: '  Relaxed A-line  ' });
    tester.send({ type: 'row-opened', row: 'neckline', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { silhouette: '  Relaxed A-line  ' },
        now: LATER,
      },
    ]);
    expect(tester.getState().editing).toBe('neckline');
  });

  test('leaving a name row with a blank draft restores the saved name', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'name', now: NOW });
    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'row-opened', row: 'description', now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toMatchObject({
      draft: { name: 'Silk slip dress' },
      editing: 'description',
    });
  });

  test('opening another row clears the refusal of the row being left', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'name', now: NOW });
    tester.send({ type: 'field-refused', field: 'name', message: 'A design needs a name.' });
    tester.send({ type: 'row-opened', row: 'description', now: LATER });

    expect(tester.getState().error).toBeNull();
  });

  test('a saved name is trimmed and becomes the value a refusal restores', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: '  Wool coat  ' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat' },
      saved: { name: 'Wool coat' },
      error: null,
    });

    tester.send({
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat' },
      error: { field: 'name', message: 'A design needs a name.' },
    });
  });

  test('choosing a Category updates the draft until the write confirms it', () => {
    const tester = session();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      saved: { categoryId: DRESS },
    });

    tester.send({
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: KNITWEAR },
    });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      saved: { categoryId: KNITWEAR },
    });
  });

  test('a refused selection falls back to the committed one', () => {
    const tester = session();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR });
    tester.send({ type: 'choice-chosen', field: 'collectionId', value: 'collection-spring' });
    tester.send({ type: 'field-refused', field: 'categoryId', message: 'This design is not here.' });
    tester.send({
      type: 'field-refused',
      field: 'collectionId',
      message: 'This design is not here.',
    });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: DRESS, collectionId: null },
      saved: { categoryId: DRESS, collectionId: null },
    });
  });

  test('clearing a selection is a draft like any other', () => {
    const tester = session();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: null });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: null },
      saved: { categoryId: DRESS },
    });
  });

  test('a cleared description comes back as an empty draft, not the text null', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'description', value: '' });
    tester.send({
      type: 'field-saved',
      field: 'description',
      design: { ...DESIGN, description: null },
    });

    expect(tester.getState()).toMatchObject({
      draft: { description: '' },
      saved: { description: null },
      error: null,
    });
  });

  test('a saved Specification row becomes its stored value and collapses', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'text-changed', field: 'silhouette', value: '  Relaxed A-line  ' });
    tester.send({
      type: 'field-saved',
      field: 'silhouette',
      design: { ...DESIGN, silhouette: 'Relaxed A-line' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { silhouette: 'Relaxed A-line' },
      saved: { silhouette: 'Relaxed A-line' },
      editing: null,
    });
  });

  test('saving a row that has since closed does not collapse the open one', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'row-opened', row: 'neckline', now: NOW });
    tester.send({
      type: 'field-saved',
      field: 'silhouette',
      design: { ...DESIGN, silhouette: 'Relaxed A-line' },
    });

    expect(tester.getState().editing).toBe('neckline');
  });

  test('a saved field leaves the other drafts where they are', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat', description: 'Heavy twill' },
    });
  });

  test('the drafts that still differ from the row are what a flush writes', () => {
    const tester = session();
    expect(unwrittenFields(tester.getState())).toBeNull();

    tester.send({ type: 'text-changed', field: 'name', value: '  Wool coat  ' });
    tester.send({ type: 'text-changed', field: 'description', value: ' Heavy twill ' });
    tester.send({ type: 'text-changed', field: 'silhouette', value: ' Relaxed A-line ' });

    expect(unwrittenFields(tester.getState())).toEqual({
      name: 'Wool coat',
      description: ' Heavy twill ',
      silhouette: ' Relaxed A-line ',
    });
  });

  test('a blank name is never pending, but a real description still is', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });

    expect(unwrittenFields(tester.getState())).toEqual({ description: 'Heavy twill' });
  });

  test('clearing the description is a pending write', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'description', value: '' });

    expect(unwrittenFields(tester.getState())).toEqual({ description: '' });
  });

  test('clearing a Specification row is a pending write', () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

    tester.send({
      type: 'design-loaded',
      design: { ...DESIGN, neckline: 'Wide boat neck' },
    });
    tester.send({ type: 'text-changed', field: 'neckline', value: '' });

    expect(unwrittenFields(tester.getState())).toEqual({ neckline: '' });
  });

  test('whitespace-only Specification input is not a change', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'constructionNotes', value: '   ' });

    expect(unwrittenFields(tester.getState())).toBeNull();
  });

  test('a draft written by leaving the app becomes the value a later refusal restores', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    tester.send({ type: 'drafts-written', design: { ...DESIGN, name: 'Wool coat' } });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat' },
      saved: { name: 'Wool coat' },
    });
  });
});

describe('tab changes', () => {
  test('a half-typed draft is written when its tab is left, and nothing is recorded', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'text-changed', field: 'silhouette', value: '  Relaxed A-line  ' });
    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { silhouette: '  Relaxed A-line  ' },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      tab: 'creativeDirection',
      editing: null,
      draft: { silhouette: '  Relaxed A-line  ' },
      saved: { silhouette: null },
    });
  });

  test('the visit still records one Event after a tab change and close', () => {
    const tester = session();

    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: NOW });
    tester.send({ type: 'row-opened', row: 'mood', now: NOW });
    tester.send({ type: 'text-changed', field: 'mood', value: ' Romantic, relaxed ' });
    tester.send({ type: 'tab-changed', tab: 'specification', now: LATER });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, mood: 'Romantic, relaxed' },
    });
    tester.send({ type: 'session-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { mood: ' Romantic, relaxed ' },
        now: LATER,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, mood: 'Romantic, relaxed' },
        now: LATER,
      },
    ]);
  });

  test('a tab change with nothing half-typed declares no work', () => {
    const tester = session();

    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().tab).toBe('creativeDirection');
  });

  test('asking for the tab already shown changes nothing', () => {
    const tester = session();
    const before = tester.getState();

    tester.send({ type: 'tab-changed', tab: 'specification', now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toBe(before);
  });

  test('leaving a tab with a blank name restores the saved one', () => {
    const tester = session();

    tester.send({ type: 'row-opened', row: 'name', now: NOW });
    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toMatchObject({
      tab: 'creativeDirection',
      editing: null,
      draft: { name: 'Silk slip dress' },
    });
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

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
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

  test('a Specification draft is written and recorded like any other field', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'silhouette', value: ' Relaxed A-line ' });
    tester.send({ type: 'text-changed', field: 'measurements', value: 'Bust 96, waist 104' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { silhouette: ' Relaxed A-line ', measurements: 'Bust 96, waist 104' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, silhouette: 'Relaxed A-line', measurements: 'Bust 96, waist 104' },
        now: NOW,
      },
    ]);
  });

  test('a Specification row cleared at close is recorded as null', () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));
    const filled = { ...DESIGN, neckline: 'Wide boat neck' };

    tester.send({ type: 'design-loaded', design: filled });
    tester.send({ type: 'text-changed', field: 'neckline', value: '   ' });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { neckline: '   ' },
        now: NOW,
      },
      {
        type: 'record-session',
        designId: DESIGN_ID,
        before: filled,
        after: DESIGN,
        now: NOW,
      },
    ]);
  });

  test('leaving the app writes the drafts but records nothing', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
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

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
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

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR });
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

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'field-saved', field: 'name', design: { ...DESIGN, name: 'Wool coat' } });
    tester.send({ type: 'text-changed', field: 'name', value: 'Silk slip dress' });
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

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR });
    tester.send({
      type: 'field-saved',
      field: 'categoryId',
      design: { ...DESIGN, categoryId: KNITWEAR },
    });
    tester.send({ type: 'choice-chosen', field: 'categoryId', value: DRESS });
    tester.send({ type: 'field-saved', field: 'categoryId', design: DESIGN });
    tester.send({ type: 'session-closed', now: NOW });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a second close declares nothing more', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'session-closed', now: NOW });

    const firstClose = tester.getEffects();
    tester.send({ type: 'session-closed', now: LATER });

    expect(tester.getEffects()).toEqual(firstClose);
  });

  test('a close writes no blank name but still writes a valid description', () => {
    const tester = session();

    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });
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

    tester.send({ type: 'text-changed', field: 'description', value: '  Heavy twill  ' });
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
