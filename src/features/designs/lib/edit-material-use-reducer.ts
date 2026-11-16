import type { MaterialUseRole } from '@/features/database';
import type { Material } from '@/features/materials';
import type { MaterialUse } from './records';

/**
 * The Material use editor's decisions: the Material, colour, and role on
 * screen, the stored use a refusal restores, and the one message it shows.
 * Every field writes on its own, so there is no Save step and no effect here.
 */
export type EditMaterialUseState = {
  materialId: string;
  colour: string;
  role: MaterialUseRole;
  /** The use as it is stored right now. */
  saved: MaterialUse;
  error: string | null;
};

export type EditMaterialUseEvent =
  | { type: 'material-chosen'; materialId: string }
  | { type: 'colour-changed'; colour: string }
  | { type: 'role-chosen'; role: MaterialUseRole }
  | { type: 'material-use-saved'; use: MaterialUse }
  | { type: 'material-use-refused'; message: string };

export function createInitialEditMaterialUseState(use: MaterialUse): EditMaterialUseState {
  return {
    materialId: use.materialId,
    colour: use.colour,
    role: use.role,
    saved: use,
    error: null,
  };
}

/**
 * The picker's options: the live list, plus the stored Material when the owner
 * has removed it, so the editor still opens on the use's current Material.
 */
export function materialUseChoices(
  materials: readonly Material[],
  state: EditMaterialUseState
): Material[] {
  if (materials.some((material) => material.id === state.materialId)) return [...materials];

  return [...materials, { id: state.materialId, name: state.saved.materialName }];
}

/** A change clears the previous refusal; a save makes the stored use the row. */
export function editMaterialUseReducer(
  state: EditMaterialUseState,
  event: EditMaterialUseEvent
): EditMaterialUseState {
  switch (event.type) {
    case 'material-chosen':
      return { ...state, materialId: event.materialId, error: null };
    case 'colour-changed':
      return { ...state, colour: event.colour, error: null };
    case 'role-chosen':
      return { ...state, role: event.role, error: null };
    case 'material-use-saved':
      return {
        ...state,
        materialId: event.use.materialId,
        colour: event.use.colour,
        role: event.use.role,
        saved: event.use,
        error: null,
      };
    case 'material-use-refused':
      return {
        ...state,
        materialId: state.saved.materialId,
        colour: state.saved.colour,
        role: state.saved.role,
        error: event.message,
      };
  }
}
