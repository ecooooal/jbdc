import type { MaterialUseRole } from '@/features/database';

/**
 * The add-Material-use editor's decisions: the Material chosen or created
 * inline, the colour draft, the role, and the one refusal on screen. The
 * Material rows themselves stay in `useMaterials`.
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
  | { type: 'use-creation-refused'; message: string }
  | { type: 'use-created' };

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

/** Material and colour are required; role always has a value. */
export function canAddMaterialUse(state: AddMaterialUseState): boolean {
  return state.materialId !== null && state.colour.trim().length > 0;
}

/**
 * The add-use editor has no effects: the screen performs the one write and
 * dispatches the outcome back. `use-created` returns the editor to its blank
 * state so the next use starts clean.
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
    case 'use-created':
      return createInitialAddMaterialUseState();
  }
}
