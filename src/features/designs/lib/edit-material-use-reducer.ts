import type { MaterialUseRole } from '@/features/database';
import type { Material } from '@/features/materials';
import type { EditingMaterialUse } from './edit-design-reducer';
import type { MaterialUse } from './records';

/** The correction panel's state now lives in the visit; this is its shape. */
export type EditMaterialUseState = EditingMaterialUse;

export type EditMaterialUseEvent =
  | { type: 'material-chosen'; materialId: string }
  | { type: 'colour-changed'; colour: string }
  | { type: 'role-chosen'; role: MaterialUseRole }
  | { type: 'material-use-saved'; materialUse: MaterialUse }
  | { type: 'material-use-refused'; message: string };

export function createInitialEditMaterialUseState(
  materialUse: MaterialUse
): EditMaterialUseState {
  return {
    stored: materialUse,
    materialId: materialUse.materialId,
    colour: materialUse.colour,
    role: materialUse.role,
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

  return [...materials, { id: state.materialId, name: state.stored.materialName }];
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
        materialId: event.materialUse.materialId,
        colour: event.materialUse.colour,
        role: event.materialUse.role,
        stored: event.materialUse,
        error: null,
      };
    case 'material-use-refused':
      return {
        ...state,
        materialId: state.stored.materialId,
        colour: state.stored.colour,
        role: state.stored.role,
        error: event.message,
      };
  }
}
