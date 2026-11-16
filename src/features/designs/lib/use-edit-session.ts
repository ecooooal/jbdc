import { useCallback, useRef, useState } from 'react';
import { useDatabase } from '@/features/database/react';
import { recordEdit } from '@/features/history';
import {
  createInitialEditDesignState,
  editDesignReducer,
  type EditDesignEvent,
  type EditDesignState,
} from './edit-design-reducer';
import { updateDesign } from './records';

/**
 * Runs Edit's reducer and the work it asks for. Every catalog call is
 * synchronous, so an effect is performed inside `send` and its outcome is sent
 * straight back — no pending-effect list and no second render. The reducer
 * decides what to write and when; this bridge only performs the call.
 */
export function useEditSession(
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
            const saved = updateDesign(database, effect.designId, effect.patch, effect.now);
            if (saved) send({ type: 'drafts-written', design: saved });
            break;
          }
          case 'record-session':
            recordEdit(database, effect.designId, effect.before, effect.after, effect.now);
            break;
        }
      }
    },
    [database]
  );

  return [state, send];
}
