import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { recordEdit } from '@/features/history';
import {
  createInitialEditDesignState,
  editDesignReducer,
  stampedEvent,
  writeOutcome,
  type EditDesignEvent,
  type EditDesignGesture,
  type EditDesignState,
  type StoredOrNothingReport,
  type WriteReport,
} from './edit-design-reducer';
import {
  addMaterialUse,
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
function attemptWrite<Stored>(write: () => Stored | null, refusal: Refusal): WriteReport<Stored>;
/** A write with no refusal rule can only have stored a row or found none. */
function attemptWrite<Stored>(write: () => Stored | null): StoredOrNothingReport<Stored>;
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
 * synchronous, so an effect is performed inside `dispatch` and its outcome is
 * sent straight back — no pending-effect list and no second render. The reducer
 * decides what to write and when; this bridge only performs the call and
 * dispatches the event `writeOutcome` makes of its answer.
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
        switch (effect.type) {
          case 'add-material-use': {
            try {
              const materialUse = addMaterialUse(
                database,
                effect.designId,
                effect.input,
                effect.now
              );

              dispatch(
                materialUse
                  ? { type: 'material-use-added', materialUse }
                  : { type: 'nothing-stored', designId: effect.designId }
              );
            } catch (caught) {
              if (!(caught instanceof InvalidMaterialUseError)) throw caught;

              dispatch({ type: 'material-use-add-refused', message: caught.message });
            }
            break;
          }
          case 'write-drafts':
            dispatch(
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
            dispatch(
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
            dispatch(
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

  const send = useCallback(
    (gesture: EditDesignGesture) => dispatch(stampedEvent(gesture, Date.now())),
    [dispatch]
  );

  return [state, send];
}
