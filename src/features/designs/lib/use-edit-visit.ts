import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { recordEdit } from '@/features/history';
import {
  createInitialEditDesignState,
  editDesignReducer,
  writeOutcome,
  type EditDesignEvent,
  type EditDesignState,
  type WriteReport,
} from './edit-design-reducer';
import {
  InvalidDesignNameError,
  InvalidMaterialUseError,
  removeMaterialUse,
  updateDesign,
  updateMaterialUse,
} from './records';

/** The error a write's own rule throws; any other error is a bug, not an answer. */
type Refusal = abstract new (...args: never[]) => Error;

/**
 * Runs one write and reports what came back: the row it stored, its refusal,
 * or nothing because the row it targeted is gone.
 */
function attemptWrite<Stored>(write: () => Stored | null, refusal?: Refusal): WriteReport<Stored> {
  try {
    const value = write();

    return value === null ? { kind: 'nothing-stored' } : { kind: 'stored', value };
  } catch (caught) {
    if (refusal && caught instanceof refusal) return { kind: 'refused', message: caught.message };

    throw caught;
  }
}

/**
 * Runs Edit's reducer and the work it asks for. Every catalog call is
 * synchronous, so an effect is performed inside `send` and its outcome is sent
 * straight back — no pending-effect list and no second render. The reducer
 * decides what to write and when; this bridge only performs the call and
 * dispatches the event `writeOutcome` makes of its answer.
 */
export function useEditVisit(
  designId: string
): readonly [EditDesignState, (event: EditDesignEvent) => void] {
  const database = useDatabase();
  const [state, setState] = useState(() => createInitialEditDesignState(designId));
  const latest = useRef(state);

  const send = useCallback(
    function send(event: EditDesignEvent) {
      const result = editDesignReducer(latest.current, event);
      latest.current = result.state;
      setState(result.state);

      for (const effect of result.effects) {
        switch (effect.type) {
          case 'write-drafts':
            send(
              writeOutcome({
                ...effect,
                report: attemptWrite(
                  () => updateDesign(database, effect.designId, effect.patch, effect.now),
                  InvalidDesignNameError
                ),
              })
            );
            break;
          case 'write-material-use':
            send(
              writeOutcome({
                ...effect,
                report: attemptWrite(
                  () =>
                    updateMaterialUse(
                      database,
                      effect.designId,
                      effect.useId,
                      effect.patch,
                      effect.now
                    ),
                  InvalidMaterialUseError
                ),
              })
            );
            break;
          case 'remove-material-use':
            send(
              writeOutcome({
                ...effect,
                report: attemptWrite(() =>
                  removeMaterialUse(database, effect.designId, effect.useId, effect.now)
                ),
              })
            );
            break;
          case 'record-visit':
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
            break;
        }
      }
    },
    [database]
  );

  return [state, send];
}
