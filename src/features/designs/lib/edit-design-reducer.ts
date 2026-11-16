import { normalizeDescription } from './description';
import { designFieldsChanged, type DesignEditableField } from './fields';
import { designNameProblem } from './limits';
import type { DesignFields } from './records';

/**
 * Edit's decisions: the drafts, the row's current values, the visit baseline,
 * and the one refusal on screen. The live read seeds it once; later reads do
 * not overwrite a draft the owner is still editing.
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
  name: string;
  description: string;
  categoryId: string | null;
  collectionId: string | null;
  /** What the row holds now; a refused save restores these values. */
  savedName: string;
  savedDescription: string | null;
  savedCategoryId: string | null;
  savedCollectionId: string | null;
  /** The row at open: what the visit's one Event is diffed against. */
  sessionStart: DesignFields | null;
  error: { field: DesignEditableField; message: string } | null;
};

export type EditDesignEvent =
  | { type: 'design-loaded'; design: DesignFields }
  | { type: 'name-changed'; name: string }
  | { type: 'description-changed'; description: string }
  | { type: 'category-chosen'; categoryId: string | null }
  | { type: 'collection-chosen'; collectionId: string | null }
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
  };
}

/** The fields a draft still owes the row, ready for `updateDesign`. */
export type UnwrittenDesignFields = {
  name?: string;
  description?: string;
};

/**
 * The drafts the row has not seen yet. Only name and description are drafted;
 * a Category or Collection writes the moment it is chosen. An invalid name is
 * never here, so closing the screen cannot commit a blank one.
 */
export function unwrittenFields(state: EditDesignState): UnwrittenDesignFields | null {
  const patch: UnwrittenDesignFields = {};
  const name = state.name.trim();

  if (name !== state.savedName && designNameProblem(name) === null) patch.name = name;
  if (normalizeDescription(state.description) !== state.savedDescription) {
    patch.description = state.description;
  }

  return patch.name === undefined && patch.description === undefined ? null : patch;
}

/**
 * The row as it will stand once a close writes the drafts: a valid name is
 * written trimmed, an invalid one was never written, and a description is
 * written normalized. Category and Collection are read from what the row holds,
 * because they write on choice rather than at close.
 */
function fieldsAfterClose(
  state: EditDesignState,
  patch: UnwrittenDesignFields | null
): DesignFields {
  return {
    name: patch?.name ?? state.savedName,
    description:
      patch?.description === undefined
        ? state.savedDescription
        : normalizeDescription(patch.description),
    categoryId: state.savedCategoryId,
    collectionId: state.savedCollectionId,
  };
}

/** Clears the refusal for the field that just changed, and only that field. */
function clearedError(
  error: EditDesignState['error'],
  field: DesignEditableField
): EditDesignState['error'] {
  return error?.field === field ? null : error;
}

function only(state: EditDesignState): EditDesignResult {
  return { state, effects: [] };
}

export function editDesignReducer(
  state: EditDesignState,
  event: EditDesignEvent
): EditDesignResult {
  switch (event.type) {
    case 'design-loaded': {
      if (state.isSeeded) return only(state);

      const { name, description, categoryId, collectionId } = event.design;

      return only({
        ...state,
        isSeeded: true,
        name,
        description: description ?? '',
        categoryId,
        collectionId,
        savedName: name,
        savedDescription: description,
        savedCategoryId: categoryId,
        savedCollectionId: collectionId,
        sessionStart: { name, description, categoryId, collectionId },
        error: null,
      });
    }
    case 'name-changed':
      return only({ ...state, name: event.name, error: clearedError(state.error, 'name') });
    case 'description-changed':
      return only({
        ...state,
        description: event.description,
        error: clearedError(state.error, 'description'),
      });
    case 'category-chosen':
      return only({
        ...state,
        categoryId: event.categoryId,
        error: clearedError(state.error, 'categoryId'),
      });
    case 'collection-chosen':
      return only({
        ...state,
        collectionId: event.collectionId,
        error: clearedError(state.error, 'collectionId'),
      });
    case 'field-saved': {
      const error = clearedError(state.error, event.field);

      switch (event.field) {
        case 'name':
          return only({ ...state, name: event.design.name, savedName: event.design.name, error });
        case 'description':
          return only({
            ...state,
            description: event.design.description ?? '',
            savedDescription: event.design.description,
            error,
          });
        case 'categoryId':
          return only({
            ...state,
            categoryId: event.design.categoryId,
            savedCategoryId: event.design.categoryId,
            error,
          });
        case 'collectionId':
          return only({
            ...state,
            collectionId: event.design.collectionId,
            savedCollectionId: event.design.collectionId,
            error,
          });
      }
    }
    case 'drafts-written':
      return only({
        ...state,
        savedName: event.design.name,
        savedDescription: event.design.description,
        savedCategoryId: event.design.categoryId,
        savedCollectionId: event.design.collectionId,
      });
    case 'field-refused': {
      const next = { ...state, error: { field: event.field, message: event.message } };

      switch (event.field) {
        case 'name':
          return only({ ...next, name: state.savedName });
        case 'description':
          return only({ ...next, description: state.savedDescription ?? '' });
        case 'categoryId':
          return only({ ...next, categoryId: state.savedCategoryId });
        case 'collectionId':
          return only({ ...next, collectionId: state.savedCollectionId });
      }
    }
    case 'app-backgrounded': {
      // Leaving the foreground flushes a draft; only a close records the visit.
      if (state.isClosed) return only(state);

      const patch = unwrittenFields(state);
      if (!patch) return only(state);

      return {
        state,
        effects: [{ type: 'write-drafts', designId: state.designId, patch, now: event.now }],
      };
    }
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
