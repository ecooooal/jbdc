import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { recordEdit } from '@/features/history';
import {
  createInitialEditDesignState,
  editDesignReducer,
  type EditDesignEvent,
  type EditDesignState,
} from './edit-design-reducer';
import {
  InvalidDesignNameError,
  InvalidMaterialUseError,
  removeMaterialUse,
  updateDesign,
  updateMaterialUse,
} from './records';

/**
 * Runs Edit's reducer and the work it asks for. Every catalog call is
 * synchronous, so an effect is performed inside `send` and its outcome is sent
 * straight back — no pending-effect list and no second render. The reducer
 * decides what to write and when; this bridge only performs the call.
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
          case 'write-drafts': {
            try {
              const saved = updateDesign(database, effect.designId, effect.patch, effect.now);

              if (saved) send({ type: 'drafts-written', design: saved, patch: effect.patch });
            } catch (caught) {
              // A name is the only field a write refuses, and it refuses before
              // storing anything, so the row keeps the name it already had.
              if (!(caught instanceof InvalidDesignNameError)) throw caught;

              send({ type: 'field-refused', field: 'name', message: caught.message });
            }
            break;
          }
          case 'write-material-use': {
            try {
              const saved = updateMaterialUse(
                database,
                effect.designId,
                effect.useId,
                effect.patch,
                effect.now
              );

              if (saved) send({ type: 'material-use-saved', materialUse: saved });
              else
                send({
                  type: 'material-use-refused',
                  useId: effect.useId,
                  message: 'This material use is not here.',
                });
            } catch (caught) {
              if (!(caught instanceof InvalidMaterialUseError)) throw caught;

              send({
                type: 'material-use-refused',
                useId: effect.useId,
                message: caught.message,
              });
            }
            break;
          }
          case 'remove-material-use': {
            const removed = removeMaterialUse(
              database,
              effect.designId,
              effect.useId,
              effect.now
            );

            if (removed) send({ type: 'material-use-removed', useId: removed.id });
            else
              send({
                type: 'material-use-refused',
                useId: effect.useId,
                message: 'This material use is not here.',
              });
            break;
          }
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
