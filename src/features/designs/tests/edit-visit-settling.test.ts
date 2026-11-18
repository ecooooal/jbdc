import { createReducerTester } from '@/shared/testing/reducer-tester';
import { createInitialEditDesignState, editDesignReducer } from '../lib/edit-design-reducer';
import type { MaterialUse } from '../lib/records';
import {
  DESIGN,
  DESIGN_ID,
  DRESS,
  KNITWEAR,
  LATER,
  NOW,
  WOOL_USE,
  visit,
  visitWithUse,
} from './edit-design-fixtures';

describe('the visit settles its writes and records one Event', () => {
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
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 0 });
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
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: LATER,
      },
    ]);

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });

    // The outcome events update the visit; only the settle reports the write.
    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: LATER,
      },
    ]);

    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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

  test('a visit that corrects a recorded use records it as changed', () => {
    const tester = visitWithUse();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: corrected }, now: NOW });
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

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: WOOL_USE.id }, now: NOW });
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
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: corrected }, now: NOW });
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

  test('a use added then removed in one visit hands History an unchanged row', () => {
    const tester = visit();

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'use-removed', useId: WOOL_USE.id }, now: NOW });
    tester.send({ type: 'visit-closed', now: LATER });

    // The visit stored nothing net, so History finds no diff to record.
    expect(tester.getEffects()).toEqual([
      {
        type: 'record-visit',
        designId: DESIGN_ID,
        before: DESIGN,
        after: DESIGN,
        materialUses: { before: [], after: [] },
        now: LATER,
      },
    ]);
    expect(tester.getState().storedUses).toEqual([]);
  });

  test('closing after a draft writes it, then records the whole visit once', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: NOW,
      },
    ]);

    tester.send({
      type: 'drafts-written',
      design: { ...DESIGN, name: 'Wool coat' },
      patch: { name: 'Wool coat' },
    });
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
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
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
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
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Silk slip dress' } },
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
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
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
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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

  test('a close whose name write found no row settles without recording', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: NOW,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 1 });

    tester.send({ type: 'design-missing', designId: DESIGN_ID });

    // The row is gone: nothing the close still owes can be stored, so it stops
    // waiting and records no Event.
    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: NOW,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      closing: { at: NOW, writesOwed: 0 },
      error: null,
    });
  });

  test('a close whose Material use write found no row settles without recording', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-editor-opened', materialUse: WOOL_USE, now: NOW });
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 1 });

    tester.send({ type: 'design-missing', designId: DESIGN_ID });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState().closing).toEqual({ at: LATER, writesOwed: 0 });
  });

  test('a write that found no row outside a close changes nothing', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'app-backgrounded', now: NOW });
    const flushed = tester.getState();

    tester.send({ type: 'design-missing', designId: DESIGN_ID });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: NOW,
      },
    ]);
    expect(tester.getState()).toEqual(flushed);
    expect(tester.getState().closing).toBeNull();
  });

  test('a design-missing outcome for another design leaves the visit waiting', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send({ type: 'visit-closed', now: NOW });
    const closed = tester.getState();

    // A late answer for a surface that has moved on is not this visit's.
    tester.send({ type: 'design-missing', designId: 'design-wool-coat' });

    expect(tester.getState()).toEqual(closed);
    expect(tester.getState().closing).toEqual({ at: NOW, writesOwed: 1 });
    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: NOW,
      },
    ]);
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
