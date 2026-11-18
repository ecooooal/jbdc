import type { MaterialUseRole } from '@/features/database';

/**
 * The add-Material-use editor's decisions: the Material chosen or created
 * inline, the colour draft, the role, and the one refusal on screen. The
 * Material rows themselves stay in `useMaterials`; the visit owns the write.
 */
export type AddMaterialUseState = {
  materialId: string | null;
  colour: string;
  role: MaterialUseRole;
  inlineCreationOpen: boolean;
  inlineName: string;
  inlineError: string | null;
  error: string | null;
};

export type AddMaterialUseEvent =
  | { type: 'material-chosen'; materialId: string | null }
  | { type: 'colour-changed'; colour: string }
  | { type: 'role-chosen'; role: MaterialUseRole }
  | { type: 'inline-creation-opened' }
  | { type: 'inline-creation-closed' }
  | { type: 'inline-name-changed'; name: string }
  | { type: 'material-created'; materialId: string }
  | { type: 'inline-creation-refused'; message: string }
  | { type: 'use-creation-refused'; message: string };

const CLOSED_INLINE_CREATION = {
  inlineCreationOpen: false,
  inlineName: '',
  inlineError: null,
} satisfies Pick<
  AddMaterialUseState,
  'inlineCreationOpen' | 'inlineName' | 'inlineError'
>;

export function createInitialAddMaterialUseState(): AddMaterialUseState {
  return {
    materialId: null,
    colour: '',
    role: 'main',
    ...CLOSED_INLINE_CREATION,
    error: null,
  };
}

/** A Material must be chosen; the record write decides whether the colour is valid. */
export function canAddMaterialUse(state: AddMaterialUseState): boolean {
  return state.materialId !== null;
}

/**
 * The add-use editor's choices have no effects: the visit declares the one
 * write when the owner confirms. A change clears the previous refusal, and the
 * Material an inline creation makes is selected by id at once; its label
 * appears when the live read observes it.
 */
export function addMaterialUseReducer(
  state: AddMaterialUseState,
  event: AddMaterialUseEvent
): AddMaterialUseState {
  switch (event.type) {
    case 'material-chosen':
      return { ...state, materialId: event.materialId, error: null };
    case 'colour-changed':
      return { ...state, colour: event.colour, error: null };
    case 'role-chosen':
      return { ...state, role: event.role };
    case 'inline-creation-opened':
      return { ...state, ...CLOSED_INLINE_CREATION, inlineCreationOpen: true };
    case 'inline-creation-closed':
      return { ...state, ...CLOSED_INLINE_CREATION };
    case 'inline-name-changed':
      return { ...state, inlineName: event.name, inlineError: null };
    case 'material-created':
      return {
        ...state,
        ...CLOSED_INLINE_CREATION,
        materialId: event.materialId,
        error: null,
      };
    case 'inline-creation-refused':
      return { ...state, inlineError: event.message };
    case 'use-creation-refused':
      return { ...state, error: event.message };
  }
}
