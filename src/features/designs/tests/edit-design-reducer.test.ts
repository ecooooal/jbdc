import { createReducerTester } from '@/shared/testing/reducer-tester';
import {
  createInitialEditDesignState,
  editDesignReducer,
  stampedEvent,
  unwrittenFields,
} from '../lib/edit-design-reducer';
import type { DesignFields, MaterialUse } from '../lib/records';

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

const WOOL_USE: MaterialUse = {
  id: 'use-wool',
  designId: DESIGN_ID,
  materialId: 'material-wool',
  materialName: 'Wool',
  colour: 'Charcoal',
  role: 'main',
  createdAt: NOW,
};

/** A visit that has read its Design and is ready to edit. */
function visit() {
  const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

  tester.send({ type: 'design-loaded', design: DESIGN });

  return tester;
}

/** A visit whose Design already has one recorded Material use. */
function visitWithUse() {
  const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));

  tester.send({ type: 'design-loaded', design: DESIGN, materialUses: [WOOL_USE] });

  return tester;
}

describe('edit design reducer', () => {
  test('starts unseeded, with the Design it edits and no baseline yet', () => {
    expect(createInitialEditDesignState(DESIGN_ID)).toEqual({
      designId: DESIGN_ID,
      isSeeded: false,
      closing: null,
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
      stored: {
        name: '',
        description: null,
        categoryId: null,
        collectionId: null,
        ...EMPTY_SPECIFICATION,
        ...EMPTY_CREATIVE_DIRECTION,
      },
      storedUses: [],
      visitStart: null,
      visitStartUses: [],
      editing: null,
      materialUsePanel: null,
      tab: 'specification',
      error: null,
    });
  });

  test('seeds the drafts, the row values, and the visit baseline from the first read', () => {
    expect(visit().getState()).toEqual({
      designId: DESIGN_ID,
      isSeeded: true,
      closing: null,
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
      stored: DESIGN,
      storedUses: [],
      visitStart: DESIGN,
      visitStartUses: [],
      editing: null,
      materialUsePanel: null,
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
    const tester = visit();
    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });

    const editing = tester.getState();
    tester.send({ type: 'design-loaded', design: DESIGN });

    expect(tester.getState()).toBe(editing);
  });

  test('typing a name clears the previous refusal', () => {
    const tester = visit();

    tester.send({
      type: 'field-refused',
      field: 'name',
      message: 'A design needs a name.',
    });
    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });

    expect(tester.getState()).toMatchObject({ draft: { name: 'Wool coat' }, error: null });
  });

  test('one row is open at a time', () => {
    const tester = visit();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    expect(tester.getState().editing).toBe('silhouette');

    tester.send({ type: 'row-opened', row: 'neckline', now: NOW });
    expect(tester.getState().editing).toBe('neckline');

    tester.send({ type: 'row-closed' });
    expect(tester.getState().editing).toBeNull();
  });

  test('opening another row writes the draft the owner is leaving', () => {
    const tester = visit();

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
    const tester = visit();

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
    const tester = visit();

    tester.send({ type: 'row-opened', row: 'name', now: NOW });
    tester.send({ type: 'field-refused', field: 'name', message: 'A design needs a name.' });
    tester.send({ type: 'row-opened', row: 'description', now: LATER });

    expect(tester.getState().error).toBeNull();
  });

  test('a saved name is trimmed and becomes the value a refusal restores', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: '  Wool coat  ' });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: '  Wool coat  ' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat' },
      stored: { name: 'Wool coat' },
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
    const tester = visit();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR, now: NOW });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      stored: { categoryId: DRESS },
    });

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, categoryId: KNITWEAR },
      patch: { categoryId: KNITWEAR },
    });
    expect(tester.getState()).toMatchObject({
      draft: { categoryId: KNITWEAR },
      stored: { categoryId: KNITWEAR },
    });
  });

  test('a refused selection falls back to the committed one', () => {
    const tester = visit();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR, now: NOW });
    tester.send({
      type: 'choice-chosen',
      field: 'collectionId',
      value: 'collection-spring',
      now: NOW,
    });
    tester.send({ type: 'field-refused', field: 'categoryId', message: 'This design is not here.' });
    tester.send({
      type: 'field-refused',
      field: 'collectionId',
      message: 'This design is not here.',
    });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: DRESS, collectionId: null },
      stored: { categoryId: DRESS, collectionId: null },
    });
  });

  test('clearing a selection is a draft like any other', () => {
    const tester = visit();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: null, now: NOW });

    expect(tester.getState()).toMatchObject({
      draft: { categoryId: null },
      stored: { categoryId: DRESS },
    });
  });

  test('a cleared description comes back as an empty draft, not the text null', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'description', value: '' });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, description: null },
      patch: { description: '' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { description: '' },
      stored: { description: null },
      error: null,
    });
  });

  test('a saved Specification row becomes its stored value and collapses', () => {
    const tester = visit();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'text-changed', field: 'silhouette', value: '  Relaxed A-line  ' });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, silhouette: 'Relaxed A-line' },
      patch: { silhouette: '  Relaxed A-line  ' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { silhouette: 'Relaxed A-line' },
      stored: { silhouette: 'Relaxed A-line' },
      editing: null,
    });
  });

  test('saving a row that has since closed does not collapse the open one', () => {
    const tester = visit();

    tester.send({ type: 'row-opened', row: 'silhouette', now: NOW });
    tester.send({ type: 'row-opened', row: 'neckline', now: NOW });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, silhouette: 'Relaxed A-line' },
      patch: { silhouette: '  Relaxed A-line  ' },
    });

    expect(tester.getState().editing).toBe('neckline');
  });

  test('a saved field leaves the other drafts where they are', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat', description: 'Heavy twill' },
    });
  });

  test('the drafts that still differ from the row are what a flush writes', () => {
    const tester = visit();
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
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });

    expect(unwrittenFields(tester.getState())).toEqual({ description: 'Heavy twill' });
  });

  test('clearing the description is a pending write', () => {
    const tester = visit();

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
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'constructionNotes', value: '   ' });

    expect(unwrittenFields(tester.getState())).toBeNull();
  });

  test('a draft written by leaving the app becomes the value a later refusal restores', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });

    expect(tester.getState()).toMatchObject({
      draft: { name: 'Wool coat' },
      stored: { name: 'Wool coat' },
    });
  });
});

