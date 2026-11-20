import type { MaterialUseRole } from "@/features/database";
import {
  createInitialInlineCreationState,
  type InlineCreationEvent,
  type InlineCreationState,
  inlineCreationReducer,
} from "./inline-creation-reducer";

/**
 * The add-Material-use editor's decisions: the Material chosen or created
 * inline, the colour draft, the role, and the one refusal on screen. The
 * Material rows themselves stay in `useMaterials`; the visit owns the write.
 * The inline form is the shared slice — this editor only selects the id a
 * completed create reports.
 */
export type AddMaterialUseState = {
  materialId: string | null;
  colour: string;
  role: MaterialUseRole;
  inline: InlineCreationState;
  error: string | null;
};

export type AddMaterialUseEvent =
  | { type: "material-chosen"; materialId: string | null }
  | { type: "colour-changed"; colour: string }
  | { type: "role-chosen"; role: MaterialUseRole }
  | { type: "inline-fact"; fact: InlineCreationEvent }
  | { type: "use-creation-refused"; message: string };

export function createInitialAddMaterialUseState(): AddMaterialUseState {
  return {
    materialId: null,
    colour: "",
    role: "main",
    inline: createInitialInlineCreationState(),
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
  event: AddMaterialUseEvent,
): AddMaterialUseState {
  switch (event.type) {
    case "material-chosen":
      return { ...state, materialId: event.materialId, error: null };
    case "colour-changed":
      return { ...state, colour: event.colour, error: null };
    case "role-chosen":
      return { ...state, role: event.role };
    case "inline-fact": {
      const inline = inlineCreationReducer(state.inline, event.fact);

      if (event.fact.type !== "created") return { ...state, inline };

      // The slice only reports an id; selecting it and clearing a stale use
      // refusal are this editor's decisions.
      return { ...state, inline, materialId: event.fact.id, error: null };
    }
    case "use-creation-refused":
      return { ...state, error: event.message };
  }
}
