import { useCallback } from "react";
import { useDatabase } from "@/features/database/react";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";
import {
  createInitialViewerState,
  removeImageOutcome,
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
 *
 * The Design is the viewer's own state, like the gallery's, so the perform body
 * names the Design each effect carries instead of closing over the hook's
 * argument.
 */
export function useImageViewer(designId: string): {
  state: ViewerState;
  send: (event: ViewerEvent) => void;
} {
  const database = useDatabase();
  const store = useImageStore();

  const perform = useCallback(
    async (effect: ViewerEffect, dispatch: (event: ViewerEvent) => void) => {
      if (effect.type === "reclassify-image") {
        await writeImages(database, null, effect.designId, {
          kind: "reclassify",
          imageId: effect.imageId,
          to: effect.to,
        });
        return;
      }

      const ending = await writeImages(database, store, effect.designId, {
        kind: "remove",
        imageId: effect.imageId,
      });

      for (const outcome of removeImageOutcome(effect.imageId, ending)) dispatch(outcome);
    },
    [database, store],
  );

  const [state, dispatch] = useReducerRunner(
    viewerReducer,
    () => createInitialViewerState(designId),
    perform,
  );

  return { state, send: dispatch };
}
