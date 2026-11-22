import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDatabase, useLiveRead } from "@/features/database/react";
import {
  attachAttempt,
  createInitialGalleryState,
  galleryReducer,
  galleryView,
  imageNoteBlockView,
  noteAttempt,
  writeOutcome,
  type GalleryEffect,
  type GalleryEvent,
  type GalleryFact,
  type GalleryStage,
  type GalleryWriteEnding,
} from "./gallery-reducer";
import { imageNotesOf } from "./image-notes";
import { useImagePicker } from "./image-picker-context";
import type { ImagePickResult } from "./image-picker";
import { coverOf, imageStages } from "./images";
import { useImageStore } from "./image-store-context";
import { designImagesRead, writeImages } from "./records";

/** The one event a component's fact becomes: a gesture carries the live journey. */
function eventOf(fact: GalleryFact, stages: readonly GalleryStage[]): GalleryEvent {
  switch (fact.type) {
    case "stage-pressed":
    case "image-pressed":
    case "hero-swiped":
      return { ...fact, stages };
    default:
      return fact;
  }
}

/**
 * The Detail gallery: the Design's images and their notes live read feeding
 * the gallery reducer. The read declares the tables it watches, so an attach,
 * remove, reclassify, or note write re-runs it, and the reducer keeps the
 * selection or falls back to the Cover. Components reach the reducer through
 * one door — `send` — which carries the journey a gesture happened against,
 * because a pure reducer cannot read the catalog.
 *
 * The runner runs the reducer, performs each write it declares, and dispatches
 * the events that answer owes. The plus press declares one pick-and-attach, so
 * the runner opens the picker and attaches what it picked to the declared
 * stage. A pick or a write that throws is one ending like any other: the fold
 * says what it means, so this bridge carries no policy of its own. The notes'
 * writes need no Image store; they copy and release nothing.
 */
export function useGallery(designId: string) {
  const database = useDatabase();
  const store = useImageStore();
  const picker = useImagePicker();
  const declaration = useMemo(() => designImagesRead(designId), [designId]);
  const { data, error, status } = useLiveRead(declaration);
  const stages = useMemo(() => imageStages(data.images), [data.images]);
  const cover = useMemo(() => coverOf(data.images)?.id ?? null, [data.images]);
  const [state, setState] = useState(() => createInitialGalleryState(designId));
  const latest = useRef(state);

  const dispatch = useCallback(
    function dispatch(event: GalleryEvent) {
      const result = galleryReducer(latest.current, event);

      latest.current = result.state;
      setState(result.state);

      const perform = async (effect: GalleryEffect) => {
        if (effect.type === "attach-images") {
          // No store or no picker means nothing can be picked or copied. That
          // is an invariant about the providers above this surface, not an
          // ending the owner sees, so it says nothing on the rail.
          if (!store || !picker) return;

          let ending: ImagePickResult | GalleryWriteEnding;

          try {
            const picked = await picker.pick();

            if (picked.kind === "picked") {
              ending = await writeImages(database, store, effect.designId, {
                kind: "attach",
                images: picked.sourcePaths.map((sourcePath) => ({ sourcePath, kind: effect.kind })),
              });
            } else {
              ending = picked;
            }
          } catch {
            // A pick or a copy that throws is the gesture's ending too, never
            // an unhandled rejection behind the plus card.
            ending = { kind: "thrown" };
          }

          const attempt = attachAttempt(ending);

          if (attempt) for (const outcome of writeOutcome(attempt)) dispatch(outcome);

          return;
        }

        let ending: GalleryWriteEnding;
        try {
          ending = await writeImages(database, null, effect.designId, effect.change);
        } catch {
          // A throw is the write's ending too: it still folds, so a failed
          // note leaves the composer open exactly as a refusal does.
          ending = { kind: "thrown" };
        }

        const attempt = noteAttempt(effect.change, ending);

        if (!attempt) return;

        for (const outcome of writeOutcome(attempt)) dispatch(outcome);
      };

      for (const effect of result.effects) void perform(effect);
    },
    [database, picker, store],
  );

  useEffect(() => {
    dispatch({ type: "images-read", stages, cover });
  }, [dispatch, stages, cover]);

  // The note block shows the current image's commentary; the rows stay in the
  // live read, so a write re-runs this without copying them into the reducer.
  const noteView = useMemo(
    () => imageNoteBlockView(imageNotesOf(data.imageNotes, state.imageId), state),
    [data.imageNotes, state],
  );

  const send = useCallback(
    (fact: GalleryFact) => dispatch(eventOf(fact, stages)),
    [dispatch, stages],
  );

  return {
    state,
    stages,
    images: data.images,
    imageNotes: data.imageNotes,
    view: galleryView(stages, state),
    noteView,
    send,
    error,
    status,
  };
}
