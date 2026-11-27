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
 * The one sheet open over Detail: the status sheet with the Status it checks
 * and, once Rejected is pressed, the why form expanded in place; or the later
 * decision sheet's draft. One field holds whichever is open, so the two sheets
 * cannot be represented together (docs/FRONTEND_STATE.md).
 */
export type DesignDetailPanel =
  ({ kind: "status" } & StatusSheetState) | { kind: "decision"; draft: DecisionDraft };

/**
 * Detail's decisions: the one sheet open over it and the Design every write it
 * declares names. The section tab stays the component's own presentation and
 * is not here (docs/FRONTEND_STATE.md).
 */
export type DesignDetailState = {
  /** The Design this surface acts on; every effect names it. */
  designId: string;
  /** The one sheet open over Detail, or null while both are closed. */
  panel: DesignDetailPanel | null;
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
  return { designId, panel: null };
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
        panel: { kind: "status", current: event.status, rejection: null },
      });

    case "status-sheet-closed":
      // Every dismiss — the X, the scrim, a drag, Android's Back — drops the
      // form and writes nothing, even after Rejected expanded it. Only the
      // status sheet's own close touches its panel.
      if (state.panel?.kind !== "status") return only(state);

      return only({ ...state, panel: null });

    case "status-row-pressed": {
      const panel = state.panel;

      if (panel?.kind !== "status") return only(state);

      // The checked row is the Status the Design already has: the sheet closes
      // and the write path is not asked for a no-op.
      if (event.status === panel.current) return only({ ...state, panel: null });

      if (event.status === "rejected") {
        // Rejecting is the one row that asks why first. It expands an empty
        // form and writes nothing until Reject design is pressed.
        return only({
          ...state,
          panel: {
            kind: "status",
            current: panel.current,
            rejection: { reason: "", potentialImprovements: "" },
          },
        });
      }

      return {
        state: { ...state, panel: null },
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
      const panel = state.panel;

      if (panel?.kind !== "status" || !panel.rejection) return only(state);

      return only({
        ...state,
        panel: {
          ...panel,
          rejection: { ...panel.rejection, [event.field]: event.value },
        },
      });
    }

    case "reject-pressed": {
      const panel = state.panel;

      if (panel?.kind !== "status" || !panel.rejection) return only(state);

      return {
        state: { ...state, panel: null },
        effects: [
          {
            type: "change-status",
            designId: state.designId,
            change: { status: "rejected", ...panel.rejection },
          },
        ],
      };
    }

    case "decision-sheet-opened":
      // The latest decision is the prefill; a Design with none opens an empty
      // form, the same fields the rejection form expands. Opening it replaces
      // whichever panel was open.
      return only({
        ...state,
        panel: {
          kind: "decision",
          draft: {
            reason: event.latest?.reason ?? "",
            potentialImprovements: event.latest?.potentialImprovements ?? "",
          },
        },
      });

    case "decision-sheet-closed":
      // Every dismiss drops the draft and writes nothing. Only the decision
      // sheet's own close touches its panel.
      if (state.panel?.kind !== "decision") return only(state);

      return only({ ...state, panel: null });

    case "decision-field-changed": {
      const panel = state.panel;

      if (panel?.kind !== "decision") return only(state);

      return only({
        ...state,
        panel: { ...panel, draft: { ...panel.draft, [event.field]: event.value } },
      });
    }

    case "save-decision-pressed": {
      const panel = state.panel;

      if (panel?.kind !== "decision") return only(state);

      return {
        state: { ...state, panel: null },
        effects: [
          {
            type: "record-decision",
            designId: state.designId,
            decision: panel.draft,
          },
        ],
      };
    }
  }
}
