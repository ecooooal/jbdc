import type { MaterialUseRole } from '@/features/database';
import {
  DESIGN_CHOICE_FIELDS,
  DESIGN_TEXT_FIELDS,
  draftsFromFields,
  EMPTY_DESIGN_DRAFTS,
  EMPTY_DESIGN_FIELDS,
  type DesignChoiceEditableField,
  type DesignDrafts,
  type DesignEditableField,
  type DesignTextEditableField,
} from './fields';
import { designNameProblem } from './limits';
import {
  createInitialEditMaterialUseState,
  editMaterialUseReducer,
  type EditMaterialUseState,
} from './edit-material-use-reducer';
import { normalizeOptionalText } from './optional-text';
import type {
  DesignFields,
  MaterialUse,
  MaterialUsesPair,
  UpdateDesignInput,
  UpdateMaterialUseInput,
} from './records';
import { DESIGN_SECTIONS, type DesignSectionTab } from './sections';

/**
 * The one Materials editor that can be open: adding a use, or correcting one.
 * They cannot both be open, so they are one field (FRONTEND_STATE).
 */
export type MaterialUsePanel =
  | { kind: 'add' }
  | { kind: 'edit'; editor: EditMaterialUseState };

/**
 * Edit's decisions: the drafts, the row's current values, the visit baseline,
 * the one open row, and the one refusal on screen. The live read seeds it once;
 * later reads do not overwrite a draft the owner is still editing.
 *
 * A visit is one trip through the Edit screen (ADR-0004): `visitStart` is the row the
 * first read returned and never advances, so every write in the visit
 * coalesces into one Event at close.
 */
export type EditDesignState = {
  /** The Design this visit edits; every effect names it. */
  designId: string;
  /** False until the first live read seeds the drafts. */
  isSeeded: boolean;
  /** What the owner has typed or picked, not necessarily written yet. */
  draft: DesignDrafts;
  /** What the row holds now; a refused save restores these values. */
  saved: DesignFields;
  /** The Material uses the row holds now, after this visit's additions, corrections, and removals. */
  savedUses: MaterialUse[];
  /** The row at open: what the visit's one Event is diffed against. */
  visitStart: DesignFields | null;
  /** The Material uses the row held at open. */
  visitStartUses: MaterialUse[];
  /** The one row whose editor is open. `taxonomy` is the Category · Collection pair. */
  editing: EditDesignRow | null;
  /** The one Materials editor open: adding a use or correcting one. */
  materialUsePanel: MaterialUsePanel | null;
  /** The section tab Edit is showing. */
  tab: DesignSectionTab;
  error: { field: DesignEditableField; message: string } | null;
  /**
   * Set once the visit closes, with the number of writes it still owes. The
   * visit records its one Event when the last of them reports back, so the
   * Event describes the rows the writes stored, not the drafts that asked.
   */
  closing: { at: number; outstanding: number } | null;
};

export type EditDesignRow = DesignEditableField | 'taxonomy';

export type EditDesignEvent =
  | { type: 'design-loaded'; design: DesignFields; materialUses?: readonly MaterialUse[] }
  | { type: 'text-changed'; field: DesignTextEditableField; value: string }
  | { type: 'text-row-left'; field: DesignTextEditableField; now: number }
  | { type: 'choice-chosen'; field: DesignChoiceEditableField; value: string | null; now: number }
  | { type: 'material-use-added'; materialUse: MaterialUse }
  | { type: 'material-use-add-opened'; now: number }
  | { type: 'material-use-editor-opened'; materialUse: MaterialUse; now: number }
  | { type: 'material-use-panel-closed'; now: number }
  | { type: 'material-use-colour-changed'; colour: string }
  | { type: 'material-use-colour-committed'; now: number }
  | { type: 'material-use-material-chosen'; materialId: string; now: number }
  | { type: 'material-use-role-chosen'; role: MaterialUseRole; now: number }
  | { type: 'material-use-saved'; materialUse: MaterialUse }
  | { type: 'material-use-refused'; useId: string; message: string }
  | { type: 'material-use-remove-pressed'; now: number }
  | { type: 'material-use-removed'; useId: string }
  | { type: 'row-opened'; row: EditDesignRow; now: number }
  | { type: 'tab-changed'; tab: DesignSectionTab; now: number }
  | { type: 'row-closed' }
  | { type: 'drafts-written'; design: DesignFields; patch: UpdateDesignInput }
  | { type: 'field-refused'; field: DesignEditableField; message: string }
  | { type: 'app-backgrounded'; now: number }
  | { type: 'visit-closed'; now: number };

