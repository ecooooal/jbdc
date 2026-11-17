import type { MaterialUseRole } from '@/features/database';
import {
  DESIGN_CHOICE_FIELDS,
  DESIGN_TEXT_FIELDS,
  designFieldsChanged,
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
import { materialUsesChanged } from './material-use-changes';
import { normalizeOptionalText } from './optional-text';
import type { DesignFields, MaterialUse, MaterialUsesChange, UpdateMaterialUseInput } from './records';
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
 * A visit is one screen session (ADR-0004): `sessionStart` is the row the
 * first read returned and never advances, so every write in the visit
 * coalesces into one Event at close.
 */
export type EditDesignState = {
  /** The Design this visit edits; every effect names it. */
  designId: string;
  /** False until the first live read seeds the drafts. */
  isSeeded: boolean;
  /** True once the visit closed; a second close declares nothing more. */
  isClosed: boolean;
  /** What the owner has typed or picked, not necessarily written yet. */
  draft: DesignDrafts;
  /** What the row holds now; a refused save restores these values. */
  saved: DesignFields;
  /** The Material uses the row holds now, after this visit's additions, corrections, and removals. */
  savedUses: MaterialUse[];
  /** The row at open: what the visit's one Event is diffed against. */
  sessionStart: DesignFields | null;
  /** The Material uses the row held at open. */
  sessionStartUses: MaterialUse[];
  /** The one row whose editor is open. `taxonomy` is the Category · Collection pair. */
  editing: EditDesignRow | null;
  /** The one Materials editor open: adding a use or correcting one. */
  materialUsePanel: MaterialUsePanel | null;
  /** The section tab Edit is showing. */
  tab: DesignSectionTab;
  error: { field: DesignEditableField; message: string } | null;
};

export type EditDesignRow = DesignEditableField | 'taxonomy';

export type EditDesignEvent =
  | { type: 'design-loaded'; design: DesignFields; materialUses?: readonly MaterialUse[] }
  | { type: 'text-changed'; field: DesignTextEditableField; value: string }
  | { type: 'choice-chosen'; field: DesignChoiceEditableField; value: string | null }
  | { type: 'material-use-added'; use: MaterialUse }
  | { type: 'material-use-add-opened'; now: number }
  | { type: 'material-use-editor-opened'; use: MaterialUse; now: number }
  | { type: 'material-use-panel-closed'; now: number }
  | { type: 'material-use-colour-changed'; colour: string }
  | { type: 'material-use-colour-committed'; now: number }
  | { type: 'material-use-material-chosen'; materialId: string; now: number }
  | { type: 'material-use-role-chosen'; role: MaterialUseRole; now: number }
  | { type: 'material-use-saved'; use: MaterialUse }
  | { type: 'material-use-refused'; useId: string; message: string }
  | { type: 'material-use-removed'; useId: string }
  | { type: 'row-opened'; row: EditDesignRow; now: number }
  | { type: 'tab-changed'; tab: DesignSectionTab; now: number }
  | { type: 'row-closed' }
  | { type: 'field-saved'; field: DesignEditableField; design: DesignFields }
  | { type: 'drafts-written'; design: DesignFields }
  | { type: 'field-refused'; field: DesignEditableField; message: string }
  | { type: 'app-backgrounded'; now: number }
  | { type: 'session-closed'; now: number };

/**
 * The work a visit asks for. `write-drafts`, `write-material-use`, and
 * `record-session` are separate because leaving the app flushes a draft but
 * records nothing, while a close does all three. The runner makes one call per
 * effect and dispatches the outcome back as an event.
 */
export type EditDesignEffect =
  | { type: 'write-drafts'; designId: string; patch: UnwrittenDesignFields; now: number }
  | {
      type: 'write-material-use';
      designId: string;
      useId: string;
      patch: UpdateMaterialUseInput;
      now: number;
    }
  | {
      type: 'record-session';
      designId: string;
      before: DesignFields;
      after: DesignFields;
      /** The uses before and after the visit, absent when the visit changed none. */
      materialUses?: MaterialUsesChange;
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
    isClosed: false,
    draft: EMPTY_DESIGN_DRAFTS,
    saved: EMPTY_DESIGN_FIELDS,
    savedUses: [],
    sessionStart: null,
    sessionStartUses: [],
    editing: null,
    materialUsePanel: null,
    tab: DESIGN_SECTIONS[0].tab,
    error: null,
  };
}

/** The text drafts that still differ from the row, ready for `updateDesign`. */
export type UnwrittenDesignFields = Partial<Record<DesignTextEditableField, string>>;

