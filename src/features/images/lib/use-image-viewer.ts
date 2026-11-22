import { useCallback, useRef, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";
import {
  createInitialViewerState,
  removalOutcome,
  viewerReducer,
  type ViewerEffect,
  type ViewerEvent,
  type ViewerState,
} from "./viewer-reducer";

/**
 * Runs the viewer's reducer and the writes it asks for. The database calls are
 * synchronous, so an effect is performed inside `send`; the write path answers
 * once and never throws, so a removal's ending is folded like the gallery's: a
 * stored removal closes the viewer, and every other answer keeps the image open
 * and says it did not land. A reclassification's answer needs no surface: the
 * live read moves the image to the stage the write stored.
 */
export function useImageViewer(designId: string): {
  state: ViewerState;
  send: (event: ViewerEvent) => void;
} {
  const database = useDatabase();
  const store = useImageStore();
  const [state, setState] = useState(createInitialViewerState);
  const latest = useRef(state);

  const send = useCallback(
    function send(event: ViewerEvent) {
      const result = viewerReducer(latest.current, event);
      latest.current = result.state;
      setState(result.state);

      const perform = async (effect: ViewerEffect) => {
        if (effect.type === "reclassify-image") {
          await writeImages(database, null, designId, {
            kind: "reclassify",
            imageId: effect.imageId,
            to: effect.to,
          });
          return;
        }

        const ending = await writeImages(database, store, designId, {
          kind: "remove",
          imageId: effect.imageId,
        });

        for (const outcome of removalOutcome(effect.imageId, ending)) send(outcome);
      };

      for (const effect of result.effects) void perform(effect);
    },
    [database, designId, store],
  );

  return { state, send };
}
