import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { recordEdit } from '@/features/history';
import {
  createInitialEditDesignState,
  editDesignReducer,
  stampedEvent,
  writeOutcome,
  type EditDesignEffect,
  type EditDesignEvent,
  type EditDesignGesture,
  type EditDesignState,
  type WriteReport,
} from './edit-design-reducer';
import {
  InvalidDesignNameError,
  InvalidMaterialUseError,
  writeDesign,
  type DesignChanges,
  type DesignWriteResult,
} from './records';

/** The errors a change can be refused for; any other error is a bug, not an answer. */
const REFUSALS = [InvalidDesignNameError, InvalidMaterialUseError] as const;

/**
 * Runs one write and reports what came back: the result it stored, its refusal,
 * or nothing because the Design row it targeted is gone.
 */
function attemptWrite(
  write: () => DesignWriteResult | null
): WriteReport<DesignWriteResult> {
  try {
    const value = write();

    return value === null ? { kind: 'nothing-stored' } : { kind: 'stored', value };
  } catch (caught) {
    if (REFUSALS.some((refusal) => caught instanceof refusal)) {
      return { kind: 'refused', message: (caught as Error).message };
    }

    throw caught;
  }
}

/** A write effect carries changes, not a choice of which record function to call. */
type WriteEffect = Exclude<EditDesignEffect, { type: 'record-visit' }>;

/** The change an effect declares, as data the one write path can apply. */
function changesOf(effect: WriteEffect): DesignChanges {
  switch (effect.type) {
    case 'add-material-use':
      return { uses: [{ kind: 'add', input: effect.input }] };
    case 'write-drafts':
      return { fields: effect.patch };
    case 'write-material-use':
      return { uses: [{ kind: 'correct', useId: effect.useId, patch: effect.patch }] };
    case 'remove-material-use':
      return { uses: [{ kind: 'remove', useId: effect.useId }] };
  }
}

/**
 * Runs Edit's reducer and the work it asks for. Every catalog call is
 * synchronous, so an effect is performed inside `dispatch` and its outcome is
 * sent straight back — no pending-effect list and no second render. The reducer
 * decides what changed and when; this bridge only hands those changes to the
 * one write path and dispatches the event `writeOutcome` makes of its answer.
 *
 * The visit owns the clock (`FRONTEND_STATE` 5): the screen sends gestures with
 * the time left out, and `send` is the one place that stamps it.
 */
export function useEditVisit(
  designId: string
): readonly [EditDesignState, (gesture: EditDesignGesture) => void] {
  const database = useDatabase();
  const [state, setState] = useState(() => createInitialEditDesignState(designId));
  const latest = useRef(state);

  const dispatch = useCallback(
    function dispatch(event: EditDesignEvent) {
      const result = editDesignReducer(latest.current, event);
      latest.current = result.state;
      setState(result.state);

      for (const effect of result.effects) {
        if (effect.type === 'record-visit') {
          recordEdit(
            database,
            effect.designId,
            {
              before: effect.before,
              after: effect.after,
              materialUses: effect.materialUses,
            },
            effect.now
          );
          continue;
        }

        const changes = changesOf(effect);

        if (changes) {
          dispatch(
            writeOutcome({
              ...effect,
              report: attemptWrite(() =>
                writeDesign(database, effect.designId, changes, effect.now)
              ),
            })
          );
        }
      }
    },
    [database]
  );

  const send = useCallback(
    (gesture: EditDesignGesture) => dispatch(stampedEvent(gesture, Date.now())),
    [dispatch]
  );

  return [state, send];
}