/**
 * The work a visit asks for. `write-drafts`, `write-material-use`,
 * `remove-material-use`, and `record-visit` are separate because leaving the
 * app flushes a draft but records nothing, while a close does all of them. The
 * runner makes one call per effect and dispatches the outcome back as an event;
 * the screen calls no record module itself.
 */
export type EditDesignEffect =
  | { type: 'write-drafts'; designId: string; patch: UpdateDesignInput; now: number }
  | {
      type: 'write-material-use';
      designId: string;
      useId: string;
      patch: UpdateMaterialUseInput;
      now: number;
    }
  | { type: 'remove-material-use'; designId: string; useId: string; now: number }
  | {
      type: 'record-visit';
      designId: string;
      before: DesignFields;
      after: DesignFields;
      /** The uses before and after the visit; History decides whether they differ. */
      materialUses: MaterialUsesPair;
      now: number;
    };

export type EditDesignResult = {
  state: EditDesignState;
  effects: EditDesignEffect[];
};

export function createInitialEditDesignState(designId: string): EditDesignState {
  return {
    designId,
    isSeeded: false,
    draft: EMPTY_DESIGN_DRAFTS,
    saved: EMPTY_DESIGN_FIELDS,
    savedUses: [],
    visitStart: null,
    visitStartUses: [],
    editing: null,
    materialUsePanel: null,
    tab: DESIGN_SECTIONS[0].tab,
    error: null,
    closing: null,
  };
}

/** The text drafts that still differ from the row, ready for `updateDesign`. */
export type UnwrittenDesignFields = Partial<Record<DesignTextEditableField, string>>;

/** One field's draft, as the write it asks for. */
function draftPatch<T extends DesignEditableField>(
  field: T,
  value: DesignFields[T]
): UpdateDesignInput {
  return { [field]: value };
}

/**
 * The drafts the row has not seen yet. Only text is drafted; a Category or
 * Collection writes the moment it is chosen. An invalid name is never here,
 * so closing the screen cannot commit a blank one.
 *
 * This narrows a write to the fields it should carry; it is not a second rule
 * for whether the visit changed anything. It asks the same
 * `normalizeOptionalText` the store writes with, so a field skipped here is one
 * the store would have left alone. Emptiness is History's, decided once in
 * `recordEdit`.
 */
export function unwrittenFields(state: EditDesignState): UnwrittenDesignFields | null {
  const patch: UnwrittenDesignFields = {};

  for (const field of DESIGN_TEXT_FIELDS) {
    const draft = state.draft[field];

    if (field === 'name') {
      const name = draft.trim();

      if (name !== state.saved.name && designNameProblem(name) === null) patch.name = name;
      continue;
    }

    if (normalizeOptionalText(draft) !== state.saved[field]) patch[field] = draft;
  }

  return Object.keys(patch).length === 0 ? null : patch;
}

/**
 * The Material use fields the editor holds but the row has not seen. Material
 * and role write on choice, so this is usually only a typed colour; a blank
 * colour is not a change, because a use always needs one. Null means no write.
 */
export function unwrittenMaterialUseFields(
  editor: EditMaterialUseState | null
): UpdateMaterialUseInput | null {
  if (!editor) return null;

  const patch: UpdateMaterialUseInput = {};

  if (editor.materialId !== editor.saved.materialId) patch.materialId = editor.materialId;

  const colour = editor.colour.trim();

  if (colour.length > 0 && colour !== editor.saved.colour) patch.colour = editor.colour;
  if (editor.role !== editor.saved.role) patch.role = editor.role;

  return Object.keys(patch).length === 0 ? null : patch;
}