describe('tab changes', () => {
  test('a half-typed draft is written when its tab is left, and nothing is recorded', () => {
    const tester = visit();

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
      stored: { silhouette: null },
    });
  });

  test('the visit still records one Event after a tab change and close', () => {
    const tester = visit();

    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: NOW });
    tester.send({ type: 'row-opened', row: 'mood', now: NOW });
    tester.send({ type: 'text-changed', field: 'mood', value: ' Romantic, relaxed ' });
    tester.send({ type: 'tab-changed', tab: 'specification', now: LATER });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, mood: 'Romantic, relaxed' },
      patch: { mood: ' Romantic, relaxed ' },
    });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { mood: ' Romantic, relaxed ' },
        now: LATER,
      },
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, mood: 'Romantic, relaxed' },
        materialUses: { before: [], after: [] },
        now: LATER,
      },
    ]);
  });

  test('a tab change with nothing half-typed declares no work', () => {
    const tester = visit();

    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().tab).toBe('creativeDirection');
  });

  test('asking for the tab already shown changes nothing', () => {
    const tester = visit();
    const before = tester.getState();

    tester.send({ type: 'tab-changed', tab: 'specification', now: NOW });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState()).toBe(before);
  });

  test('leaving a tab with a blank name restores the saved one', () => {
    const tester = visit();

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

describe('edit visit boundary', () => {
  test('a visit that changed nothing still hands History the row it found', () => {
    const tester = visit();

    tester.send({ type: 'visit-closed', now: NOW });

    // Whether the row changed is History's to decide, with the diff it stores.
    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: NOW, outstanding: 0 });
  });

  test('a visit that only adds a Material use records one Event naming the use', () => {
    const tester = visit();

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [WOOL_USE] },
        now: LATER,
      },
    ]);
  });

  test('a Material use and a field change in one visit are one Event', () => {
    const tester = visit();

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });
    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: LATER });

    // The close writes first; the Event waits for the write to report back.
    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: LATER,
      },
    ]);

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, name: 'Wool coat' },
        materialUses: { before: [], after: [WOOL_USE] },
        now: LATER,
      },
    ]);
  });

  test('a corrected use replaces what the visit holds', () => {
    const tester = visitWithUse();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    tester.send({ type: 'material-use-saved', materialUse: corrected });

    expect(tester.getState().storedUses).toEqual([corrected]);
    expect(tester.getState().visitStartUses).toEqual([WOOL_USE]);
  });

  test('a removed use leaves what the visit holds', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-removed', useId: WOOL_USE.id });

    expect(tester.getState().storedUses).toEqual([]);
    expect(tester.getState().visitStartUses).toEqual([WOOL_USE]);
  });

  test('a visit that corrects a recorded use records it as changed', () => {
    const tester = visitWithUse();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    tester.send({ type: 'material-use-saved', materialUse: corrected });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [WOOL_USE], after: [corrected] },
        now: LATER,
      },
    ]);
  });

  test('a visit that removes a recorded use records the removal', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-removed', useId: WOOL_USE.id });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [WOOL_USE], after: [] },
        now: LATER,
      },
    ]);
  });

  test('a use added then corrected in one visit records the corrected use', () => {
    const tester = visit();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black' };

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });
    tester.send({ type: 'material-use-saved', materialUse: corrected });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [corrected] },
        now: LATER,
      },
    ]);
  });

  test('a use added then removed in one visit records no Event', () => {
    const tester = visit();

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });
    tester.send({ type: 'material-use-removed', useId: WOOL_USE.id });
    const firstClose = tester.getEffects();
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual(firstClose);
    expect(tester.getState().storedUses).toEqual([]);
  });

  test('closing after a draft writes it, then records the whole visit once', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
    ]);

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, name: 'Wool coat' },
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('a Specification draft is written and recorded like any other field', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'silhouette', value: ' Relaxed A-line ' });
    tester.send({ type: 'text-changed', field: 'measurements', value: 'Bust 96, waist 104' });
    tester.send({ type: 'visit-closed', now: NOW });

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, silhouette: 'Relaxed A-line', measurements: 'Bust 96, waist 104' },
      patch: { silhouette: ' Relaxed A-line ', measurements: 'Bust 96, waist 104' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, silhouette: 'Relaxed A-line', measurements: 'Bust 96, waist 104' },
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('a Specification row cleared at close is recorded as null', () => {
    const tester = createReducerTester(editDesignReducer, createInitialEditDesignState(DESIGN_ID));
    const filled = { ...DESIGN, neckline: 'Wide boat neck' };

    tester.send({ type: 'design-loaded', design: filled });
    tester.send({ type: 'text-changed', field: 'neckline', value: '   ' });
    tester.send({ type: 'visit-closed', now: NOW });

    tester.send({
      type: 'drafts-written',
      design: DESIGN,
      patch: { neckline: '   ' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: filled,
        after: DESIGN,
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('leaving the app writes the drafts but records nothing', () => {
    const tester = visit();

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
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, name: 'Wool coat' },
        materialUses: { before: [], after: [] },
        now: LATER,
      },
    ]);
  });

  test('a selection already written is recorded without a close-time write', () => {
    const tester = visit();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR, now: NOW });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, categoryId: KNITWEAR },
      patch: { categoryId: KNITWEAR },
    });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, categoryId: KNITWEAR },
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('a net-zero visit restores the earlier value but writes no Event', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });
    tester.send({ type: 'text-changed', field: 'name', value: 'Silk slip dress' });
    tester.send({ type: 'visit-closed', now: NOW });

    // The close writes the name back, but the row ends where the visit found
    // it, so no Event is recorded.
    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Silk slip dress' },
        now: NOW,
      },
    ]);
  });

  test('a selection written away and back hands History an unchanged row', () => {
    const tester = visit();

    tester.send({ type: 'choice-chosen', field: 'categoryId', value: KNITWEAR, now: NOW });
    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, categoryId: KNITWEAR },
      patch: { categoryId: KNITWEAR },
    });
    tester.send({ type: 'choice-chosen', field: 'categoryId', value: DRESS, now: NOW });
    tester.send({ type: 'drafts-written', design: DESIGN, patch: { categoryId: DRESS } });
    tester.send({ type: 'visit-closed', now: NOW });

    const recording = tester
      .getEffects()
      .filter((effect) => effect.type === 'record-visit');

    expect(recording).toHaveLength(1);
    expect(recording[0]).toMatchObject({ before: DESIGN, after: DESIGN });
  });

  test('a second close declares nothing more', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
    ]);

    const firstClose = tester.getEffects();
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual(firstClose);
  });

  test('a close writes no blank name but still writes a valid description', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'text-changed', field: 'description', value: 'Heavy twill' });
    tester.send({ type: 'visit-closed', now: NOW });

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, description: 'Heavy twill' },
      patch: { description: 'Heavy twill' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, description: 'Heavy twill' },
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('the recorded description is the stored one, not the raw draft', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'description', value: '  Heavy twill  ' });
    tester.send({ type: 'visit-closed', now: NOW });

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, description: 'Heavy twill' },
      patch: { description: '  Heavy twill  ' },
    });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: { ...DESIGN, description: 'Heavy twill' },
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
  });

  test('a refused write is never recorded as if it landed', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: '   ' });
    tester.send({ type: 'visit-closed', now: NOW });

    // A blank name is refused before the row is touched, so the close settles
    // with the stored row and History writes no Event.
    tester.send({ type: 'field-refused', field: 'name', message: 'A design needs a name.' });

    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [] },
        now: NOW,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      stored: { name: 'Silk slip dress' },
      closing: { at: NOW, outstanding: 0 },
    });
  });

  test('a close whose name write found no row settles without recording', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: NOW, outstanding: 1 });

    tester.send({ type: 'nothing-stored' });

    // The row is gone: nothing the close still owes can be stored, so it stops
    // waiting and records no Event.
    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: NOW,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      closing: { at: NOW, outstanding: 0 },
      error: null,
    });
  });

  test('a close whose Material use write found no row settles without recording', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-editor-opened', materialUse: WOOL_USE, now: NOW });
    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: LATER, outstanding: 1 });

    tester.send({ type: 'nothing-stored' });

    expect(tester.getEffects()).toHaveLength(1);
    expect(tester.getState().closing).toEqual({ at: LATER, outstanding: 0 });
  });

  test('a write that found no row outside a close changes nothing', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    const flushed = tester.getState();

    tester.send({ type: 'nothing-stored' });

    expect(tester.getEffects()).toHaveLength(1);
    expect(tester.getState()).toEqual(flushed);
    expect(tester.getState().closing).toBeNull();
  });

  test('a close before the read lands declares nothing', () => {
    const tester = createReducerTester(
      editDesignReducer,
      createInitialEditDesignState(DESIGN_ID)
    );

    tester.send({ type: 'visit-closed', now: NOW });

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

describe('Material use editor', () => {
  function opened() {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-editor-opened', materialUse: WOOL_USE, now: NOW });

    return tester;
  }

  test('opening a use seeds the editor with its Material, colour, and role', () => {
    const tester = opened();

    expect(tester.getState().materialUsePanel).toEqual({
      kind: 'edit',
      editor: {
        materialId: WOOL_USE.materialId,
        colour: 'Charcoal',
        role: 'main',
        saved: WOOL_USE,
        error: null,
      },
    });
  });

  test('the Add form and a correction share one panel', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-add-opened', now: NOW });
    expect(tester.getState().materialUsePanel).toEqual({ kind: 'add' });

    tester.send({ type: 'material-use-editor-opened', materialUse: WOOL_USE, now: LATER });
    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: 'edit',
      editor: { saved: WOOL_USE },
    });

    tester.send({ type: 'material-use-panel-closed', now: LATER });
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('a typed colour is not written until the field is left', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: 'material-use-colour-committed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      materialUsePanel: { kind: 'edit', editor: { colour: 'Black' } },
    });
  });

  test('changing the Material writes at once, carrying a typed colour with it', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({
      type: 'material-use-material-chosen',
      materialId: 'material-silk',
      now: LATER,
    });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { materialId: 'material-silk', colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      materialUsePanel: { kind: 'edit', editor: { materialId: 'material-silk' } },
    });
  });

  test('changing the role writes at once', () => {
    const tester = opened();

    tester.send({ type: 'material-use-role-chosen', role: 'secondary', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { role: 'secondary' },
        now: LATER,
      },
    ]);
  });

  test('Done writes the colour draft and closes the editor', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({ type: 'material-use-panel-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('changing tabs writes the colour draft and closes the editor', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      tab: 'creativeDirection',
      materialUsePanel: null,
    });
  });

  test('a close writes the colour draft and records the use it becomes', () => {
    const tester = opened();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black' };

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);

    tester.send({ type: 'material-use-saved', materialUse: corrected });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [WOOL_USE], after: [corrected] },
        now: LATER,
      },
    ]);
  });

  test('a close records the colour the write stores, not the raw draft', () => {
    const tester = opened();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black' };

    tester.send({ type: 'material-use-colour-changed', colour: '  Black  ' });
    tester.send({ type: 'visit-closed', now: LATER });

    tester.send({ type: 'material-use-saved', materialUse: corrected });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [WOOL_USE], after: [corrected] },
        now: LATER,
      },
    ]);
  });

  test('a blank colour is not a write', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: '   ' });
    tester.send({ type: 'material-use-panel-closed', now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('removing a use declares the write instead of performing it', () => {
    const tester = opened();

    tester.send({ type: 'material-use-remove-pressed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'remove-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        now: LATER,
      },
    ]);
    expect(tester.getState().materialUsePanel).toMatchObject({ kind: 'edit' });
  });

  test('pressing remove with no editor open declares nothing', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-remove-pressed', now: LATER });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a saved correction becomes the row and updates what the visit holds', () => {
    const tester = opened();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    tester.send({ type: 'material-use-saved', materialUse: corrected });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: 'edit',
        editor: { colour: 'Black', role: 'secondary', saved: corrected },
      },
    });
    expect(tester.getState().storedUses).toEqual([corrected]);
  });

  test('a late saved correction does not overwrite a different open editor', () => {
    const tester = opened();
    const silkUse: MaterialUse = {
      ...WOOL_USE,
      id: 'use-silk',
      materialId: 'material-silk',
      materialName: 'Silk crêpe',
      colour: 'Ivory',
      role: 'secondary',
    };

    tester.send({ type: 'material-use-editor-opened', materialUse: silkUse, now: LATER });
    tester.send({ type: 'material-use-saved', materialUse: { ...WOOL_USE, colour: 'Black' } });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: 'edit',
        editor: { materialId: silkUse.materialId, colour: 'Ivory', saved: silkUse },
      },
    });
    expect(tester.getState().storedUses).toEqual([{ ...WOOL_USE, colour: 'Black' }]);
  });

  test('a refusal restores the stored use', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: '   ' });
    tester.send({
      type: 'material-use-refused',
      useId: WOOL_USE.id,
      message: 'A material use needs a colour.',
    });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: 'edit',
        editor: { colour: 'Charcoal', error: 'A material use needs a colour.' },
      },
    });
  });

  test('opening a text row writes and closes the Material use editor', () => {
    const tester = opened();

    tester.send({ type: 'material-use-colour-changed', colour: 'Black' });
    tester.send({ type: 'row-opened', row: 'silhouette', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-material-use',
        designId: DESIGN_ID,
        useId: WOOL_USE.id,
        patch: { colour: 'Black' },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({ editing: 'silhouette', materialUsePanel: null });
  });
});

describe('the visit stamps the time on the gestures the screen sends', () => {
  test('a gesture that carries a time arrives with the one the visit saw', () => {
    expect(stampedEvent({ type: 'visit-closed' }, NOW)).toEqual({
      type: 'visit-closed',
      now: NOW,
    });
    expect(stampedEvent({ type: 'row-opened', row: 'name' }, NOW)).toEqual({
      type: 'row-opened',
      row: 'name',
      now: NOW,
    });
    expect(stampedEvent({ type: 'app-backgrounded' }, LATER)).toEqual({
      type: 'app-backgrounded',
      now: LATER,
    });
  });

  test('a gesture that never carried a time gains none', () => {
    expect(
      stampedEvent({ type: 'text-changed', field: 'description', value: 'Bias cut' }, NOW)
    ).toEqual({ type: 'text-changed', field: 'description', value: 'Bias cut' });
    expect(stampedEvent({ type: 'row-closed' }, NOW)).toEqual({ type: 'row-closed' });
  });

  test('a gesture the screen sends declares its write at the stamped time', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send(stampedEvent({ type: 'visit-closed' }, LATER));

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-drafts',
        designId: DESIGN_ID,
        patch: { name: 'Wool coat' },
        now: LATER,
      },
    ]);
  });
});