/**
 * The drafts the row has not seen yet. Only text is drafted; a Category or
 * Collection writes the moment it is chosen. An invalid name is never here,
 * so closing the screen cannot commit a blank one.
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
 * The row as it will stand once a close writes the drafts: a valid name is
 * written trimmed, every other text field is written normalized, and Category
 * and Collection come from what the row holds because they write on choice.
 */
function fieldsAfterClose(
  state: EditDesignState,
  patch: UnwrittenDesignFields | null
): DesignFields {
  const after: DesignFields = { ...state.saved };

  for (const field of DESIGN_TEXT_FIELDS) {
    const raw = patch?.[field];

    if (raw === undefined) continue;

    if (field === 'name') {
      after.name = raw.trim();
      continue;
    }

    after[field] = normalizeOptionalText(raw);
  }

  return after;
}

/**
 * The Material uses as they will stand once a close writes the open editor: the
 * Material, colour, and role it still owes applied to the use it corrects.
 * Without this the Event would be diffed against a row the close has not
 * written yet, so a half-typed colour would record no use or the old one.
 */
function usesAfterClose(
  state: EditDesignState,
  patch: UpdateMaterialUseInput | null
): MaterialUse[] {
  const editor = editingMaterialUse(state);

  if (!editor || !patch) return state.savedUses;

  return state.savedUses.map((use) =>
    use.id === editor.saved.id ? { ...use, ...patch } : use
  );
}

/** Updates the draft a save confirmed, so the row reads the stored value. */
function draftsAfterSave(
  draft: DesignDrafts,
  field: DesignEditableField,
  design: DesignFields
): DesignDrafts {
  if (field === 'categoryId' || field === 'collectionId') {
    return { ...draft, [field]: design[field] };
  }

  return { ...draft, [field]: design[field] ?? '' };
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
        sessionStart: event.design,
        sessionStartUses: [...(event.materialUses ?? [])],
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
    case 'choice-chosen':
      return only({
        ...state,
        draft: { ...state.draft, [event.field]: event.value },
        error: clearedError(state.error, event.field),
      });
    case 'material-use-added':
      // The use is already written; the visit only keeps it for the Event it
      // records at close, so adding one does not end the session.
      return only({
        ...state,
        materialUsePanel: null,
        savedUses: [...state.savedUses, event.use],
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
          editor: createInitialEditMaterialUseState(event.use),
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
      const isTheSameUse = editor !== null && editor.saved.id === event.use.id;

      return only({
        ...state,
        // A late outcome for a use the editor has moved on from updates the
        // row, not the open editor.
        materialUsePanel:
          editor && isTheSameUse
            ? {
                kind: 'edit',
                editor: editMaterialUseReducer(editor, {
                  type: 'material-use-saved',
                  use: event.use,
                }),
              }
            : state.materialUsePanel,
        // The correction is already written; the visit keeps what the row holds
        // now, so a use added and then corrected still reads as one addition.
        savedUses: state.savedUses.map((use) => (use.id === event.use.id ? event.use : use)),
      });
    }
    case 'material-use-refused': {
      const editor = editingMaterialUse(state);

      if (!editor || editor.saved.id !== event.useId) return only(state);

      return only({
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
    case 'field-saved':
      return only({
        ...state,
        draft: draftsAfterSave(state.draft, event.field, event.design),
        saved: event.design,
        editing: state.editing === event.field ? null : state.editing,
        error: clearedError(state.error, event.field),
      });
    case 'drafts-written':
      return only({
        ...state,
        saved: event.design,
      });
    case 'field-refused':
      return only({
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
      return state.isClosed ? only(state) : flushing(state, event.now);
    case 'session-closed': {
      if (state.isClosed) return only(state);

      const before = state.sessionStart;
      if (!before) {
        return {
          state: { ...state, isClosed: true, materialUsePanel: null },
          effects: [],
        };
      }

      const effects: EditDesignEffect[] = materialUseFlushEffects(state, event.now);
      const patch = unwrittenFields(state);

      if (patch) {
        effects.push({ type: 'write-drafts', designId: state.designId, patch, now: event.now });
      }

      const after = fieldsAfterClose(state, patch);
      const uses = usesAfterClose(state, unwrittenMaterialUseFields(editingMaterialUse(state)));
      const usesChanged = materialUsesChanged(state.sessionStartUses, uses);

      if (designFieldsChanged(before, after) || usesChanged) {
        effects.push({
          type: 'record-session',
          designId: state.designId,
          before,
          after,
          now: event.now,
          ...(usesChanged && {
            materialUses: {
              before: state.sessionStartUses,
              after: uses,
            },
          }),
        });
      }

      return {
        state: { ...state, isClosed: true, materialUsePanel: null },
        effects,
      };
    }
  }
}