/** The editor an open correction holds, or null while adding or closed. */
export function editingMaterialUse(state: EditDesignState): EditMaterialUseState | null {
  return state.materialUsePanel?.kind === 'edit' ? state.materialUsePanel.editor : null;
}

/** The write an open Material use editor still owes, if any. */
function materialUseFlushEffects(state: EditDesignState, now: number): EditDesignEffect[] {
  const editor = editingMaterialUse(state);
  const patch = unwrittenMaterialUseFields(editor);

  if (!editor || !patch) return [];

  return [
    {
      type: 'write-material-use',
      designId: state.designId,
      useId: editor.saved.id,
      patch,
      now,
    },
  ];
}

/**
 * The one Event a close records: the row it opened on and the row the writes
 * left behind. Whether that is a change is History's to decide, with the same
 * diff it stores — the visit does not keep a second rule for emptiness. The
 * after-state is what `saved` and `savedUses` hold when the last write reports
 * back, so a refused write is never recorded as if it landed.
 */
function recordEffect(state: EditDesignState, at: number): EditDesignEffect | null {
  const before = state.visitStart;

  if (!before) return null;

  return {
    type: 'record-visit',
    designId: state.designId,
    before,
    after: state.saved,
    materialUses: { before: state.visitStartUses, after: state.savedUses },
    now: at,
  };
}

/**
 * One write the visit declared has reported back. When the last one settles,
 * the close records the visit; until then the Event is not written, so it can
 * never describe a row the write did not store.
 */
function settled(state: EditDesignState): EditDesignResult {
  const closing = state.closing;

  if (!closing || closing.outstanding === 0) return only(state);

  const next = {
    ...state,
    closing: { ...closing, outstanding: closing.outstanding - 1 },
  };

  if (next.closing.outstanding > 0) return only(next);

  const effect = recordEffect(next, closing.at);

  return effect ? { state: next, effects: [effect] } : only(next);
}

/** The drafts a confirmed write updates: only the fields it stored. */
function draftsAfterWrite(
  draft: DesignDrafts,
  design: DesignFields,
  patch: UpdateDesignInput
): DesignDrafts {
  const next = { ...draft };

  for (const field of DESIGN_TEXT_FIELDS) {
    if (field in patch) next[field] = design[field] ?? '';
  }

  for (const field of DESIGN_CHOICE_FIELDS) {
    if (field in patch) next[field] = design[field];
  }

  return next;
}

/** The row a confirmed write collapses: the one it stored, if it is still open. */
function collapsedRow(
  editing: EditDesignRow | null,
  patch: UpdateDesignInput
): EditDesignRow | null {
  if (editing === null || editing === 'taxonomy') return editing;

  return editing in patch ? null : editing;
}

/** Clears the refusal for the field that just changed, and only that field. */
function clearedError(
  error: EditDesignState['error'],
  field: DesignEditableField
): EditDesignState['error'] {
  return error?.field === field ? null : error;
}

function isChoiceField(field: DesignEditableField): field is DesignChoiceEditableField {
  return DESIGN_CHOICE_FIELDS.some((choice) => choice === field);
}

function only(state: EditDesignState): EditDesignResult {
  return { state, effects: [] };
}

/**
 * Moves to `next` and writes the drafts it still holds. Several gestures leave
 * a text row — opening another, changing tabs, leaving the app — and all of
 * them declare the same single write, plus any Material use write the open
 * editor still owes.
 */
function flushing(next: EditDesignState, now: number): EditDesignResult {
  const effects = materialUseFlushEffects(next, now);
  const patch = unwrittenFields(next);

  if (patch) {
    effects.push({ type: 'write-drafts', designId: next.designId, patch, now });
  }

  return effects.length === 0 ? only(next) : { state: next, effects };
}

/**
 * The state after the owner leaves a row: a blank name falls back to the
 * stored one, and a refusal on the row being left clears. The caller decides
 * what opens next.
 */
function leftRow(state: EditDesignState, leaving: EditDesignRow | null): EditDesignState {
  const invalidName = leaving === 'name' && designNameProblem(state.draft.name) !== null;

  return {
    ...state,
    draft: invalidName ? { ...state.draft, name: state.saved.name } : state.draft,
    error: state.error?.field === leaving ? null : state.error,
  };
}

