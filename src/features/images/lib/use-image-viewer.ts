import { useCallback, useRef, useState } from "react";
import { useDatabase } from "@/features/database/react";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";
import {
  createInitialViewerState,
  viewerReducer,
  type ViewerEffect,
  type ViewerEvent,
  type ViewerState,
} from "./viewer-reducer";

/**
 * Runs the viewer's reducer and the writes it asks for. The database calls are
 * synchronous, so an effect is performed inside `send` and the live read is the
 * only answer the viewer needs: a stored reclassification re-runs the gallery
 * and moves the image to its new stage, and a removal drops it from the read.
 * A write that throws leaves the catalog as it was; the live read stays the
 * truth rather than the viewer inventing a second outcome.
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
    (event: ViewerEvent) => {
      const result = viewerReducer(latest.current, event);
      latest.current = result.state;
      setState(result.state);

      const perform = async (effect: ViewerEffect) => {
        try {
          if (effect.type === "reclassify-image") {
            await writeImages(database, null, designId, {
              kind: "reclassify",
              imageId: effect.imageId,
              to: effect.to,
            });
          } else if (store) {
            await writeImages(database, store, designId, {
              kind: "remove",
              imageId: effect.imageId,
            });
          }
        } catch {
          // Nothing was written, so the image stays where the live read has it.
        }
      };

      for (const effect of result.effects) void perform(effect);
    },
    [database, designId, store],
  );

  return { state, send };
}
