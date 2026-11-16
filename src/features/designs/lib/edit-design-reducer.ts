import { normalizeDescription } from './description';
import { designNameProblem } from './limits';
import type { DesignEditableField, DesignFields } from './records';

/**
 * Edit's decisions: the drafts, the last committed values, and the one refusal
 * on screen. The live read seeds it once; later reads do not overwrite a draft
 * the owner is still editing.
 */
export type EditDesignState = {
  /** False until the first live read seeds the drafts. */
  isSeeded: boolean;
  /** What the owner has typed or picked, not necessarily written yet. */
  name: string;
  description: string;
  categoryId: string | null;
  collectionId: string | null;
  /** What the row holds; a refused save restores these values. */
  savedName: string;
  savedDescription: string | null;
  savedCategoryId: string | null;
  savedCollectionId: string | null;
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
  | { type: 'field-refused'; field: DesignEditableField; message: string };

export function createInitialEditDesignState(): EditDesignState {
  return {
    isSeeded: false,
    name: '',
    description: '',
    categoryId: null,
    collectionId: null,
    savedName: '',
    savedDescription: null,
    savedCategoryId: null,
    savedCollectionId: null,
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

/** Clears the refusal for the field that just changed, and only that field. */
function clearedError(
  error: EditDesignState['error'],
  field: DesignEditableField
): EditDesignState['error'] {
  return error?.field === field ? null : error;
}

/**
 * Edit's decisions: the drafts, the last committed values, and the one refusal
 * on screen. The live read seeds it once; later reads do not overwrite a draft
 * the owner is still editing.
 */
export function editDesignReducer(
  state: EditDesignState,
  event: EditDesignEvent
): EditDesignState {
  switch (event.type) {
    case 'design-loaded': {
      if (state.isSeeded) return state;

      const { name, description, categoryId, collectionId } = event.design;

      return {
        isSeeded: true,
        name,
        description: description ?? '',
        categoryId,
        collectionId,
        savedName: name,
        savedDescription: description,
        savedCategoryId: categoryId,
        savedCollectionId: collectionId,
        error: null,
      };
    }
    case 'name-changed':
      return { ...state, name: event.name, error: clearedError(state.error, 'name') };
    case 'description-changed':
      return {
        ...state,
        description: event.description,
        error: clearedError(state.error, 'description'),
      };
    case 'category-chosen':
      return {
        ...state,
        categoryId: event.categoryId,
        error: clearedError(state.error, 'categoryId'),
      };
    case 'collection-chosen':
      return {
        ...state,
        collectionId: event.collectionId,
        error: clearedError(state.error, 'collectionId'),
      };
    case 'field-saved': {
      const error = clearedError(state.error, event.field);

      switch (event.field) {
        case 'name':
          return { ...state, name: event.design.name, savedName: event.design.name, error };
        case 'description':
          return {
            ...state,
            description: event.design.description ?? '',
            savedDescription: event.design.description,
            error,
          };
        case 'categoryId':
          return {
            ...state,
            categoryId: event.design.categoryId,
            savedCategoryId: event.design.categoryId,
            error,
          };
        case 'collectionId':
          return {
            ...state,
            collectionId: event.design.collectionId,
            savedCollectionId: event.design.collectionId,
            error,
          };
      }
    }
    case 'drafts-written':
      return {
        ...state,
        savedName: event.design.name,
        savedDescription: event.design.description,
        savedCategoryId: event.design.categoryId,
        savedCollectionId: event.design.collectionId,
      };
    case 'field-refused': {
      const next = { ...state, error: { field: event.field, message: event.message } };

      switch (event.field) {
        case 'name':
          return { ...next, name: state.savedName };
        case 'description':
          return { ...next, description: state.savedDescription ?? '' };
        case 'categoryId':
          return { ...next, categoryId: state.savedCategoryId };
        case 'collectionId':
          return { ...next, collectionId: state.savedCollectionId };
      }
    }
  }
}
