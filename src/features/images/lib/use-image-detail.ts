import { useCallback } from "react";
import { useDatabase } from "@/features/database/react";
import { useReducerRunner } from "@/shared/hooks/use-reducer-runner";
import { useImageStore } from "./image-store-context";
import { writeImages } from "./records";
import {
  createInitialImageDetailState,
  removeImageOutcome,
  imageDetailReducer,
  type ImageDetailEffect,
  type ImageDetailEvent,
  type ImageDetailState,
} from "./image-detail-reducer";

/**
 * Runs the image detail's reducer and the writes it asks for. The database
 * calls are synchronous, so an effect is performed inside `send`; the write
 * path answers once and never throws, so a removal's ending is folded like the
 * gallery's: a stored removal closes the image detail, and every other answer
 * keeps the image open and says it did not land. A reclassification's answer
 * needs no surface: the live read moves the image to the stage the write stored.
 *
 * The Design is the image detail's own state, like the gallery's, so the
 * perform body names the Design each effect carries instead of closing over the
 * hook's argument.
 */
export function useImageDetail(designId: string): {
  state: ImageDetailState;
  send: (event: ImageDetailEvent) => void;
} {
  const database = useDatabase();
  const store = useImageStore();

  const perform = useCallback(
    async (effect: ImageDetailEffect, dispatch: (event: ImageDetailEvent) => void) => {
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
    imageDetailReducer,
    () => createInitialImageDetailState(designId),
    perform,
  );

  return { state, send: dispatch };
}
