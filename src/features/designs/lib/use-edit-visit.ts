import { useCallback } from "react";
import { useDatabase } from "@/features/database/react";
import { recordEdit } from "@/features/history";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import {
  createInitialEditDesignState,
  editDesignReducer,
  stampedEvent,
  writeOutcome,
  type EditDesignEffect,
  type EditDesignEvent,
  type EditDesignGesture,
  type EditDesignState,
} from "./edit-design-reducer";
import { writeDesign } from "./records";

/**
 * Runs Edit's reducer and the work it asks for. Every catalog call is
 * synchronous, so an effect is performed inside `send` and its outcomes are
 * sent straight back — no pending-effect list and no second render. The reducer
 * decides what changed and when; this bridge only hands those changes to the
 * one write path and dispatches the events `writeOutcome` makes of its answer.
 *
 * The visit owns the clock (`FRONTEND_STATE` 5): the screen sends gestures with
 * the time left out, and `send` is the one place that stamps it.
 */
export function useEditVisit(
  designId: string,
): readonly [EditDesignState, (gesture: EditDesignGesture) => void] {
  const database = useDatabase();

  const perform = useCallback(
    (effect: EditDesignEffect, dispatch: (event: EditDesignEvent) => void) => {
      if (effect.type === "record-visit") {
        recordEdit(
          database,
          effect.designId,
          {
            before: effect.before,
            after: effect.after,
            materialUses: effect.materialUses,
          },
          effect.now,
        );
        return;
      }

      // One write per effect, whatever the owner changed; the write answers
      // once, and each declared change gets its own outcome event.
      const written = writeDesign(database, effect.designId, effect.changes, effect.now);

      for (const outcome of writeOutcome({ ...effect, result: written })) {
        dispatch(outcome);
      }
    },
    [database],
  );

  const [state, dispatch] = useReducerRunner(
    editDesignReducer,
    () => createInitialEditDesignState(designId),
    perform,
  );

  const send = useCallback(
    (gesture: EditDesignGesture) => dispatch(stampedEvent(gesture, Date.now())),
    [dispatch],
  );

  return [state, send];
}
