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
import { normalizeOptionalText } from './optional-text';
import type { DesignFields } from './records';
import { DESIGN_SECTIONS, type DesignSectionTab } from './sections';

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
  /** The row at open: what the visit's one Event is diffed against. */
  sessionStart: DesignFields | null;
  /** The one row whose editor is open. `taxonomy` is the Category · Collection pair. */
  editing: EditDesignRow | null;
  /** The section tab Edit is showing. */
  tab: DesignSectionTab;
  error: { field: DesignEditableField; message: string } | null;
};

export type EditDesignRow = DesignEditableField | 'taxonomy';

export type EditDesignEvent =
  | { type: 'design-loaded'; design: DesignFields }
  | { type: 'text-changed'; field: DesignTextEditableField; value: string }
  | { type: 'choice-chosen'; field: DesignChoiceEditableField; value: string | null }
  | { type: 'row-opened'; row: EditDesignRow; now: number }
  | { type: 'tab-changed'; tab: DesignSectionTab; now: number }
  | { type: 'row-closed' }
  | { type: 'field-saved'; field: DesignEditableField; design: DesignFields }
  | { type: 'drafts-written'; design: DesignFields }
  | { type: 'field-refused'; field: DesignEditableField; message: string }
  | { type: 'app-backgrounded'; now: number }
  | { type: 'session-closed'; now: number };

/**
 * The work a visit asks for. `write-drafts` and `record-session` are separate
 * because leaving the app flushes a draft but records nothing, while a close
 * does both. The runner makes one call per effect and dispatches the outcome
 * back as an event.
 */
export type EditDesignEffect =
  | { type: 'write-drafts'; designId: string; patch: UnwrittenDesignFields; now: number }
  | {
      type: 'record-session';
      designId: string;
      before: DesignFields;
      after: DesignFields;
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
    sessionStart: null,
    editing: null,
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
 * them declare the same single write.
 */
function flushing(next: EditDesignState, now: number): EditDesignResult {
  const patch = unwrittenFields(next);

  if (!patch) return only(next);

  return {
    state: next,
    effects: [{ type: 'write-drafts', designId: next.designId, patch, now }],
  };
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
        sessionStart: event.design,
        editing: null,
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
    case 'row-opened': {
      const leaving = state.editing;
      const leavingTextRow =
        leaving !== null && leaving !== event.row && leaving !== 'taxonomy' && !isChoiceField(leaving);
      const opened = { ...leftRow(state, leaving), editing: event.row };

      if (!leavingTextRow) return only(opened);

      // A row unmounted on iOS does not reliably fire blur, so opening another
      // row writes the one being left. The visit still records one Event.
      return flushing(opened, event.now);
    }
    case 'tab-changed': {
      if (event.tab === state.tab) return only(state);

      // A tab is unmounted on iOS without firing blur, so the tab change
      // writes the draft it holds. It records nothing: the visit is still open.
      const next = { ...leftRow(state, state.editing), tab: event.tab, editing: null };

      return flushing(next, event.now);
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
      if (!before) return { state: { ...state, isClosed: true }, effects: [] };

      const effects: EditDesignEffect[] = [];
      const patch = unwrittenFields(state);

      if (patch) {
        effects.push({ type: 'write-drafts', designId: state.designId, patch, now: event.now });
      }

      const after = fieldsAfterClose(state, patch);

      if (designFieldsChanged(before, after)) {
        effects.push({
          type: 'record-session',
          designId: state.designId,
          before,
          after,
          now: event.now,
        });
      }

      return { state: { ...state, isClosed: true }, effects };
    }
  }
}
