import type { MaterialUseRole } from '@/features/database';

/**
 * The add-Material-use editor's choices: the Material chosen or created
 * inline, the colour draft, and the role. The Material rows themselves stay in
 * `useMaterials`; the visit shows the refusal and declares the write.
 */
export type AddMaterialUseState = {
  materialId: string | null;
  colour: string;
  role: MaterialUseRole;
  inlineCreationOpen: boolean;
  inlineName: string;
  inlineError: string | null;
};

export type AddMaterialUseEvent =
  | { type: 'material-chosen'; materialId: string | null }
  | { type: 'colour-changed'; colour: string }
  | { type: 'role-chosen'; role: MaterialUseRole }
  | { type: 'inline-creation-opened' }
  | { type: 'inline-creation-closed' }
  | { type: 'inline-name-changed'; name: string }
  | { type: 'material-created'; materialId: string }
  | { type: 'inline-creation-refused'; message: string };

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
  };
}

/** Material and colour are required; role always has a value. */
export function canAddMaterialUse(state: AddMaterialUseState): boolean {
  return state.materialId !== null && state.colour.trim().length > 0;
}

/**
 * The add-use editor's choices have no effects: the visit declares the one
 * write when the owner confirms. The Material an inline creation makes is
 * selected by id at once; its label appears when the live read observes it.
 */
export function addMaterialUseReducer(
  state: AddMaterialUseState,
  event: AddMaterialUseEvent
): AddMaterialUseState {
  switch (event.type) {
    case 'material-chosen':
      return { ...state, materialId: event.materialId };
    case 'colour-changed':
      return { ...state, colour: event.colour };
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
      };
    case 'inline-creation-refused':
      return { ...state, inlineError: event.message };
  }
}
