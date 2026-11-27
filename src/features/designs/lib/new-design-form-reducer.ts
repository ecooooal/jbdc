import { designNameProblem } from "./limits";
import {
  clearInlineRefusal,
  createInitialInlineCreationState,
  type InlineCreationEvent,
  type InlineCreationState,
  inlineCreationReducer,
} from "./inline-creation-reducer";

/** Which picker the one inline creation panel belongs to. */
export type InlineCreationKind = "category" | "collection";

export type NewDesignFormState = {
  name: string;
  /** The owner's choices. The rows themselves stay in `useTaxonomy`. */
  categoryId: string | null;
  collectionId: string | null;
  /** The one Category and Collection sheet: the only way into either picker. */
  taxonomyOpen: boolean;
  /** The one new-entry sheet, stacked above the taxonomy sheet. */
  inline: InlineCreationState;
  /** Which list the new-entry sheet belongs to; the slice knows no entry kinds. */
  inlineKind: InlineCreationKind | null;
  /** The collection's optional year while its new-entry sheet is open. */
  inlineYear: string;
  error: string | null;
};

export type NewDesignFormEvent =
  | { type: "name-changed"; name: string }
  | { type: "taxonomy-opened" }
  | { type: "taxonomy-closed" }
  | { type: "category-chosen"; categoryId: string | null }
  | { type: "collection-chosen"; collectionId: string | null }
  | { type: "inline-opened"; kind: InlineCreationKind }
  | { type: "inline-fact"; fact: InlineCreationEvent }
  | { type: "inline-year-changed"; year: string }
  | { type: "design-creation-refused"; message: string };

export function createInitialNewDesignFormState(): NewDesignFormState {
  return {
    name: "",
    categoryId: null,
    collectionId: null,
    taxonomyOpen: false,
    inline: createInitialInlineCreationState(),
    inlineKind: null,
    inlineYear: "",
    error: null,
  };
}

/**
 * A name is the only field the create action needs; it is trimmed before the
 * records module sees it, so whitespace alone never enables Create.
 */
export function canCreateDesign(state: NewDesignFormState): boolean {
  return designNameProblem(state.name) === null;
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
 * The create form's decisions: the name draft, the one taxonomy sheet that
 * holds both optional selections, and the new-entry sheet stacked above it.
 * The slice owns the new-entry sheet's facts; this reducer only remembers which
 * list opened it and selects the id a completed create reports.
 */
export function newDesignFormReducer(
  state: NewDesignFormState,
  event: NewDesignFormEvent,
): NewDesignFormState {
  switch (event.type) {
    case "name-changed":
      return { ...state, name: event.name, error: null };
    case "taxonomy-opened":
      return { ...state, taxonomyOpen: true };
    case "taxonomy-closed":
      // The new-entry sheet sits above the taxonomy sheet, so it cannot outlive
      // it: closing the parent takes the draft and its extra field with it.
      return {
        ...state,
        taxonomyOpen: false,
        inline: createInitialInlineCreationState(),
        inlineKind: null,
        inlineYear: "",
      };
    case "category-chosen":
      return { ...state, categoryId: event.categoryId };
    case "collection-chosen":
      return { ...state, collectionId: event.collectionId };
    case "inline-opened":
      return {
        ...state,
        inline: inlineCreationReducer(state.inline, { type: "opened" }),
        inlineKind: event.kind,
        inlineYear: "",
      };
    case "inline-fact": {
      const inline = inlineCreationReducer(state.inline, event.fact);

      if (inline.open) return { ...state, inline };

      // The panel is closed: forget which picker it belonged to and its extra
      // field. A completed create also selects the id the slice reports; which
      // picker that id belongs to is this caller's, not the slice's.
      const selected =
        event.fact.type === "created" && state.inlineKind === "category"
          ? { categoryId: event.fact.id }
          : event.fact.type === "created" && state.inlineKind === "collection"
            ? { collectionId: event.fact.id }
            : {};

      return { ...state, ...selected, inline, inlineKind: null, inlineYear: "" };
    }
    case "inline-year-changed":
      return {
        ...state,
        inlineYear: event.year,
        // The year is this caller's field; clearing the slice's refusal is the
        // slice's rule, so no unhappened name-change fact is invented here.
        inline: clearInlineRefusal(state.inline),
      };
    case "design-creation-refused":
      return { ...state, error: event.message };
  }
}
