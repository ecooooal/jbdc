import { DESIGN_NAME_MAX_LENGTH } from './limits';

/** Which inline creation form the create screen has open, if any. */
export type InlineCreationKind = 'category' | 'collection';

export type NewDesignFormState = {
  name: string;
  /** The owner's choices. The rows themselves stay in `useTaxonomy`. */
  categoryId: string | null;
  collectionId: string | null;
  inlineCreation: InlineCreationKind | null;
  inlineName: string;
  inlineYear: string;
  inlineError: string | null;
  error: string | null;
};

export type NewDesignFormEvent =
  | { type: 'name-changed'; name: string }
  | { type: 'category-chosen'; categoryId: string | null }
  | { type: 'collection-chosen'; collectionId: string | null }
  | { type: 'inline-creation-opened'; kind: InlineCreationKind }
  | { type: 'inline-creation-closed' }
  | { type: 'inline-name-changed'; name: string }
  | { type: 'inline-year-changed'; year: string }
  | { type: 'category-created'; categoryId: string }
  | { type: 'collection-created'; collectionId: string }
  | { type: 'inline-creation-refused'; message: string }
  | { type: 'design-creation-refused'; message: string };

const NO_INLINE_CREATION = {
  inlineCreation: null,
  inlineName: '',
  inlineYear: '',
  inlineError: null,
} satisfies Pick<
  NewDesignFormState,
  'inlineCreation' | 'inlineName' | 'inlineYear' | 'inlineError'
>;

export function createInitialNewDesignFormState(): NewDesignFormState {
  return {
    name: '',
    categoryId: null,
    collectionId: null,
    inlineCreation: null,
    inlineName: '',
    inlineYear: '',
    inlineError: null,
    error: null,
  };
}

/**
 * A name is the only field the create action needs; it is trimmed before the
 * records module sees it, so whitespace alone never enables Create.
 */
export function canCreateDesign(state: NewDesignFormState): boolean {
  const name = state.name.trim();

  return name.length > 0 && name.length <= DESIGN_NAME_MAX_LENGTH;
}

/**
 * The year the collection form names, or null when the owner left it empty.
 * Only digits are a year: anything else becomes NaN and the taxonomy module
 * refuses it, so a blank field never becomes year 0 and a decimal never rounds.
 */
export function collectionYearFromInput(input: string): number | null {
  const trimmed = input.trim();

  if (trimmed.length === 0) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;

  return Number(trimmed);
}

/**
 * The create form's decisions: the name draft, the two optional selections,
 * and the inline entry the owner is currently adding. Selections are ids;
 * the rows and their names stay in the live taxonomy list.
 */
export function newDesignFormReducer(
  state: NewDesignFormState,
  event: NewDesignFormEvent
): NewDesignFormState {
  switch (event.type) {
    case 'name-changed':
      return { ...state, name: event.name, error: null };
    case 'category-chosen':
      return { ...state, categoryId: event.categoryId };
    case 'collection-chosen':
      return { ...state, collectionId: event.collectionId };
    case 'inline-creation-opened':
      return { ...state, ...NO_INLINE_CREATION, inlineCreation: event.kind };
    case 'inline-creation-closed':
      return { ...state, ...NO_INLINE_CREATION };
    case 'inline-name-changed':
      return { ...state, inlineName: event.name, inlineError: null };
    case 'inline-year-changed':
      return { ...state, inlineYear: event.year, inlineError: null };
    case 'category-created':
      return { ...state, ...NO_INLINE_CREATION, categoryId: event.categoryId };
    case 'collection-created':
      return { ...state, ...NO_INLINE_CREATION, collectionId: event.collectionId };
    case 'inline-creation-refused':
      return { ...state, inlineError: event.message };
    case 'design-creation-refused':
      return { ...state, error: event.message };
  }
}