export function editDesignReducer(
  state: EditDesignState,
  event: EditDesignEvent
): EditDesignResult {
  switch (event.type) {
    case 'design-loaded': {
      if (state.isSeeded) return only(state);

      return only({
        ...state,
        isSeeded: true,
        draft: draftsFromFields(event.design),
        saved: event.design,
        savedUses: [...(event.materialUses ?? [])],
        visitStart: event.design,
        visitStartUses: [...(event.materialUses ?? [])],
        editing: null,
        materialUsePanel: null,
        error: null,
      });
    }
    case 'text-changed':
      return only({
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      });
    case 'text-row-left': {
      // Leaving a text row writes what it holds; whether that is a change is
      // the write's to decide, not the visit's.
      const next = leftRow(state, event.field);

      return {
        state: next,
        effects: [
          {
            type: 'write-drafts',
            designId: next.designId,
            patch: draftPatch(event.field, state.draft[event.field]),
            now: event.now,
          },
        ],
      };
    }
    case 'choice-chosen': {
      const next = {
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      };

      return {
        state: next,
        effects: [
          {
            type: 'write-drafts',
            designId: state.designId,
            patch: draftPatch(event.field, event.value),
            now: event.now,
          },
        ],
      };
    }
    case 'material-use-added':
      // The use is already written; the visit only keeps it for the Event it
      // records at close, so adding one does not end the visit.
      return only({
        ...state,
        materialUsePanel: null,
        savedUses: [...state.savedUses, event.materialUse],
      });
    case 'material-use-add-opened': {
      // One editor at a time: a text row being left is written, and a Material
      // use editor being left writes the colour it still owes.
      const effects = materialUseFlushEffects(state, event.now);
      const patch = unwrittenFields(state);

      if (patch) {
        effects.push({ type: 'write-drafts', designId: state.designId, patch, now: event.now });
      }

      const opened = {
        ...leftRow(state, state.editing),
        editing: null,
        materialUsePanel: { kind: 'add' } as const,
      };

      return effects.length === 0 ? only(opened) : { state: opened, effects };
    }
    case 'material-use-editor-opened': {
      const effects = materialUseFlushEffects(state, event.now);
      const patch = unwrittenFields(state);

      if (patch) {
        effects.push({ type: 'write-drafts', designId: state.designId, patch, now: event.now });
      }

      const opened = {
        ...leftRow(state, state.editing),
        editing: null,
        materialUsePanel: {
          kind: 'edit',
          editor: createInitialEditMaterialUseState(event.materialUse),
        } as const,
      };

      return effects.length === 0 ? only(opened) : { state: opened, effects };
    }
    case 'material-use-panel-closed':
      return {
        state: { ...state, materialUsePanel: null },
        effects: materialUseFlushEffects(state, event.now),
      };
    case 'material-use-colour-changed': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      return only({
        ...state,
        materialUsePanel: {
          kind: 'edit',
          editor: editMaterialUseReducer(editor, {
            type: 'colour-changed',
            colour: event.colour,
          }),
        },
      });
    }
    case 'material-use-colour-committed':
      return { state, effects: materialUseFlushEffects(state, event.now) };
    case 'material-use-material-chosen': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      const next = {
        ...state,
        materialUsePanel: {
          kind: 'edit' as const,
          editor: editMaterialUseReducer(editor, {
            type: 'material-chosen',
            materialId: event.materialId,
          }),
        },
      };

      return { state: next, effects: materialUseFlushEffects(next, event.now) };
    }
    case 'material-use-role-chosen': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      const next = {
        ...state,
        materialUsePanel: {
          kind: 'edit' as const,
          editor: editMaterialUseReducer(editor, { type: 'role-chosen', role: event.role }),
        },
      };

      return { state: next, effects: materialUseFlushEffects(next, event.now) };
    }
    case 'material-use-saved': {
      const editor = editingMaterialUse(state);
      const isTheSameUse = editor !== null && editor.saved.id === event.materialUse.id;

      return settled({
        ...state,
        // A late outcome for a use the editor has moved on from updates the
        // row, not the open editor.
        materialUsePanel:
          editor && isTheSameUse
            ? {
                kind: 'edit',
                editor: editMaterialUseReducer(editor, {
                  type: 'material-use-saved',
                  materialUse: event.materialUse,
                }),
              }
            : state.materialUsePanel,
        // The correction is already written; the visit keeps what the row holds
        // now, so a use added and then corrected still reads as one addition.
        savedUses: state.savedUses.map((materialUse) =>
          materialUse.id === event.materialUse.id ? event.materialUse : materialUse
        ),
      });
    }
    case 'material-use-refused': {
      const editor = editingMaterialUse(state);

      if (!editor || editor.saved.id !== event.useId) return settled(state);

      return settled({
        ...state,
        materialUsePanel: {
          kind: 'edit',
          editor: editMaterialUseReducer(editor, {
            type: 'material-use-refused',
            message: event.message,
          }),
        },
      });
    }
    case 'material-use-remove-pressed': {
      const editor = editingMaterialUse(state);

      if (!editor) return only(state);

      return {
        state,
        effects: [
          {
            type: 'remove-material-use',
            designId: state.designId,
            useId: editor.saved.id,
            now: event.now,
          },
        ],
      };
    }
    case 'material-use-removed':
      return only({
        ...state,
        materialUsePanel: null,
        savedUses: state.savedUses.filter((use) => use.id !== event.useId),
      });
    case 'row-opened': {
      const leaving = state.editing;
      const leavingTextRow =
        leaving !== null && leaving !== event.row && leaving !== 'taxonomy' && !isChoiceField(leaving);
      const opened = {
        ...leftRow(state, leaving),
        editing: event.row,
        materialUsePanel: null,
      };
      const effects = materialUseFlushEffects(state, event.now);

      if (leavingTextRow) {
        // A row unmounted on iOS does not reliably fire blur, so opening
        // another row writes the one being left. The visit still records one
        // Event.
        const patch = unwrittenFields(opened);

        if (patch) {
          effects.push({ type: 'write-drafts', designId: opened.designId, patch, now: event.now });
        }
      }

      return effects.length === 0 ? only(opened) : { state: opened, effects };
    }
    case 'tab-changed': {
      if (event.tab === state.tab) return only(state);

      // A tab is unmounted on iOS without firing blur, so the tab change
      // writes the draft it holds, plus any Material use editor it closes. It
      // records nothing: the visit is still open.
      const next = { ...leftRow(state, state.editing), tab: event.tab, editing: null };
      const flushed = flushing(next, event.now);

      return { state: { ...flushed.state, materialUsePanel: null }, effects: flushed.effects };
    }
    case 'row-closed':
      return only({ ...state, editing: null });
    case 'drafts-written':
      // The row the write stored is what the visit now reads, and the drafts it
      // wrote follow it so a trimmed name shows as it was stored.
      return settled({
        ...state,
        draft: draftsAfterWrite(state.draft, event.design, event.patch),
        saved: event.design,
        editing: collapsedRow(state.editing, event.patch),
        error:
          state.error && state.error.field in event.patch ? null : state.error,
      });
    case 'field-refused':
      return settled({
        ...state,
        draft: {
          ...state.draft,
          [event.field]: isChoiceField(event.field)
            ? state.saved[event.field]
            : (state.saved[event.field] ?? ''),
        },
        error: { field: event.field, message: event.message },
      });
    case 'app-backgrounded':
      // Leaving the foreground flushes a draft; only a close records the visit.
      return state.closing ? only(state) : flushing(state, event.now);
    case 'visit-closed': {
      if (state.closing) return only(state);

      const effects = materialUseFlushEffects(state, event.now);
      const patch = unwrittenFields(state);

      if (patch) {
        effects.push({ type: 'write-drafts', designId: state.designId, patch, now: event.now });
      }

      const closed: EditDesignState = {
        ...state,
        materialUsePanel: null,
        closing: { at: event.now, outstanding: effects.length },
      };

      if (effects.length > 0) return { state: closed, effects };

      const effect = recordEffect(closed, event.now);

      return { state: closed, effects: effect ? [effect] : [] };
    }
  }
}
