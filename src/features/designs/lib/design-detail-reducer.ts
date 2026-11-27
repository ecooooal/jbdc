import type { DesignStatus } from "@/features/database";
import type { StatusChange } from "./status-writes";

/**
 * The why a rejection records while its form is showing. Both fields are
 * optional and start empty; the write path turns blank text into null.
 */
export type RejectionDraft = {
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
  rejection: RejectionDraft | null;
};

/**
 * Detail's decisions: the one status sheet that can be open over it, and the
 * Design every write it declares names. The section tab stays the component's
 * own presentation and is not here (docs/FRONTEND_STATE.md).
 */
export type DesignDetailState = {
  /** The Design this surface acts on; every effect names it. */
  designId: string;
  /** The open status sheet, or null while it is closed. */
  statusSheet: StatusSheetState | null;
};

export type DesignDetailEvent =
  | { type: "status-sheet-opened"; status: DesignStatus }
  | { type: "status-sheet-closed" }
  | { type: "status-row-pressed"; status: DesignStatus }
  | { type: "rejection-field-changed"; field: keyof RejectionDraft; value: string }
  | { type: "reject-pressed" };

/**
 * The work the status sheet asks for. One effect carries the whole choice, the
 * why included, so the runner calls the one write path with what the owner
 * chose rather than deciding which change kind it is.
 */
export type DesignDetailEffect = {
  type: "change-status";
  designId: string;
  change: StatusChange;
};

export type DesignDetailResult = {
  state: DesignDetailState;
  effects: DesignDetailEffect[];
};

/** A surface that has opened nothing yet. */
export function createInitialDesignDetailState(designId: string): DesignDetailState {
  return { designId, statusSheet: null };
}

function only(state: DesignDetailState): DesignDetailResult {
  return { state, effects: [] };
}

/**
 * The Detail surface's rules: opening and closing the status sheet, the row
 * an owner presses, and the rejection form Rejected expands. A non-rejected
 * press that moves the Design closes the sheet and declares one write; the
 * checked row closes with no write; Rejected expands its why form and writes
 * nothing until `reject-pressed`.
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
  }
}
