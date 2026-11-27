import type { DesignStatus } from "@/features/database";
import type { DecisionFields, StatusChange } from "./status-writes";

/**
 * The why a rejection or a later decision records while its sheet is showing.
 * Both fields are optional; the rejection form starts them empty and the
 * decision sheet starts them prefilled from the latest decision. The write
 * path turns blank text into null.
 */
export type DecisionDraft = {
  reason: string;
  potentialImprovements: string;
};

/**
 * The status sheet while it is open: the Status the Design held when the sheet
 * opened — the row it checks — and, once Rejected is pressed, the why form
 * expanded in place.
 */
export type StatusSheetState = {
  /** The checked row, and the row a press writes nothing for. */
  current: DesignStatus;
  /** The why fields once Rejected is pressed; null while the rows are showing. */
  rejection: DecisionDraft | null;
};

/**
 * Detail's decisions: the status sheet and the decision sheet that can be open
 * over it, and the Design every write it declares names. The two sheets cannot
 * be reached together, but each keeps its own open state and draft. The section
 * tab stays the component's own presentation and is not here
 * (docs/FRONTEND_STATE.md).
 */
export type DesignDetailState = {
  /** The Design this surface acts on; every effect names it. */
  designId: string;
  /** The open status sheet, or null while it is closed. */
  statusSheet: StatusSheetState | null;
  /** The open decision sheet's draft, or null while it is closed. */
  decisionSheet: DecisionDraft | null;
};

export type DesignDetailEvent =
  | { type: "status-sheet-opened"; status: DesignStatus }
  | { type: "status-sheet-closed" }
  | { type: "status-row-pressed"; status: DesignStatus }
  | { type: "rejection-field-changed"; field: keyof DecisionDraft; value: string }
  | { type: "reject-pressed" }
  | { type: "decision-sheet-opened"; latest: DecisionFields | null }
  | { type: "decision-sheet-closed" }
  | { type: "decision-field-changed"; field: keyof DecisionDraft; value: string }
  | { type: "save-decision-pressed" };

/**
 * The work a sheet asks for. One status effect carries the whole choice, the
 * why included, so the runner calls the one write path with what the owner
 * chose rather than deciding which change kind it is. A later decision is its
 * own write: one `decision` Event with no Status diff.
 */
export type DesignDetailEffect =
  | { type: "change-status"; designId: string; change: StatusChange }
  | { type: "record-decision"; designId: string; decision: DecisionFields };

export type DesignDetailResult = {
  state: DesignDetailState;
  effects: DesignDetailEffect[];
};

/** A surface that has opened nothing yet. */
export function createInitialDesignDetailState(designId: string): DesignDetailState {
  return { designId, statusSheet: null, decisionSheet: null };
}

function only(state: DesignDetailState): DesignDetailResult {
  return { state, effects: [] };
}

/**
 * A decision sheet's Save has something to write when either field holds text
 * once trimmed. The control is disabled while both are blank, so the owner
 * cannot record an empty Event.
 */
export function canSaveDecision(draft: DecisionDraft): boolean {
  return draft.reason.trim() !== "" || draft.potentialImprovements.trim() !== "";
}

/**
 * The Detail surface's rules: opening and closing the status sheet, the row an
 * owner presses, the rejection form Rejected expands, and the later-decision
 * sheet the block's action opens. A non-rejected press that moves the Design
 * closes the sheet and declares one write; the checked row closes with no
 * write; Rejected expands its why form and writes nothing until
 * `reject-pressed`. The decision sheet opens prefilled from the latest
 * decision — empty when there is none — and its Save declares one write with no
 * Status move.
 */
export function designDetailReducer(
  state: DesignDetailState,
  event: DesignDetailEvent,
): DesignDetailResult {
  switch (event.type) {
    case "status-sheet-opened":
      return only({
        ...state,
        statusSheet: { current: event.status, rejection: null },
      });

    case "status-sheet-closed":
      // Every dismiss — the X, the scrim, a drag, Android's Back — drops the
      // form and writes nothing, even after Rejected expanded it.
      return only({ ...state, statusSheet: null });

    case "status-row-pressed": {
      const sheet = state.statusSheet;

      if (!sheet) return only(state);

      // The checked row is the Status the Design already has: the sheet closes
      // and the write path is not asked for a no-op.
      if (event.status === sheet.current) return only({ ...state, statusSheet: null });

      if (event.status === "rejected") {
        // Rejecting is the one row that asks why first. It expands an empty
        // form and writes nothing until Reject design is pressed.
        return only({
          ...state,
          statusSheet: {
            current: sheet.current,
            rejection: { reason: "", potentialImprovements: "" },
          },
        });
      }

      return {
        state: { ...state, statusSheet: null },
        effects: [
          {
            type: "change-status",
            designId: state.designId,
            change: { status: event.status },
          },
        ],
      };
    }

    case "rejection-field-changed": {
      const sheet = state.statusSheet;

      if (!sheet?.rejection) return only(state);

      return only({
        ...state,
        statusSheet: {
          ...sheet,
          rejection: { ...sheet.rejection, [event.field]: event.value },
        },
      });
    }

    case "reject-pressed": {
      const sheet = state.statusSheet;

      if (!sheet?.rejection) return only(state);

      return {
        state: { ...state, statusSheet: null },
        effects: [
          {
            type: "change-status",
            designId: state.designId,
            change: { status: "rejected", ...sheet.rejection },
          },
        ],
      };
    }

    case "decision-sheet-opened":
      // The latest decision is the prefill; a Design with none opens an empty
      // form, the same fields the rejection form expands.
      return only({
        ...state,
        decisionSheet: {
          reason: event.latest?.reason ?? "",
          potentialImprovements: event.latest?.potentialImprovements ?? "",
        },
      });

    case "decision-sheet-closed":
      // Every dismiss drops the draft and writes nothing.
      return only({ ...state, decisionSheet: null });

    case "decision-field-changed": {
      const draft = state.decisionSheet;

      if (!draft) return only(state);

      return only({
        ...state,
        decisionSheet: { ...draft, [event.field]: event.value },
      });
    }

    case "save-decision-pressed": {
      const draft = state.decisionSheet;

      if (!draft) return only(state);

      return {
        state: { ...state, decisionSheet: null },
        effects: [
          {
            type: "record-decision",
            designId: state.designId,
            decision: draft,
          },
        ],
      };
    }
  }
}
