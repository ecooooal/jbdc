import { createInitialAddMaterialUseState } from '../lib/add-material-use-reducer';
import { materialUseChoices } from '../lib/edit-design-reducer';
import type { MaterialUse } from '../lib/records';
import {
  DESIGN,
  DESIGN_ID,
  LATER,
  NOW,
  WOOL_USE,
  adding,
  chosen,
  opened,
  visitWithUse,
} from './edit-design-fixtures';

describe('the Material use editor', () => {
  test('opening a use seeds the editor with its Material, colour, and role', () => {
    const tester = opened();

    expect(tester.getState().materialUsePanel).toEqual({
      kind: 'edit',
      materialId: WOOL_USE.materialId,
      colour: 'Charcoal',
      role: 'main',
      stored: WOOL_USE,
      error: null,
    });
  });

  test('the Add form and a correction share one panel', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-add-opened', now: NOW });
    expect(tester.getState().materialUsePanel).toEqual({
      kind: 'add',
      editor: createInitialAddMaterialUseState(),
    });

    tester.send({ type: 'material-use-editor-opened', materialUse: WOOL_USE, now: LATER });
    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: 'edit',
      stored: WOOL_USE,
    });

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'closed' }, now: LATER });
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('a typed colour is not written until the field is left', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    expect(tester.getEffects()).toEqual([]);

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-committed' }, now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      materialUsePanel: { kind: 'edit', colour: 'Black' },
    });
  });

  test('changing the Material writes at once, carrying a typed colour with it', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    tester.send({
      type: 'material-use-panel-fact',
      fact: { type: 'material-chosen', materialId: 'material-silk' },
      now: LATER,
    });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { materialId: 'material-silk', colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({
      materialUsePanel: { kind: 'edit', materialId: 'material-silk' },
    });
  });

  test('changing the role writes at once', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'role-chosen', role: 'secondary' }, now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { role: 'secondary' } }] },
        now: LATER,
      },
    ]);
  });

  test('Done writes the colour draft and closes the editor', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'closed' }, now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('changing tabs writes the colour draft and closes the editor', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    tester.send({ type: 'tab-changed', tab: 'creativeDirection', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
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

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: 'Black' }, now: NOW });
    tester.send({ type: 'visit-closed', now: LATER });

    expect(tester.getEffects().slice(-1)).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: corrected }, now: NOW });
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: '  Black  ' }, now: NOW });
    tester.send({ type: 'visit-closed', now: LATER });

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: corrected }, now: NOW });
    tester.send({ type: 'write-settled', designId: DESIGN_ID });

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

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'colour-changed', colour: '   ' }, now: NOW });
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'closed' }, now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().materialUsePanel).toBeNull();
  });

  test('removing a use declares the write instead of performing it', () => {
    const tester = opened();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'remove-pressed' }, now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'remove', useId: WOOL_USE.id }] },
        now: LATER,
      },
    ]);
    expect(tester.getState().materialUsePanel).toMatchObject({ kind: 'edit' });
  });

  test('pressing remove with no editor open declares nothing', () => {
    const tester = visitWithUse();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'remove-pressed' }, now: LATER });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a saved correction becomes the row and updates what the visit holds', () => {
    const tester = opened();
    const corrected: MaterialUse = { ...WOOL_USE, colour: 'Black', role: 'secondary' };

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: corrected }, now: NOW });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: 'edit',
        colour: 'Black',
        role: 'secondary',
        stored: corrected,
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
    tester.send({ type: 'material-use-panel-fact', fact: { type: 'saved', materialUse: { ...WOOL_USE, colour: 'Black' } }, now: NOW });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: {
        kind: 'edit',
        materialId: silkUse.materialId,
        colour: 'Ivory',
        stored: silkUse,
      },
    });
    expect(tester.getState().storedUses).toEqual([{ ...WOOL_USE, colour: 'Black' }]);
  });

  test('opening a text row writes and closes the Material use editor', () => {
    const tester = opened();

    tester.send({
      type: 'material-use-panel-fact',
      fact: { type: 'colour-changed', colour: 'Black' },
      now: NOW,
    });
    tester.send({ type: 'row-opened', row: 'silhouette', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'correct', useId: WOOL_USE.id, patch: { colour: 'Black' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState()).toMatchObject({ editing: 'silhouette', materialUsePanel: null });
  });

  test('the picker keeps the stored Material when the live list no longer has it', () => {
    const tester = opened();
    const panel = tester.getState().materialUsePanel;

    if (panel?.kind !== 'edit') throw new Error('expected the correction panel');

    expect(materialUseChoices([{ id: 'material-silk', name: 'Silk crêpe' }], panel)).toEqual([
      { id: 'material-silk', name: 'Silk crêpe' },
      { id: WOOL_USE.materialId, name: WOOL_USE.materialName },
    ]);
    expect(
      materialUseChoices([{ id: WOOL_USE.materialId, name: 'Merino' }], panel)
    ).toEqual([{ id: WOOL_USE.materialId, name: 'Merino' }]);
  });
});

describe('the add Material use panel', () => {
  test('opens on no Material, a blank colour, the main role, and creation closed', () => {
    const tester = adding();

    expect(tester.getState().materialUsePanel).toEqual({
      kind: 'add',
      editor: {
        materialId: null,
        colour: '',
        role: 'main',
        inline: { open: false, name: '', error: null },
        error: null,
      },
    });
  });

  test('choosing a Material, colour, and role changes only the choices', () => {
    const tester = chosen();

    tester.send({ type: 'material-use-panel-fact', fact: { type: 'role-chosen', role: 'secondary' }, now: LATER });

    expect(tester.getEffects()).toEqual([]);
    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: 'add',
      editor: { materialId: 'material-wool', colour: 'Charcoal', role: 'secondary' },
    });
  });

  test('confirm declares one add effect carrying the chosen Material, colour, and role', () => {
    const tester = chosen();

    tester.send({ type: 'material-use-add-confirmed', now: LATER });

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { uses: [{ kind: 'add', input: { materialId: 'material-wool', colour: 'Charcoal', role: 'main' } }] },
        now: LATER,
      },
    ]);
    expect(tester.getState().materialUsePanel).toMatchObject({ kind: 'add' });
  });

  test('confirm with no Material declares nothing', () => {
    const tester = adding();

    tester.send({ type: 'material-use-add-confirmed', now: LATER });

    expect(tester.getEffects()).toEqual([]);
  });

  test('a stored add closes the panel and keeps the use it stored', () => {
    const tester = chosen();

    tester.send({ type: 'material-use-added', materialUse: WOOL_USE });

    expect(tester.getState()).toMatchObject({
      materialUsePanel: null,
      storedUses: [WOOL_USE],
    });
  });

  test('a Material created inline becomes the chosen Material', () => {
    const tester = adding();

    tester.send({ type: 'material-use-inline-fact', fact: { type: 'opened' } });
    tester.send({
      type: 'material-use-inline-fact',
      fact: { type: 'name-changed', name: 'Silk crêpe' },
    });
    tester.send({
      type: 'material-use-inline-fact',
      fact: { type: 'created', id: 'material-silk' },
    });

    expect(tester.getState().materialUsePanel).toMatchObject({
      kind: 'add',
      editor: {
        materialId: 'material-silk',
        inline: { open: false, name: '', error: null },
      },
    });
  });
});
